import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const MAX_EMAILS_PER_LEAD = 3;
const COOLDOWN_HOURS = 24;

const TRIGGER_LABELS = {
  repeat_course_visit: "Repeated course interest",
  re_engaged_after_gap: "Re-engaged after absence",
  lead_went_hot: "Lead score reached Hot",
  cart_abandoned: "Cart abandoned without payment",
};

/**
 * POST /api/admin/test-email-trigger
 * Simulates the full autonomous email flow for a given lead + trigger.
 * Returns every decision point so you can debug exactly where it stopped.
 *
 * Body: { password, lead_id, trigger_event, force_send }
 *   force_send: true — skips guardrails (cooldown/cap) for testing
 */
export async function POST(request) {
  try {
    const { password, lead_id, trigger_event = "repeat_course_visit", force_send = false } =
      await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    }

    const trace = [];

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found", trace }, { status: 404 });
    }
    trace.push({ step: "lead_fetched", name: lead.name, email: lead.email, score: lead.lead_score, temperature: lead.lead_temperature });

    // 2. Anonymous check
    const isAnonymous =
      lead.name === "Anonymous" ||
      lead.email === "pending@unknown" ||
      !lead.email.includes("@") ||
      lead.email.endsWith("@unknown");

    trace.push({ step: "anonymous_check", is_anonymous: isAnonymous });
    if (isAnonymous && !force_send) {
      return NextResponse.json({ blocked: "anonymous_lead", trace });
    }

    // 3. Guardrails
    const { data: emailHistory } = await supabaseAdmin
      .from("email_logs")
      .select("id, sent_at, trigger_event")
      .eq("lead_id", lead_id)
      .order("sent_at", { ascending: false });

    const emailCount = emailHistory?.length || 0;
    const lastEmail = emailHistory?.[0];
    const hoursSinceLast = lastEmail
      ? (Date.now() - new Date(lastEmail.sent_at).getTime()) / (1000 * 60 * 60)
      : null;

    trace.push({
      step: "guardrails",
      emails_sent_total: emailCount,
      max_allowed: MAX_EMAILS_PER_LEAD,
      hours_since_last_email: hoursSinceLast ? Math.round(hoursSinceLast * 10) / 10 : "none sent yet",
      cooldown_hours: COOLDOWN_HOURS,
      would_block: !force_send && (emailCount >= MAX_EMAILS_PER_LEAD || (hoursSinceLast !== null && hoursSinceLast < COOLDOWN_HOURS)),
    });

    if (!force_send) {
      if (emailCount >= MAX_EMAILS_PER_LEAD) {
        return NextResponse.json({ blocked: "max_emails_reached", trace });
      }
      if (hoursSinceLast !== null && hoursSinceLast < COOLDOWN_HOURS) {
        return NextResponse.json({ blocked: "cooldown_active", hours_remaining: Math.round((COOLDOWN_HOURS - hoursSinceLast) * 10) / 10, trace });
      }
    }

    // 4. Fetch behavioral context
    const [{ data: visits }, { data: milestones }] = await Promise.all([
      supabaseAdmin
        .from("page_visits")
        .select("page_url, page_title, visited_at")
        .eq("lead_id", lead_id)
        .order("visited_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("lead_milestones")
        .select("milestone_label, points, achieved_at")
        .eq("lead_id", lead_id)
        .order("achieved_at", { ascending: false }),
    ]);

    const coursesViewed = [
      ...new Set(
        (visits || [])
          .map((v) => {
            try {
              const path = new URL(v.page_url).pathname;
              const match = path.match(/\/courses\/([^/]+)/);
              return match ? match[1].replace(/-/g, " ") : null;
            } catch { return null; }
          })
          .filter(Boolean)
      ),
    ];

    trace.push({
      step: "behavior_signals",
      total_visits: visits?.length || 0,
      courses_viewed: coursesViewed,
      milestones_count: milestones?.length || 0,
      milestones: (milestones || []).map((m) => m.milestone_label),
    });

    const courseContext = lead.course_interest;
    const courseLabel = courseContext ? courseContext.replace(/-/g, " ") : "our courses";

    // 5. Build prompt
    const prompt = `You are an autonomous email agent for a training course company. Based on the visitor's behavior, decide if a personalized email should be sent, and if so, write it.

TRIGGER: ${TRIGGER_LABELS[trigger_event] || trigger_event}
LEAD: ${lead.name} (${lead.email})
COURSE INTEREST: ${courseLabel}
LEAD SCORE: ${lead.lead_score || 0} (${lead.lead_temperature || "Cold"})
TOTAL VISITS: ${visits?.length || 0}
COURSES EXPLORED: ${coursesViewed.length > 0 ? coursesViewed.join(", ") : "none specifically"}
MILESTONES ACHIEVED: ${(milestones || []).map((m) => m.milestone_label).join(", ") || "none yet"}
EMAILS SENT SO FAR: ${emailCount} of ${MAX_EMAILS_PER_LEAD} max

Decision criteria:
- Send if the trigger represents genuine buying intent worth nurturing
- Do NOT send if the lead has very low engagement or the trigger is too weak
- The email must feel personal and relevant to what the lead was doing
- Keep subject lines short and curiosity-driven (under 60 chars)
- Keep the body to 3-4 short paragraphs, plain text, no markdown
- Address the lead by their first name
- Include a concrete next step (link to course page, offer, etc.)
- Do not mention cookies, tracking, or any data collection
- Tone: warm, helpful, not pushy

Respond ONLY in this exact JSON format, no markdown, no extra text:
{
  "send": true or false,
  "reasoning": "one sentence why you chose to send or not",
  "subject": "email subject line",
  "body": "full plain text email body"
}`;

    // 6. Call AI
    trace.push({ step: "calling_ai", model: "deepseek/deepseek-chat" });

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 700,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errBody = await aiResponse.json().catch(() => ({}));
      trace.push({ step: "ai_error", status: aiResponse.status, error: errBody });
      return NextResponse.json({ blocked: "ai_api_error", trace });
    }

    const aiData = await aiResponse.json();
    const aiRaw = aiData.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const cleaned = aiRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      trace.push({ step: "ai_parse_error", raw: aiRaw });
      return NextResponse.json({ blocked: "ai_parse_error", raw_response: aiRaw, trace });
    }

    trace.push({
      step: "ai_decision",
      send: parsed.send,
      reasoning: parsed.reasoning,
      subject: parsed.subject,
      body_preview: parsed.body?.slice(0, 120) + "...",
    });

    if (!parsed.send) {
      return NextResponse.json({ blocked: "ai_decided_not_to_send", ai_reasoning: parsed.reasoning, trace });
    }

    // 7. Send via Resend
    trace.push({ step: "sending_email", to: lead.email, subject: parsed.subject });

    let sendResult;
    try {
      sendResult = await sendEmail({ to: lead.email, subject: parsed.subject, text: parsed.body });
    } catch (sendErr) {
      trace.push({ step: "resend_error", error: sendErr.message });
      return NextResponse.json({ blocked: "resend_error", error: sendErr.message, trace });
    }

    // 8. Log
    await supabaseAdmin.from("email_logs").insert({
      lead_id,
      trigger_event,
      subject: parsed.subject,
      body: parsed.body,
      ai_reasoning: parsed.reasoning,
    });

    trace.push({ step: "logged_to_email_logs" });

    return NextResponse.json({
      success: true,
      email_sent_to: lead.email,
      subject: parsed.subject,
      ai_reasoning: parsed.reasoning,
      resend_id: sendResult?.id,
      trace,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
