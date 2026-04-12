"use client";

import { useEffect, useState } from "react";
import { getCookieId } from "@/lib/cookies";
import { useRouter } from "next/navigation";

export default function DynamicBanner({ slug, courseTitle, price, originalPrice }) {
  const [banner, setBanner] = useState(null);
  const [visitCount, setVisitCount] = useState(0);
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const cookieId = getCookieId();

    // Fetch banner config and visit count in parallel
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
        setShow(true);
      }
    });
  }, [slug]);

  const handleCTA = async () => {
    const cookieId = getCookieId();
    if (!cookieId) {
      router.push(`/courses/${slug}`);
      return;
    }

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

  if (!show || !banner) return null;

  const discountedPrice = Math.round(price * (1 - banner.discount_percent / 100));
  const savings = price - discountedPrice;

  return (
    <div className="sticky top-6">
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-600 rounded-2xl p-1 shadow-xl animate-pulse-slow">
        <div className="bg-white rounded-xl p-5">
          {/* Badge */}
          <div className="flex justify-center mb-3">
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Special Offer
            </span>
          </div>

          {/* Offer Text */}
          <h3 className="text-center text-lg font-bold text-gray-900 mb-1">
            {banner.offer_text}
          </h3>
          <p className="text-center text-sm text-gray-500 mb-4">
            for {courseTitle}
          </p>

          {/* Price Display */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 mb-4 text-center">
            <p className="text-sm text-gray-500 line-through">${originalPrice}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-3xl font-black text-green-700">${discountedPrice}</span>
              <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {banner.discount_percent}% OFF
              </span>
            </div>
            <p className="text-sm text-green-600 font-medium mt-1">
              You save ${savings}
            </p>
          </div>

          {/* Visit Count Indicator */}
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
              You've visited this course <strong>{visitCount} times</strong>
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleCTA}
            disabled={adding}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3 rounded-xl font-bold text-base transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 shadow-lg"
          >
            {adding ? "Adding..." : banner.cta_text}
          </button>

          {/* Urgency */}
          <p className="text-center text-[11px] text-gray-400 mt-3">
            Offer valid for a limited time only
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
