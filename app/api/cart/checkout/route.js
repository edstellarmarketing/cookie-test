import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { MILESTONES } from "@/lib/milestones";
import { recomputeLeadScore } from "@/lib/recompute-scores";

// POST — Simulate payment (checkout_started + payment_completed or failure)
export async function POST(request) {
  try {
    const { cookie_id, course_slug, course_title, price, card_number } = await request.json();

    if (!cookie_id || !course_slug) {
      return NextResponse.json(
        { error: "cookie_id and course_slug are required" },
        { status: 400 }
      );
    }

    // Look up lead
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cookie_id", cookie_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Record checkout_started event
    await supabaseAdmin.from("cart_events").insert({
      lead_id: lead.id,
      cookie_id,
      course_slug,
      event_type: "checkout_started",
      metadata: { course_title, price },
    });

    // Simulate payment — card ending in 0000 = decline, everything else = success
    const isDeclined = card_number?.endsWith("0000");

    if (isDeclined) {
      return NextResponse.json({
        success: false,
        error: "Payment declined. Your card was not charged. Please try a different card.",
      }, { status: 402 });
    }

    // Payment success — record event
    await supabaseAdmin.from("cart_events").insert({
      lead_id: lead.id,
      cookie_id,
      course_slug,
      event_type: "payment_completed",
      metadata: { course_title, price, last_four: card_number?.slice(-4) },
    });

    // Trigger payment_completed milestone
    const ms = MILESTONES.payment_completed;
    const { error: msError } = await supabaseAdmin.from("lead_milestones").insert({
      lead_id: lead.id,
      milestone_type: "payment_completed",
      milestone_label: ms.label,
      points: ms.points,
      metadata: { course_slug, price },
    });
    if (msError && msError.code !== "23505") {
      console.error("payment_completed milestone error:", msError.message);
    }

    await recomputeLeadScore(supabaseAdmin, lead.id);

    return NextResponse.json({
      success: true,
      message: "Payment successful! You are enrolled.",
      course_slug,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
