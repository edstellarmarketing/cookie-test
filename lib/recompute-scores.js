import { getTemperature } from "./milestones";
import { triggerEmailDecision } from "./email-decision";

/**
 * Recompute and persist a lead's score from their milestones.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase - Admin client
 * @param {string} leadId - UUID of the lead
 */
export async function recomputeLeadScore(supabase, leadId) {
  const { data: milestones, error } = await supabase
    .from("lead_milestones")
    .select("points")
    .eq("lead_id", leadId);

  if (error) {
    console.error("Failed to fetch milestones for score recomputation:", error.message);
    return;
  }

  const totalScore = (milestones || []).reduce((sum, m) => sum + m.points, 0);
  const temperature = getTemperature(totalScore);

  // Fetch current temperature before updating to detect Hot transition
  const { data: currentLead } = await supabase
    .from("leads")
    .select("lead_temperature")
    .eq("id", leadId)
    .single();

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      lead_score: totalScore,
      lead_temperature: temperature,
      score_updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("Failed to update lead score:", updateError.message);
    return;
  }

  // Fire autonomous email when lead transitions to Hot for the first time
  if (temperature === "Hot" && currentLead?.lead_temperature !== "Hot") {
    triggerEmailDecision(leadId, "lead_went_hot", { score: totalScore }).catch(console.error);
  }
}
