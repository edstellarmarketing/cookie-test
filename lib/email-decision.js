import { supabaseAdmin } from "@/lib/supabase-server";
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
 * Autonomous AI email decision.
 * Evaluates whether to send an email based on behavioral trigger,
 * generates personalised content via AI, sends via Resend, and logs the action.
 *
 * Guardrails enforced before calling AI:
 *  - Lead must have a real email (not anonymous)
 *  - Max 3 emails per lead total
 *  - 24-hour cooldown between emails
 *
 * @param {string} leadId - UUID of the lead
 * @param {string} triggerEvent - One of: repeat_course_visit, re_engaged_after_gap, lead_went_hot, cart_abandoned
 * @param {object} extraContext - Additional metadata from the triggering event
 */
export async function triggerEmailDecision(leadId, triggerEvent, extraContext = {}) {
  try {
    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) return;

    // 2. Skip anonymous leads
    if (
      lead.name === "Anonymous" ||
      lead.email === "pending@unknown" ||
      !lead.email.includes("@") ||
      lead.email.endsWith("@unknown")
    ) {
      return;
    }

    // 3. Check email history for guardrails
    const { data: emailHistory } = await supabaseAdmin
      .from("email_logs")
      .select("id, sent_at")
      .eq("lead_id", leadId)
      .order("sent_at", { ascending: false });

    // Hard cap: max 3 emails ever
    if (emailHistory && emailHistory.length >= MAX_EMAILS_PER_LEAD) return;

    // Cooldown: no email in the last 24 hours
    const lastEmail = emailHistory?.[0];
    if (lastEmail) {
      const hoursSinceLast =
        (Date.now() - new Date(lastEmail.sent_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < COOLDOWN_HOURS) return;
    }

    // 4. Fetch behavioral context
    const [{ data: visits }, { data: milestones }] = await Promise.all([
      supabaseAdmin
        .from("page_visits")
        .select("page_url, page_title, visited_at")
        .eq("lead_id", leadId)
        .order("visited_at", { ascending: false })
        .limit(15),
      supabaseAdmin
        .from("lead_milestones")
        .select("milestone_label, points, achieved_at")
        .eq("lead_id", leadId)
        .order("achieved_at", { ascending: false }),
    ]);

    const totalVisits = visits?.length || 0;
    const coursesViewed = [
      ...new Set(
        (visits || [])
          .map((v) => {
            try {
              const path = new URL(v.page_url).pathname;
              const match = path.match(/\/courses\/([^/]+)/);
              return match ? match[1].replace(/-/g, " ") : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean)
      ),
    ];

    const courseContext =
      extraContext.milestone?.metadata?.course_slug ||
      extraContext.course_slug ||
      lead.course_interest;

    const courseLabel = courseContext ? courseContext.replace(/-/g, " ") : "our courses";

    // Per-trigger sending rules — some triggers always send, others need AI judgement
    const alwaysSend = ["repeat_course_visit", "cart_abandoned"].includes(triggerEvent);

    // 5. Build AI prompt
    const prompt = `You are an autonomous email agent for a training course company. Write a personalized email for this lead based on their behavior.

TRIGGER: ${TRIGGER_LABELS[triggerEvent] || triggerEvent}
LEAD: ${lead.name} (${lead.email})
COURSE INTEREST: ${courseLabel}
LEAD SCORE: ${lead.lead_score || 0} (${lead.lead_temperature || "Cold"})
TOTAL VISITS: ${totalVisits}
COURSES EXPLORED: ${coursesViewed.length > 0 ? coursesViewed.join(", ") : "none specifically"}
MILESTONES ACHIEVED: ${(milestones || []).map((m) => m.milestone_label).join(", ") || "none yet"}
EMAILS SENT SO FAR: ${emailHistory?.length || 0} of ${MAX_EMAILS_PER_LEAD} max
${alwaysSend ? "\nINSTRUCTION: This trigger is a confirmed buying signal — you MUST set send to true." : ""}

Rules:
- send must be true unless the lead email looks fake or there is truly zero engagement
- The email must feel personal and relevant to what the lead was doing
- Keep subject lines short and curiosity-driven (under 60 chars)
- Keep the body to 3-4 short paragraphs, plain text, no markdown
- Address the lead by their first name
- Include a concrete next step (e.g. a link or offer)
- Do not mention cookies, tracking, or data collection
- Tone: warm, helpful, not pushy

Respond ONLY in this exact JSON format, no markdown, no extra text:
{
  "send": true or false,
  "reasoning": "one sentence why you chose to send or not",
  "subject": "email subject line",
  "body": "full plain text email body"
}`;

    // 6. Call AI
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
      console.error("Email AI error:", aiResponse.status);
      return;
    }

    const aiData = await aiResponse.json();
    const aiRaw = aiData.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const cleaned = aiRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Email AI parse error:", aiRaw);
      return;
    }

    if (!parsed.send) {
      console.log(`Email decision for lead ${leadId} (${triggerEvent}): not sending — ${parsed.reasoning}`);
      return;
    }

    // 7. Send via Resend
    await sendEmail({
      to: lead.email,
      subject: parsed.subject,
      text: parsed.body,
    });

    // 8. Log to email_logs
    await supabaseAdmin.from("email_logs").insert({
      lead_id: leadId,
      trigger_event: triggerEvent,
      subject: parsed.subject,
      body: parsed.body,
      ai_reasoning: parsed.reasoning,
    });

    console.log(`Autonomous email sent to ${lead.email} (trigger: ${triggerEvent})`);
  } catch (err) {
    // Never crash the calling request — this runs fire-and-forget
    console.error("triggerEmailDecision error:", err.message);
  }
}
