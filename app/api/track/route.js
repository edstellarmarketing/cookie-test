import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { cookie_id, page_url, page_title } = body;

    if (!cookie_id || !page_url) {
      return NextResponse.json(
        { error: "cookie_id and page_url are required" },
        { status: 400 }
      );
    }

    // Look up the lead by cookie_id
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("cookie_id", cookie_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json(
        { error: "Lead not found for this cookie" },
        { status: 404 }
      );
    }

    // Insert the page visit
    const { error: visitError } = await supabaseAdmin
      .from("page_visits")
      .insert({
        lead_id: lead.id,
        cookie_id,
        page_url,
        page_title,
      });

    if (visitError) {
      return NextResponse.json({ error: visitError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
