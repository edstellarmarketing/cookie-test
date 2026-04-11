import { supabaseAdmin } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { lead_id, current_page } = await request.json();

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
    }

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Fetch visit history
    const { data: visits } = await supabaseAdmin
      .from("page_visits")
      .select("page_url, page_title, visited_at")
      .eq("lead_id", lead_id)
      .order("visited_at", { ascending: true });

    // Build signals for AI
    const totalVisits = visits?.length || 0;
    const daysSinceFirstInterest = Math.floor(
      (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Extract unique courses visited
    const coursesViewed = [...new Set(
      (visits || [])
        .map((v) => {
          try {
            const path = new URL(v.page_url).pathname;
            const match = path.match(/\/courses\/([^/]+)/);
            return match ? match[1].replace(/-/g, " ") : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    )];

    // Visit dates for pattern detection
    const visitDates = (visits || []).map((v) => new Date(v.visited_at));
    const uniqueDays = [...new Set(visitDates.map((d) => d.toDateString()))];

    // Detect re-engagement (gap of 2+ days then return)
    let reEngaged = false;
    if (visitDates.length >= 2) {
      for (let i = 1; i < visitDates.length; i++) {
        const gap = (visitDates[i] - visitDates[i - 1]) / (1000 * 60 * 60 * 24);
        if (gap >= 2) {
          reEngaged = true;
          break;
        }
      }
    }

    // Last visit time
    const lastVisit = visits?.length
      ? visits[visits.length - 1].visited_at
      : lead.created_at;
    const minutesSinceLastVisit = Math.floor(
      (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60)
    );

    // Build the browsing journey
    const journey = (visits || []).map((v) => {
      const date = new Date(v.visited_at);
      const pageName = (() => {
        try {
          const path = new URL(v.page_url).pathname;
          if (path === "/") return "Home Page";
          return path.split("/").filter(Boolean).map(s => s.replace(/-/g, " ")).join(" > ");
        } catch {
          return v.page_url;
        }
      })();
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${pageName}`;
    }).join("\n");

    const prompt = `You are a sales intelligence assistant for a training course company. Analyze this lead's behavior and provide actionable sales guidance.

LEAD DETAILS:
- Name: ${lead.name}
- Email: ${lead.email}
- Phone: ${lead.phone || "Not provided"}
- Initially interested in: ${lead.course_interest?.replace(/-/g, " ") || "Unknown"}
- Signed up: ${daysSinceFirstInterest} day(s) ago
- Total page views: ${totalVisits}
- Visited on ${uniqueDays.length} different day(s)
- Courses browsed: ${coursesViewed.length > 0 ? coursesViewed.join(", ") : "None specifically"}
- Re-engaged after gap: ${reEngaged ? "Yes (came back after 2+ days away)" : "No"}
- Last active: ${minutesSinceLastVisit < 5 ? "RIGHT NOW on the site" : minutesSinceLastVisit + " minutes ago"}
${current_page ? `- Currently viewing: ${current_page}` : ""}

BROWSING JOURNEY:
${journey || "No visits recorded yet (just signed up)"}

Respond ONLY in this exact JSON format, no markdown, no extra text:
{
  "temperature": "Hot" or "Warm" or "Cold",
  "temperature_reason": "one short sentence why",
  "opening_line": "exact sentence the sales rep should say on the call",
  "talking_points": ["point 1", "point 2", "point 3 max"],
  "suggested_offer": "one sentence — the best deal/angle for this lead",
  "best_time": "when to call based on activity pattern",
  "watch_out": "one sentence — what to avoid"
}

Be crisp. Each field should be 1-2 sentences max. No fluff.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error?.message || `OpenRouter API error: ${response.status}` },
        { status: 502 }
      );
    }

    const aiData = await response.json();
    const aiRaw = aiData.choices?.[0]?.message?.content || "{}";

    // Parse structured JSON from AI
    let parsed;
    try {
      // Strip markdown code fences if present
      const cleaned = aiRaw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        temperature: "Warm",
        temperature_reason: "Unable to parse AI response",
        opening_line: "Hi, I noticed you showed interest in our training courses.",
        talking_points: ["Follow up on their course interest"],
        suggested_offer: "Share course details and upcoming batch schedule",
        best_time: "During business hours",
        watch_out: "N/A",
      };
    }

    const temperature = (parsed.temperature || "warm").toLowerCase();

    return NextResponse.json({
      success: true,
      intel: parsed,
      temperature,
      signals: {
        total_visits: totalVisits,
        days_since_signup: daysSinceFirstInterest,
        courses_viewed: coursesViewed,
        unique_days: uniqueDays.length,
        re_engaged: reEngaged,
        minutes_since_last_visit: minutesSinceLastVisit,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
