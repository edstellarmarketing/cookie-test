import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Fetch lead score/temperature
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id, lead_score, lead_temperature, score_updated_at")
      .eq("id", id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch all milestones for this lead
    const { data: milestones, error: msError } = await supabaseAdmin
      .from("lead_milestones")
      .select("*")
      .eq("lead_id", id)
      .order("achieved_at", { ascending: false });

    if (msError) {
      return NextResponse.json({ error: msError.message }, { status: 500 });
    }

    return NextResponse.json({
      milestones: milestones || [],
      score: lead.lead_score,
      temperature: lead.lead_temperature,
      score_updated_at: lead.score_updated_at,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
