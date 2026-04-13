import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { MILESTONES, getTemperature } from "@/lib/milestones";

function getCorsHeaders(request) {
  const origin = request.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
  };
}

function jsonResponse(body, opts = {}, request) {
  const corsHeaders = getCorsHeaders(request);
  return NextResponse.json(body, {
    ...opts,
    headers: { ...corsHeaders, ...opts.headers },
  });
}

// CORS preflight
export async function OPTIONS(request) {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { cookie_id, name, email, phone, course_interest } = body;

    if (!cookie_id || !name || !email) {
      return jsonResponse(
        { error: "cookie_id, name, and email are required" },
        { status: 400 },
        request
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
      return jsonResponse({ error: error.message }, { status: 500 }, request);
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

    return jsonResponse({ success: true, lead: data }, { status: 201 }, request);
  } catch (err) {
    return jsonResponse({ error: err.message }, { status: 500 }, request);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain");

    let query = supabaseAdmin
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter by domain: find lead_ids that have visits on this domain
    if (domain) {
      const { data: visitLeadIds } = await supabaseAdmin
        .from("page_visits")
        .select("lead_id")
        .eq("domain", domain);

      const uniqueIds = [...new Set((visitLeadIds || []).map((v) => v.lead_id))];
      if (uniqueIds.length === 0) {
        return jsonResponse({ leads: [] }, {}, request);
      }
      query = query.in("id", uniqueIds);
    }

    const { data, error } = await query;

    if (error) {
      return jsonResponse({ error: error.message }, { status: 500 }, request);
    }

    return jsonResponse({ leads: data }, {}, request);
  } catch (err) {
    return jsonResponse({ error: err.message }, { status: 500 }, request);
  }
}
