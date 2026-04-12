"use client";

import { useEffect } from "react";
import { getCookieId, setCookieId } from "@/lib/cookies";
import { usePathname } from "next/navigation";

export default function TrackingScript() {
  const pathname = usePathname();

  useEffect(() => {
    // Auto-create visitor_id cookie if not present (enables tracking before form submission)
    let cookieId = getCookieId();
    if (!cookieId) {
      cookieId = crypto.randomUUID();
      setCookieId(cookieId);
    }

    // Don't track admin pages
    if (pathname.startsWith("/admin")) return;

    // Debounce: don't log the same page within 30 seconds
    const debounceKey = `track_${pathname}`;
    const lastTrack = sessionStorage.getItem(debounceKey);
    if (lastTrack && Date.now() - parseInt(lastTrack) < 30000) return;

    sessionStorage.setItem(debounceKey, Date.now().toString());

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cookie_id: cookieId,
        page_url: window.location.href,
        page_title: document.title,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
