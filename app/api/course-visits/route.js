import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

// GET — visitor signals for banner scenario evaluation
// ?cookie_id=xxx&slug=yyy           → count visits to this course (default)
// ?cookie_id=xxx&type=distinct_courses → count distinct courses visited
// ?cookie_id=xxx&slug=yyy&type=last_gap → days since previous visit to this course
// ?cookie_id=xxx&slug=yyy&type=cart_status → cart/checkout status for this course
// ?cookie_id=xxx&slug=yyy&type=all_signals → all signals in one call
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cookie_id = searchParams.get("cookie_id");
    const slug = searchParams.get("slug");
    const type = searchParams.get("type") || "count";

    if (!cookie_id) {
      return json({ error: "cookie_id is required" }, 400);
    }

    // All signals in one call (used by DynamicBanner)
    if (type === "all_signals") {
      if (!slug) return json({ error: "slug is required for all_signals" }, 400);

      // Parallel queries
      const [countRes, distinctRes, visitsRes, cartRes, checkoutRes] = await Promise.all([
        // Visit count for this course
        supabaseAdmin
          .from("page_visits")
          .select("*", { count: "exact", head: true })
          .eq("cookie_id", cookie_id)
          .like("page_url", `%/courses/${slug}%`),
        // Distinct courses visited
        supabaseAdmin
          .from("page_visits")
          .select("page_url")
          .eq("cookie_id", cookie_id)
          .like("page_url", `%/courses/%`),
        // Last 2 visits to this course (for gap calculation)
        supabaseAdmin
          .from("page_visits")
          .select("visited_at")
          .eq("cookie_id", cookie_id)
          .like("page_url", `%/courses/${slug}%`)
          .order("visited_at", { ascending: false })
          .limit(2),
        // Cart events for this course
        supabaseAdmin
          .from("cart_events")
          .select("event_type, created_at")
          .eq("cookie_id", cookie_id)
          .eq("course_slug", slug)
          .order("created_at", { ascending: false }),
        // Checkout events for this course
        supabaseAdmin
          .from("cart_events")
          .select("event_type, created_at")
          .eq("cookie_id", cookie_id)
          .eq("course_slug", slug)
          .in("event_type", ["checkout_started", "payment_completed"])
          .order("created_at", { ascending: false }),
      ]);

      // Visit count
      const visitCount = countRes.count || 0;

      // Distinct courses
      const courseUrls = (distinctRes.data || []).map((v) => {
        try {
          const match = new URL(v.page_url).pathname.match(/\/courses\/([^/]+)/);
          return match ? match[1] : null;
        } catch { return null; }
      }).filter(Boolean);
      const distinctCourses = [...new Set(courseUrls)].length;

      // Gap days
      let gapDays = 0;
      const visits = visitsRes.data || [];
      if (visits.length >= 2) {
        const latest = new Date(visits[0].visited_at);
        const prev = new Date(visits[1].visited_at);
        gapDays = Math.floor((latest - prev) / (1000 * 60 * 60 * 24));
      }

      // Cart status
      const cartEvents = cartRes.data || [];
      const hasAddToCart = cartEvents.some((e) => e.event_type === "add_to_cart");
      const hasPayment = cartEvents.some((e) => e.event_type === "payment_completed");
      const addToCartTime = cartEvents.find((e) => e.event_type === "add_to_cart")?.created_at;
      const cartAgeMin = addToCartTime
        ? Math.floor((Date.now() - new Date(addToCartTime).getTime()) / 60000)
        : 0;
      const cartAbandoned = hasAddToCart && !hasPayment && cartAgeMin >= 30;

      // Checkout status
      const checkoutEvents = checkoutRes.data || [];
      const hasCheckoutStarted = checkoutEvents.some((e) => e.event_type === "checkout_started");
      const checkoutDropout = hasCheckoutStarted && !hasPayment;

      return json({
        visit_count: visitCount,
        distinct_courses: distinctCourses,
        gap_days: gapDays,
        cart_abandoned: cartAbandoned,
        checkout_dropout: checkoutDropout,
        has_payment: hasPayment,
      });
    }

    // Simple count (default)
    if (type === "count") {
      if (!slug) return json({ error: "slug is required" }, 400);
      const { count, error } = await supabaseAdmin
        .from("page_visits")
        .select("*", { count: "exact", head: true })
        .eq("cookie_id", cookie_id)
        .like("page_url", `%/courses/${slug}%`);
      if (error) return json({ error: error.message }, 500);
      return json({ count: count || 0 });
    }

    return json({ error: "Unknown type" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
