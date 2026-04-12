import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — fetch banner configs
// ?slug=xxx → returns array of banners for that course (one per scenario)
// no params → returns all banners
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    let query = supabaseAdmin
      .from("course_banners")
      .select("*")
      .order("priority", { ascending: false });

    if (slug) {
      query = query.eq("course_slug", slug);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ banners: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — upsert a banner config for a course + scenario
export async function POST(request) {
  try {
    const body = await request.json();
    const { course_slug, scenario, is_active, offer_text, discount_percent, timer_hours, cta_text, priority } = body;

    if (!course_slug || !scenario) {
      return NextResponse.json(
        { error: "course_slug and scenario are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("course_banners")
      .upsert(
        {
          course_slug,
          scenario,
          is_active: is_active ?? false,
          offer_text: offer_text || "Limited Time Offer!",
          discount_percent: discount_percent ?? 10,
          timer_hours: timer_hours ?? 4,
          cta_text: cta_text || "Enroll Now",
          priority: priority ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_slug,scenario" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, banner: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
