"use client";

import { useEffect, useState, useRef } from "react";
import { getCookieId } from "@/lib/cookies";
import { useRouter } from "next/navigation";

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

// Per-scenario personalized messages
const SCENARIO_MESSAGES = {
  frequent_visitor: (title) =>
    `We noticed you've been exploring **${title}** multiple times. This exclusive deal is crafted just for you!`,
  cart_abandoned: (title) =>
    `You left **${title}** in your cart! Complete your enrollment now with an extra discount before this offer disappears.`,
  re_engagement: (title) =>
    `Welcome back! We're glad to see you again. Here's a special returning visitor offer for **${title}**.`,
  first_visit: (title) =>
    `Looks like you just discovered **${title}**! Here's an early-bird discount to get you started.`,
  course_explorer: (title) =>
    `You've been exploring several courses — we think **${title}** is the perfect fit. Here's a special deal.`,
  checkout_dropout: (title) =>
    `You were so close to enrolling in **${title}**! Complete your payment now with this last-chance discount.`,
};

const SCENARIO_BADGES = {
  frequent_visitor: { text: "Exclusive Offer — Just For You", color: "bg-red-600" },
  cart_abandoned: { text: "Complete Your Purchase", color: "bg-orange-600" },
  re_engagement: { text: "Welcome Back Offer", color: "bg-purple-600" },
  first_visit: { text: "Early Bird Discount", color: "bg-blue-600" },
  course_explorer: { text: "Curated For You", color: "bg-indigo-600" },
  checkout_dropout: { text: "Last Chance — Don't Miss Out", color: "bg-rose-600" },
};

function getOfferState(slug, scenario) {
  try {
    const raw = localStorage.getItem(`offer_${slug}_${scenario}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setOfferState(slug, scenario, state) {
  localStorage.setItem(`offer_${slug}_${scenario}`, JSON.stringify(state));
}

function formatTime(ms) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Check if a scenario matches the visitor's signals
function evaluateScenario(scenario, signals) {
  switch (scenario) {
    case "frequent_visitor":
      return signals.visit_count >= 3;
    case "cart_abandoned":
      return signals.cart_abandoned === true;
    case "re_engagement":
      return signals.gap_days >= 2 && signals.visit_count >= 2;
    case "first_visit":
      return signals.visit_count === 1;
    case "course_explorer":
      return signals.distinct_courses >= 3;
    case "checkout_dropout":
      return signals.checkout_dropout === true;
    default:
      return false;
  }
}

export default function DynamicBanner({ slug, courseTitle, price, originalPrice }) {
  const [activeBanner, setActiveBanner] = useState(null);
  const [signals, setSignals] = useState(null);
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef(null);
  const router = useRouter();

  const startTimer = (expiresAt, scSlug, scScenario) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00:00");
        setExpired(true);
        setShow(false);
        setOfferState(scSlug, scScenario, { expired_at: Date.now() });
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setTimeLeft(formatTime(remaining));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const cookieId = getCookieId();
      if (!cookieId) return;

      Promise.all([
        fetch(`/api/banners?slug=${encodeURIComponent(slug)}`)
          .then((r) => r.json()).catch(() => ({ banners: [] })),
        fetch(`/api/course-visits?cookie_id=${encodeURIComponent(cookieId)}&slug=${encodeURIComponent(slug)}&type=all_signals`)
          .then((r) => r.json()).catch(() => ({})),
      ]).then(([bannerData, signalData]) => {
        const banners = (bannerData.banners || []).filter((b) => b.is_active);
        setSignals(signalData);

        if (signalData.has_payment) return; // Already paid — no banners

        // Sort by priority descending, find the first matching scenario
        banners.sort((a, b) => (b.priority || 0) - (a.priority || 0));

        for (const banner of banners) {
          if (!evaluateScenario(banner.scenario, signalData)) continue;

          // Check cooldown
          const state = getOfferState(slug, banner.scenario);
          if (state?.expired_at && Date.now() - state.expired_at < COOLDOWN_MS) continue;
          if (state?.expired_at && Date.now() - state.expired_at >= COOLDOWN_MS) {
            localStorage.removeItem(`offer_${slug}_${banner.scenario}`);
          }

          // This banner matches — activate it
          setActiveBanner(banner);

          const existing = getOfferState(slug, banner.scenario);
          const timerMs = (banner.timer_hours || 4) * 3600000;
          let expiresAt;

          if (existing?.expires_at && !existing.expired_at) {
            expiresAt = existing.expires_at;
            if (expiresAt <= Date.now()) {
              setOfferState(slug, banner.scenario, { expired_at: Date.now() });
              continue; // Expired while away, try next
            }
          } else {
            expiresAt = Date.now() + timerMs;
            setOfferState(slug, banner.scenario, { expires_at: expiresAt });
          }

          setShow(true);
          startTimer(expiresAt, slug, banner.scenario);
          break; // Only show one banner
        }
      });
    }, 1500);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [slug]);

  const handleCTA = async () => {
    const cookieId = getCookieId();
    if (!cookieId) return;
    setAdding(true);
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie_id: cookieId,
          course_slug: slug,
          course_title: courseTitle,
          price: discountedPrice,
        }),
      });
      router.push("/cart");
    } catch {
      router.push("/cart");
    }
  };

  if (!show || !activeBanner || expired) return null;

  const discountedPrice = Math.round(price * (1 - activeBanner.discount_percent / 100));
  const savings = price - discountedPrice;
  const badge = SCENARIO_BADGES[activeBanner.scenario] || SCENARIO_BADGES.frequent_visitor;
  const message = (SCENARIO_MESSAGES[activeBanner.scenario] || SCENARIO_MESSAGES.frequent_visitor)(courseTitle);

  // Parse markdown bold (**text**) in message
  const renderMessage = (msg) => {
    const parts = msg.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="sticky top-6">
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl p-1 shadow-xl">
        <div className="bg-white rounded-xl p-5">
          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className={`${badge.color} text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse`}>
              {badge.text}
            </span>
          </div>

          {/* Offer Headline */}
          <h3 className="text-center text-lg font-bold text-gray-900 mb-2">
            {activeBanner.offer_text}
          </h3>

          {/* Personalized Message */}
          <p className="text-center text-sm text-gray-600 mb-4 leading-relaxed">
            {renderMessage(message)}
          </p>

          {/* Countdown Timer */}
          <div className="bg-gray-900 rounded-xl p-4 mb-4 text-center">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-1">
              Offer expires in
            </p>
            <div className="flex items-center justify-center gap-1">
              {timeLeft.split(":").map((unit, i) => (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-500 text-lg font-bold">:</span>}
                  <span className="bg-gray-800 text-white text-2xl font-mono font-black px-3 py-1.5 rounded-lg min-w-[3rem] inline-block">
                    {unit}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-8 mt-1">
              <span className="text-[10px] text-gray-500">HRS</span>
              <span className="text-[10px] text-gray-500">MIN</span>
              <span className="text-[10px] text-gray-500">SEC</span>
            </div>
          </div>

          {/* Price Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-gray-500 line-through">${originalPrice}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-3xl font-black text-green-700">${discountedPrice}</span>
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {activeBanner.discount_percent}% OFF
              </span>
            </div>
            <p className="text-sm text-green-600 font-medium mt-1">
              You save ${savings}
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCTA}
            disabled={adding}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3.5 rounded-xl font-bold text-base transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {adding ? "Adding..." : activeBanner.cta_text}
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-3">
            This personalized offer won't be available again for 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}
