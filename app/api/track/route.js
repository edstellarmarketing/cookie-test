import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { evaluateMilestones } from "@/lib/milestones";
import { recomputeLeadScore } from "@/lib/recompute-scores";

// Fire-and-forget milestone evaluation — runs after response is sent
async function processMilestones(leadId) {
  try {
    // Fetch all visits for this lead
    const { data: visits } = await supabaseAdmin
      .from("page_visits")
      .select("page_url, visited_at")
      .eq("lead_id", leadId)
      .order("visited_at", { ascending: true });

    // Fetch existing milestones
    const { data: existing } = await supabaseAdmin
      .from("lead_milestones")
      .select("milestone_type, metadata")
      .eq("lead_id", leadId);

    const newMilestones = evaluateMilestones(visits || [], existing || []);

    if (newMilestones.length > 0) {
      // Batch insert — ignore duplicate constraint violations (code 23505)
      const rows = newMilestones.map((m) => ({ lead_id: leadId, ...m }));
      const { error } = await supabaseAdmin.from("lead_milestones").insert(rows);
      if (error && error.code !== "23505") {
        console.error("Milestone insert error:", error.message);
      }
    }

    // Recompute score regardless — handles edge case where milestones existed but score was stale
    await recomputeLeadScore(supabaseAdmin, leadId);
  } catch (err) {
    console.error("Milestone processing error:", err.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cookie_id, page_url, page_title } = body;

    if (!cookie_id || !page_url) {
      return NextResponse.json(
        { error: "cookie_id and page_url are required" },
        { status: 400 }
      );
    }

    // Look up the lead by cookie_id
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cookie_id", cookie_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead not found for this cookie" },
        { status: 404 }
      );
    }

    // Insert the page visit
    const { error: visitError } = await supabaseAdmin
      .from("page_visits")
      .insert({
        lead_id: lead.id,
        cookie_id,
        page_url,
        page_title,
      });

    if (visitError) {
      return NextResponse.json({ error: visitError.message }, { status: 500 });
    }

    // Evaluate milestones in the background (non-blocking)
    processMilestones(lead.id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
