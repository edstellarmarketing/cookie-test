import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { cookie_id, name, email, phone, course_interest } = body;

    if (!cookie_id || !name || !email) {
      return NextResponse.json(
        { error: "cookie_id, name, and email are required" },
        { status: 400 }
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, lead: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ leads: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
