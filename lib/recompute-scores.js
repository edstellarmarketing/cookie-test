import { getTemperature } from "./milestones";

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
  }
}
