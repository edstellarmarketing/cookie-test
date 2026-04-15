import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — fetch current email settings
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("password") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("email_settings")
    .select("*")
    .eq("id", 1)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return defaults if row doesn't exist yet
  return NextResponse.json({
    settings: data || {
      global_enabled: true,
      rule_repeat_course_visit: true,
      rule_cart_abandoned: true,
      rule_lead_went_hot: true,
      rule_re_engaged_after_gap: true,
    },
  });
}

// POST — save email settings
export async function POST(request) {
  try {
    const body = await request.json();
    const { password, ...fields } = body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabaseAdmin
      .from("email_settings")
      .upsert({ id: 1, ...fields, updated_at: new Date().toISOString() }, { onConflict: "id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
