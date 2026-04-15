import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { MILESTONES } from "@/lib/milestones";
import { recomputeLeadScore } from "@/lib/recompute-scores";
import { triggerEmailDecision } from "@/lib/email-decision";

// POST — Check for abandoned carts (add_to_cart with no payment_completed after 30 min)
// Call this periodically or manually from admin
export async function POST(request) {
  try {
    const { password } = await request.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    // Find all add_to_cart events older than 30 minutes
    const { data: cartEvents } = await supabaseAdmin
      .from("cart_events")
      .select("lead_id, course_slug, cookie_id, created_at")
      .eq("event_type", "add_to_cart")
      .lt("created_at", thirtyMinAgo);

    if (!cartEvents || cartEvents.length === 0) {
      return NextResponse.json({ success: true, abandoned: 0 });
    }

    // Get all payment_completed events
    const { data: paidEvents } = await supabaseAdmin
      .from("cart_events")
      .select("lead_id, course_slug")
      .eq("event_type", "payment_completed");

    const paidSet = new Set(
      (paidEvents || []).map((e) => `${e.lead_id}:${e.course_slug}`)
    );

    // Get already-recorded cart_abandoned events
    const { data: abandonedEvents } = await supabaseAdmin
      .from("cart_events")
      .select("lead_id, course_slug")
      .eq("event_type", "cart_abandoned");

    const abandonedSet = new Set(
      (abandonedEvents || []).map((e) => `${e.lead_id}:${e.course_slug}`)
    );

    let abandonedCount = 0;
    const processedLeads = new Set();

    for (const event of cartEvents) {
      const key = `${event.lead_id}:${event.course_slug}`;

      // Skip if already paid or already marked abandoned
      if (paidSet.has(key) || abandonedSet.has(key)) continue;

      // Record cart_abandoned event
      await supabaseAdmin.from("cart_events").insert({
        lead_id: event.lead_id,
        cookie_id: event.cookie_id,
        course_slug: event.course_slug,
        event_type: "cart_abandoned",
        metadata: { added_at: event.created_at },
      });

      // Insert cart_abandoned milestone (once per lead)
      if (!processedLeads.has(event.lead_id)) {
        const ms = MILESTONES.cart_abandoned;
        const { error } = await supabaseAdmin.from("lead_milestones").insert({
          lead_id: event.lead_id,
          milestone_type: "cart_abandoned",
          milestone_label: ms.label,
          points: ms.points,
          metadata: { course_slug: event.course_slug },
        });
        if (error && error.code !== "23505") {
          console.error("cart_abandoned milestone error:", error.message);
        }

        await recomputeLeadScore(supabaseAdmin, event.lead_id);
        triggerEmailDecision(event.lead_id, "cart_abandoned", { course_slug: event.course_slug }).catch(console.error);
        processedLeads.add(event.lead_id);
      }

      abandonedCount++;
    }

    return NextResponse.json({ success: true, abandoned: abandonedCount });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
