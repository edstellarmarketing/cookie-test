import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { MILESTONES, evaluateMilestones } from "@/lib/milestones";
import { recomputeLeadScore } from "@/lib/recompute-scores";

export async function POST(request) {
  try {
    // Simple auth check — require admin password in body
    const { password } = await request.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all leads
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from("leads")
      .select("id, created_at");

    if (leadsError) {
      return NextResponse.json({ error: leadsError.message }, { status: 500 });
    }

    const results = [];

    for (const lead of leads || []) {
      // Fetch visits for this lead
      const { data: visits } = await supabaseAdmin
        .from("page_visits")
        .select("page_url, visited_at")
        .eq("lead_id", lead.id)
        .order("visited_at", { ascending: true });

      // Fetch existing milestones
      const { data: existing } = await supabaseAdmin
        .from("lead_milestones")
        .select("milestone_type, metadata")
        .eq("lead_id", lead.id);

      // Check if form_submitted milestone already exists
      const hasFormSubmitted = (existing || []).some(
        (m) => m.milestone_type === "form_submitted"
      );

      // Insert form_submitted if missing (all leads submitted the form)
      if (!hasFormSubmitted) {
        const fm = MILESTONES.form_submitted;
        await supabaseAdmin.from("lead_milestones").insert({
          lead_id: lead.id,
          milestone_type: "form_submitted",
          milestone_label: fm.label,
          points: fm.points,
          metadata: {},
          achieved_at: lead.created_at,
        });
      }

      // Re-fetch existing milestones after potential form_submitted insert
      const { data: updatedExisting } = await supabaseAdmin
        .from("lead_milestones")
        .select("milestone_type, metadata")
        .eq("lead_id", lead.id);

      // Evaluate visit-based milestones
      const newMilestones = evaluateMilestones(visits || [], updatedExisting || []);

      if (newMilestones.length > 0) {
        const rows = newMilestones.map((m) => ({ lead_id: lead.id, ...m }));
        const { error } = await supabaseAdmin.from("lead_milestones").insert(rows);
        if (error && error.code !== "23505") {
          console.error(`Backfill error for lead ${lead.id}:`, error.message);
        }
      }

      // Recompute score
      await recomputeLeadScore(supabaseAdmin, lead.id);

      results.push({
        lead_id: lead.id,
        new_milestones: newMilestones.length + (hasFormSubmitted ? 0 : 1),
      });
    }

    return NextResponse.json({
      success: true,
      leads_processed: results.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
