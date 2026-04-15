import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — fetch recent rule match logs with lead info
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("password") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ruleId = searchParams.get("rule_id"); // optional filter

  let query = supabaseAdmin
    .from("email_logs")
    .select("id, trigger_event, status, rule_id, rule_name, ai_reasoning, error_message, subject, sent_at, lead_id, leads(name, email)")
    .not("rule_id", "is", null)
    .order("sent_at", { ascending: false })
    .limit(100);

  if (ruleId) {
    query = query.eq("rule_id", ruleId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: data || [] });
}
