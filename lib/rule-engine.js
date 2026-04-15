import { supabaseAdmin } from "@/lib/supabase-server";
import { triggerEmailDecision } from "@/lib/email-decision";

/**
 * Evaluate all enabled email rules against a lead's behavior.
 * Called after every page visit and cart event.
 */
export async function evaluateRulesForLead(leadId) {
  try {
    // 1. Fetch lead
    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (!lead) return;

    // 2. Fetch all enabled rules
    const { data: rules } = await supabaseAdmin
      .from("email_rules")
      .select("*")
      .eq("is_enabled", true);

    if (!rules?.length) return;

    // 3. Fetch lead's full page visit history (used by all rules)
    const { data: visits } = await supabaseAdmin
      .from("page_visits")
      .select("page_url, visited_at")
      .eq("lead_id", leadId)
      .order("visited_at", { ascending: false })
      .limit(500);

    // 4. Evaluate each rule
    for (const rule of rules) {
      await evaluateRule(rule, lead, visits || []);
    }
  } catch (err) {
    console.error("evaluateRulesForLead error:", err.message);
  }
}

async function evaluateRule(rule, lead, visits) {
  // --- User type check ---
  const isAnonymous =
    lead.name === "Anonymous" ||
    !lead.email ||
    lead.email.endsWith("@unknown") ||
    lead.email === "pending@unknown";

  if (rule.user_type === "existing" && isAnonymous) return;
  if (rule.user_type === "new" && !isAnonymous) return;

  // --- Normalize conditions (handle old flat-column format) ---
  const conditions =
    Array.isArray(rule.conditions) && rule.conditions.length > 0
      ? rule.conditions
      : [
          {
            action: "visits",
            page_mode: "url",
            page_value: rule.page_match_value || "",
            page_match_type: rule.page_match_type || "contains",
          },
        ];

  // --- Evaluate conditions ---
  const operator = rule.condition_operator || "AND";
  const results = conditions.map((c) => matchCondition(c, visits));
  const matched =
    operator === "OR" ? results.some(Boolean) : results.every(Boolean);

  if (!matched) return;

  // --- Check frequency limits ---
  const canFire = await checkFrequency(rule, lead.id);
  if (!canFire) return;

  // --- Log rule match immediately (visible in admin before email completes) ---
  await supabaseAdmin.from("email_logs").insert({
    lead_id: lead.id,
    trigger_event: `rule:${rule.id}`,
    status: "rule_matched",
    rule_id: rule.id,
    rule_name: rule.name,
    ai_reasoning: `Rule "${rule.name}" conditions matched — generating email`,
  });

  // --- Trigger email decision (logs its own outcome) ---
  await triggerEmailDecision(lead.id, `rule:${rule.id}`, {
    rule_id: rule.id,
    rule_name: rule.name,
  });
}

function matchCondition(condition, visits) {
  const action = condition.action || "visits";
  const pageValue = (condition.page_value || "").trim();
  const matchType = condition.page_match_type || "contains";

  // No page filter → match based solely on whether any visits exist
  if (!pageValue) {
    return action === "visits" ? visits.length > 0 : visits.length === 0;
  }

  const urlMatches = (url) =>
    matchType === "exact" ? url === pageValue : url.includes(pageValue);

  const hasVisit = visits.some((v) => urlMatches(v.page_url));

  return action === "visits" ? hasVisit : !hasVisit;
}

async function checkFrequency(rule, leadId) {
  const frequency = rule.trigger_frequency || "once_ever";
  const limit = rule.trigger_limit || 1;
  const triggerKey = `rule:${rule.id}`;

  // Only "sent" emails count against the frequency limit
  const { data: priorSent } = await supabaseAdmin
    .from("email_logs")
    .select("sent_at")
    .eq("lead_id", leadId)
    .eq("trigger_event", triggerKey)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });

  const totalSent = priorSent?.length || 0;

  if (frequency === "every_time") return true;
  if (frequency === "once_ever") return totalSent === 0;

  // Session = same UTC calendar day
  const todayUTC = new Date().toISOString().slice(0, 10);
  const sentToday = (priorSent || []).filter(
    (l) => (l.sent_at || "").slice(0, 10) === todayUTC
  ).length;

  if (frequency === "once_per_session") return sentToday === 0;
  if (frequency === "x_per_session") return sentToday < limit;
  if (frequency === "x_total") return totalSent < limit;

  return true;
}
