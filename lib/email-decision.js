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

async function logOutcome(leadId, triggerEvent, status, { subject, body, ai_reasoning, error_message } = {}) {
  try {
    await supabaseAdmin.from("email_logs").insert({
      lead_id: leadId,
      trigger_event: triggerEvent,
      status,
      subject: subject || null,
      body: body || null,
      ai_reasoning: ai_reasoning || null,
      error_message: error_message || null,
    });
  } catch (err) {
    console.error("email_logs insert failed:", err.message);
  }
}

/**
 * Autonomous AI email decision.
 * Logs every outcome to email_logs with a status so failures are visible in the admin.
 *
 * Status values logged:
 *   sent            — email delivered via Resend
 *   failed          — Resend returned an error
 *   skipped         — AI decided not to send
 *   blocked_cap     — lead hit the 3-email hard cap
 *   blocked_cooldown — last email was less than 24hrs ago
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

    // 2. Check global and per-rule toggles from email_settings
    const { data: emailSettings } = await supabaseAdmin
      .from("email_settings")
      .select("*")
      .eq("id", 1)
      .single();

    // Global off → skip silently (intentional pause, no need to log)
    if (emailSettings && emailSettings.global_enabled === false) return;

    // Rule off → log so admin can see it was evaluated but suppressed
    const ruleKey = `rule_${triggerEvent}`;
    if (emailSettings && emailSettings[ruleKey] === false) {
      await logOutcome(leadId, triggerEvent, "skipped", {
        ai_reasoning: `Rule disabled in Email Rules settings`,
      });
      return;
    }

    // 3. Skip anonymous leads silently (no log — no real email to send to)
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
      .select("id, sent_at, status")
      .eq("lead_id", leadId)
      .order("sent_at", { ascending: false });

    const sentCount = (emailHistory || []).filter((e) => e.status === "sent").length;

    // Hard cap: max 3 sent emails ever
    if (sentCount >= MAX_EMAILS_PER_LEAD) {
      await logOutcome(leadId, triggerEvent, "blocked_cap", {
        ai_reasoning: `Lead has already received ${sentCount} emails (cap is ${MAX_EMAILS_PER_LEAD})`,
      });
      return;
    }

    // Cooldown: no email in the last 24 hours
    // cart_abandoned bypasses cooldown — high-intent signal that must always get through
    const bypassCooldown = triggerEvent === "cart_abandoned";
    const lastSent = (emailHistory || []).find((e) => e.status === "sent");
    if (!bypassCooldown && lastSent) {
      const hoursSinceLast =
        (Date.now() - new Date(lastSent.sent_at).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < COOLDOWN_HOURS) {
        await logOutcome(leadId, triggerEvent, "blocked_cooldown", {
          ai_reasoning: `Last email was ${Math.round(hoursSinceLast * 10) / 10}h ago — cooldown is ${COOLDOWN_HOURS}h`,
        });
        return;
      }
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

    // Per-trigger sending rules
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
EMAILS SENT SO FAR: ${sentCount} of ${MAX_EMAILS_PER_LEAD} max
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
      await logOutcome(leadId, triggerEvent, "failed", {
        error_message: `AI API error: ${aiResponse.status}`,
      });
      return;
    }

    const aiData = await aiResponse.json();
    const aiRaw = aiData.choices?.[0]?.message?.content || "{}";

    let parsed;
    try {
      const cleaned = aiRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      await logOutcome(leadId, triggerEvent, "failed", {
        error_message: `AI response parse error: ${aiRaw.slice(0, 200)}`,
      });
      return;
    }

    // 7. AI decided not to send
    if (!parsed.send) {
      await logOutcome(leadId, triggerEvent, "skipped", {
        ai_reasoning: parsed.reasoning,
      });
      return;
    }

    // 8. Send via Resend
    try {
      await sendEmail({
        to: lead.email,
        subject: parsed.subject,
        text: parsed.body,
      });
    } catch (sendErr) {
      await logOutcome(leadId, triggerEvent, "failed", {
        subject: parsed.subject,
        body: parsed.body,
        ai_reasoning: parsed.reasoning,
        error_message: sendErr.message,
      });
      return;
    }

    // 9. Log success
    await logOutcome(leadId, triggerEvent, "sent", {
      subject: parsed.subject,
      body: parsed.body,
      ai_reasoning: parsed.reasoning,
    });

    console.log(`Autonomous email sent to ${lead.email} (trigger: ${triggerEvent})`);
  } catch (err) {
    console.error("triggerEmailDecision error:", err.message);
  }
}
