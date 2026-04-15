import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// GET — return distinct pages seen in page_visits, ordered by frequency
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("password") !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Pull distinct page_url + most recent page_title, ordered by visit count desc
  const { data, error } = await supabaseAdmin
    .from("page_visits")
    .select("page_url, page_title")
    .order("visited_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicate by URL, keep first (most recent) title
  const seen = new Set();
  const pages = [];
  for (const row of data || []) {
    if (!seen.has(row.page_url)) {
      seen.add(row.page_url);
      pages.push({ url: row.page_url, title: row.page_title || row.page_url });
    }
  }

  return NextResponse.json({ pages });
}
