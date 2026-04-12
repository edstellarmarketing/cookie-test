import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { MILESTONES, getTemperature } from "@/lib/milestones";

export async function POST(request) {
  try {
    const body = await request.json();
    const { cookie_id, name, email, phone, course_interest } = body;

    if (!cookie_id || !name || !email) {
      return NextResponse.json(
        { error: "cookie_id, name, and email are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .upsert(
        { cookie_id, name, email, phone, course_interest },
        { onConflict: "cookie_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert form_submitted milestone (ignore if already exists via unique index)
    const formMilestone = MILESTONES.form_submitted;
    const { error: msError } = await supabaseAdmin
      .from("lead_milestones")
      .insert({
        lead_id: data.id,
        milestone_type: "form_submitted",
        milestone_label: formMilestone.label,
        points: formMilestone.points,
        metadata: { course_interest },
      });

    if (msError && msError.code !== "23505") {
      console.error("form_submitted milestone insert error:", msError.message);
    }

    // Update lead score with form_submitted points if milestone was new
    if (!msError) {
      const score = (data.lead_score || 0) + formMilestone.points;
      await supabaseAdmin
        .from("leads")
        .update({
          lead_score: score,
          lead_temperature: getTemperature(score),
          score_updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
    }

    return NextResponse.json({ success: true, lead: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
