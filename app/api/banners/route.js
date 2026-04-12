import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — fetch banner configs (optionally filter by slug)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    let query = supabaseAdmin.from("course_banners").select("*");
    if (slug) {
      query = query.eq("course_slug", slug).single();
      const { data, error } = await query;
      if (error || !data) {
        return NextResponse.json({ banner: null });
      }
      return NextResponse.json({ banner: data });
    }

    const { data, error } = await query.order("course_slug");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ banners: data || [] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — upsert banner config for a course
export async function POST(request) {
  try {
    const body = await request.json();
    const { course_slug, is_active, offer_text, discount_percent, cta_text } = body;

    if (!course_slug) {
      return NextResponse.json({ error: "course_slug is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("course_banners")
      .upsert(
        {
          course_slug,
          is_active: is_active ?? false,
          offer_text: offer_text || "Limited Time Offer!",
          discount_percent: discount_percent ?? 10,
          cta_text: cta_text || "Enroll Now",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "course_slug" }
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
