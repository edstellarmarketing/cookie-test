"use client";

import { useEffect, useState, useRef } from "react";
import { getCookieId } from "@/lib/cookies";
import { useRouter } from "next/navigation";

const OFFER_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

function getOfferState(slug) {
  try {
    const raw = localStorage.getItem(`offer_${slug}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setOfferState(slug, state) {
  localStorage.setItem(`offer_${slug}`, JSON.stringify(state));
}

function formatTime(ms) {
  if (ms <= 0) return "00:00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DynamicBanner({ slug, courseTitle, price, originalPrice }) {
  const [banner, setBanner] = useState(null);
  const [visitCount, setVisitCount] = useState(0);
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef(null);
  const router = useRouter();

  // Start or resume the countdown timer
  const startTimer = (expiresAt) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00:00");
        setExpired(true);
        setShow(false);
        // Mark as expired with cooldown timestamp
        setOfferState(slug, { expired_at: Date.now() });
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

      // Check cooldown — if offer expired within last 24 hours, don't show
      const offerState = getOfferState(slug);
      if (offerState?.expired_at) {
        const elapsed = Date.now() - offerState.expired_at;
        if (elapsed < COOLDOWN_MS) {
          return; // Still in 24h cooldown
        }
        // Cooldown passed — clear state so offer can trigger again
        localStorage.removeItem(`offer_${slug}`);
      }

      Promise.all([
        fetch(`/api/banners?slug=${encodeURIComponent(slug)}`)
          .then((r) => r.json())
          .catch(() => ({ banner: null })),
        cookieId
          ? fetch(`/api/course-visits?cookie_id=${encodeURIComponent(cookieId)}&slug=${encodeURIComponent(slug)}`)
              .then((r) => r.json())
              .catch(() => ({ count: 0 }))
          : Promise.resolve({ count: 0 }),
      ]).then(([bannerData, visitData]) => {
        const b = bannerData.banner;
        const count = visitData.count || 0;
        setBanner(b);
        setVisitCount(count);

        if (b && b.is_active && count >= 3) {
          // Check if there's an existing active timer
          const existing = getOfferState(slug);
          let expiresAt;

          if (existing?.expires_at && !existing.expired_at) {
            // Resume existing timer
            expiresAt = existing.expires_at;
            if (expiresAt <= Date.now()) {
              // Already expired while visitor was away
              setOfferState(slug, { expired_at: Date.now() });
              return;
            }
          } else if (!existing?.expired_at) {
            // Start new 4-hour timer
            expiresAt = Date.now() + OFFER_DURATION_MS;
            setOfferState(slug, { expires_at: expiresAt });
          } else {
            return; // In cooldown
          }

          setShow(true);
          startTimer(expiresAt);
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
    if (!cookieId) {
      router.push(`/courses/${slug}`);
      return;
    }

    setAdding(true);
    const discounted = Math.round(price * (1 - (banner.discount_percent + 10) / 100));
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie_id: cookieId,
          course_slug: slug,
          course_title: courseTitle,
          price: discounted,
        }),
      });
      router.push("/cart");
    } catch {
      router.push("/cart");
    }
  };

  if (!show || !banner || expired) return null;

  const baseDiscount = banner.discount_percent;
  const totalDiscount = baseDiscount + 10; // extra 10% for urgency
  const discountedPrice = Math.round(price * (1 - totalDiscount / 100));
  const savings = price - discountedPrice;

  return (
    <div className="sticky top-6">
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl p-1 shadow-xl">
        <div className="bg-white rounded-xl p-5">
          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
              Exclusive Offer — Just For You
            </span>
          </div>

          {/* Personalized Text */}
          <p className="text-center text-sm text-gray-600 mb-2 leading-relaxed">
            We noticed you've been exploring{" "}
            <strong className="text-gray-900">{courseTitle}</strong>.
            This exclusive deal is crafted just for you based on your interest.
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

          {/* Extra Discount Highlight */}
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4 text-center">
            <p className="text-xs text-amber-800">
              Get an <strong>additional 10% off</strong> on top of the {baseDiscount}% discount
              if you purchase within the next 4 hours!
            </p>
          </div>

          {/* Price Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-gray-500 line-through">${originalPrice}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-3xl font-black text-green-700">${discountedPrice}</span>
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalDiscount}% OFF
              </span>
            </div>
            <p className="text-sm text-green-600 font-medium mt-1">
              You save ${savings}
            </p>
          </div>

          {/* Visit Count */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex -space-x-1">
              {[...Array(Math.min(visitCount, 5))].map((_, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full bg-orange-400 border-2 border-white"
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              You've viewed this course <strong>{visitCount} times</strong>
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCTA}
            disabled={adding}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3.5 rounded-xl font-bold text-base transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {adding ? "Adding..." : banner.cta_text}
          </button>

          <p className="text-center text-[11px] text-gray-400 mt-3">
            This personalized offer won't be available again for 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}
