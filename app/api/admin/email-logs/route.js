import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — Return all sent email logs joined with lead name/email
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("email_logs")
    .select("id, trigger_event, subject, body, ai_reasoning, sent_at, lead_id, leads(name, email)")
    .order("sent_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs: data || [] });
}
