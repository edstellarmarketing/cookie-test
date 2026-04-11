import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
      .from("page_visits")
      .select("*")
      .eq("lead_id", id)
      .order("visited_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ visits: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
