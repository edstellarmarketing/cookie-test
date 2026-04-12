import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// GET — count how many times a visitor viewed a specific course
// /api/course-visits?cookie_id=xxx&slug=advanced-python
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cookie_id = searchParams.get("cookie_id");
    const slug = searchParams.get("slug");

    if (!cookie_id || !slug) {
      return NextResponse.json(
        { error: "cookie_id and slug are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const { count, error } = await supabaseAdmin
      .from("page_visits")
      .select("*", { count: "exact", head: true })
      .eq("cookie_id", cookie_id)
      .like("page_url", `%/courses/${slug}%`);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ count: count || 0 }, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
