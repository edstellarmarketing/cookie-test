import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { MILESTONES } from "@/lib/milestones";
import { recomputeLeadScore } from "@/lib/recompute-scores";

// POST — Add to cart (records event + triggers cart_page_reached milestone)
export async function POST(request) {
  try {
    const { cookie_id, course_slug, course_title, price } = await request.json();

    if (!cookie_id || !course_slug) {
      return NextResponse.json(
        { error: "cookie_id and course_slug are required" },
        { status: 400 }
      );
    }

    // Look up lead — create anonymous one if visitor hasn't filled the form yet
    let { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cookie_id", cookie_id)
      .single();

    if (!lead) {
      const { data: newLead, error: createError } = await supabaseAdmin
        .from("leads")
        .insert({
          cookie_id,
          name: "Anonymous",
          email: `${cookie_id}@unknown`,
          course_interest: course_slug,
        })
        .select("id")
        .single();

      if (createError || !newLead) {
        return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
      }
      lead = newLead;
    }

    // Record add_to_cart event
    await supabaseAdmin.from("cart_events").insert({
      lead_id: lead.id,
      cookie_id,
      course_slug,
      event_type: "add_to_cart",
      metadata: { course_title, price },
    });

    // Trigger cart_page_reached milestone
    const ms = MILESTONES.cart_page_reached;
    const { error: msError } = await supabaseAdmin.from("lead_milestones").insert({
      lead_id: lead.id,
      milestone_type: "cart_page_reached",
      milestone_label: ms.label,
      points: ms.points,
      metadata: { course_slug, price },
    });
    if (msError && msError.code !== "23505") {
      console.error("cart_page_reached milestone error:", msError.message);
    }

    await recomputeLeadScore(supabaseAdmin, lead.id);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET — Get active cart items for a lead (not yet paid)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cookie_id = searchParams.get("cookie_id");

    if (!cookie_id) {
      return NextResponse.json({ error: "cookie_id is required" }, { status: 400 });
    }

    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cookie_id", cookie_id)
      .single();

    if (!lead) {
      return NextResponse.json({ cart: [] });
    }

    // Get add_to_cart events that don't have a corresponding payment_completed
    const { data: cartEvents } = await supabaseAdmin
      .from("cart_events")
      .select("*")
      .eq("lead_id", lead.id)
      .eq("event_type", "add_to_cart")
      .order("created_at", { ascending: false });

    const { data: paidEvents } = await supabaseAdmin
      .from("cart_events")
      .select("course_slug")
      .eq("lead_id", lead.id)
      .eq("event_type", "payment_completed");

    const paidSlugs = new Set((paidEvents || []).map((e) => e.course_slug));

    // Deduplicate by course_slug, exclude already paid
    const seen = new Set();
    const activeCart = (cartEvents || []).filter((e) => {
      if (paidSlugs.has(e.course_slug) || seen.has(e.course_slug)) return false;
      seen.add(e.course_slug);
      return true;
    });

    return NextResponse.json({ cart: activeCart });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
