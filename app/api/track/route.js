import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { evaluateMilestones } from "@/lib/milestones";
import { recomputeLeadScore } from "@/lib/recompute-scores";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body, opts = {}) {
  return NextResponse.json(body, {
    ...opts,
    headers: { ...corsHeaders, ...opts.headers },
  });
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Fire-and-forget milestone evaluation — runs after response is sent
async function processMilestones(leadId) {
  try {
    const { data: visits } = await supabaseAdmin
      .from("page_visits")
      .select("page_url, visited_at")
      .eq("lead_id", leadId)
      .order("visited_at", { ascending: true });

    const { data: existing } = await supabaseAdmin
      .from("lead_milestones")
      .select("milestone_type, metadata")
      .eq("lead_id", leadId);

    const newMilestones = evaluateMilestones(visits || [], existing || []);

    if (newMilestones.length > 0) {
      const rows = newMilestones.map((m) => ({ lead_id: leadId, ...m }));
      const { error } = await supabaseAdmin.from("lead_milestones").insert(rows);
      if (error && error.code !== "23505") {
        console.error("Milestone insert error:", error.message);
      }
    }

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
      return jsonResponse(
        { error: "cookie_id and page_url are required" },
        { status: 400 }
      );
    }

    // Parse domain from page_url
    let domain = null;
    try {
      domain = new URL(page_url).hostname;
    } catch {}

    // Look up the lead by cookie_id
    let { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cookie_id", cookie_id)
      .single();

    // Auto-create anonymous lead if not found (for external embed tracking)
    if (leadError || !lead) {
      const { data: newLead, error: createError } = await supabaseAdmin
        .from("leads")
        .insert({ cookie_id, name: "Anonymous", email: "pending@unknown" })
        .select("id")
        .single();

      if (createError) {
        return jsonResponse(
          { error: "Could not create anonymous lead" },
          { status: 500 }
        );
      }
      lead = newLead;
    }

    // Insert the page visit with domain
    const { error: visitError } = await supabaseAdmin
      .from("page_visits")
      .insert({
        lead_id: lead.id,
        cookie_id,
        page_url,
        page_title,
        domain,
      });

    if (visitError) {
      return jsonResponse({ error: visitError.message }, { status: 500 });
    }

    // Evaluate milestones in the background (non-blocking)
    processMilestones(lead.id);

    return jsonResponse({ success: true }, { status: 201 });
  } catch (err) {
    return jsonResponse({ error: err.message }, { status: 500 });
  }
}
