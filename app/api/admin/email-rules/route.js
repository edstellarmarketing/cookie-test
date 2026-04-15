import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — fetch all email rules
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("password") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("email_rules")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rules: data || [] });
}

// POST — create a new rule
export async function POST(request) {
  try {
    const { password, ...rule } = await request.json();
    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!rule.name?.trim()) {
      return NextResponse.json({ error: "Rule name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("email_rules")
      .insert({
        name: rule.name.trim(),
        is_enabled: rule.is_enabled ?? true,
        condition_operator: rule.condition_operator || "AND",
        conditions: rule.conditions || [],
        trigger_frequency: rule.trigger_frequency || "once_ever",
        trigger_limit: rule.trigger_limit ?? 1,
        user_type: rule.user_type || "any",
        action: rule.action || "visit",
        page_match_type: rule.page_match_type || "any",
        page_match_value: rule.page_match_value?.trim() || "",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ rule: data });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
