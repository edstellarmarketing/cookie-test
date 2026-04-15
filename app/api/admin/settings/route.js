import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — fetch all admin settings (or a single key via ?key=...)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const password = searchParams.get("password");
  const key = searchParams.get("key");

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = supabaseAdmin.from("admin_settings").select("key, value");
  if (key) query = query.eq("key", key).single();

  const { data, error } = await query;
  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || null });
}

// POST — upsert a setting { key, value }
export async function POST(request) {
  try {
    const { password, key, value } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("admin_settings")
      .upsert({ key, value }, { onConflict: "key" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
