"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

const TIMER_MS = 10 * 60 * 1000; // 10 minutes
const EXTRA_DISCOUNT = 5; // additional 5%

function formatTime(ms) {
  if (ms <= 0) return "00:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function CartAbandonmentBanner() {
  const pathname = usePathname();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [courses, setCourses] = useState([]);
  const [timeLeft, setTimeLeft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Don't show on checkout, cart, or admin pages
    if (pathname === "/checkout" || pathname === "/cart" || pathname.startsWith("/admin")) {
      setShow(false);
      return;
    }

    // Check if visitor came from checkout without paying
    const checkoutVisited = sessionStorage.getItem("checkout_visited");
    const checkoutCourses = sessionStorage.getItem("checkout_courses");
    const bannerDismissed = sessionStorage.getItem("cart_abandon_dismissed");

    if (!checkoutVisited || !checkoutCourses || bannerDismissed) {
      setShow(false);
      return;
    }

    try {
      const parsed = JSON.parse(checkoutCourses);
      if (!parsed || parsed.length === 0) return;
      setCourses(parsed);
    } catch {
      return;
    }

    // Start or resume timer
    let expiresAt;
    const savedExpiry = sessionStorage.getItem("cart_abandon_expires");
    if (savedExpiry) {
      expiresAt = parseInt(savedExpiry);
      if (expiresAt <= Date.now()) {
        // Timer expired — clear everything
        sessionStorage.removeItem("checkout_visited");
        sessionStorage.removeItem("checkout_courses");
        sessionStorage.removeItem("cart_abandon_expires");
        setShow(false);
        return;
      }
    } else {
      expiresAt = Date.now() + TIMER_MS;
      sessionStorage.setItem("cart_abandon_expires", expiresAt.toString());
    }

    setShow(true);

    if (intervalRef.current) clearInterval(intervalRef.current);
    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeft("00:00");
        setShow(false);
        sessionStorage.removeItem("checkout_visited");
        sessionStorage.removeItem("checkout_courses");
        sessionStorage.removeItem("cart_abandon_expires");
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      setTimeLeft(formatTime(remaining));
    };
    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    sessionStorage.setItem("cart_abandon_dismissed", "true");
  };

  const handleGoToCheckout = () => {
    router.push("/checkout");
  };

  if (!show || dismissed || courses.length === 0) return null;

  const totalOriginal = courses.reduce((sum, c) => sum + c.price, 0);
  const totalDiscounted = Math.round(totalOriginal * (1 - EXTRA_DISCOUNT / 100));
  const savings = totalOriginal - totalDiscounted;

  return (
    <div className="fixed bottom-0 right-0 z-50 m-4 max-w-sm w-full animate-slide-up">
      <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-0.5 shadow-2xl">
        <div className="bg-white rounded-xl p-5 relative">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-lg w-6 h-6 flex items-center justify-center"
          >
            &#10005;
          </button>

          {/* Badge */}
          <div className="flex justify-center mb-2">
            <span className="bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
              Your cart is waiting!
            </span>
          </div>

          {/* Message */}
          <p className="text-center text-sm text-gray-700 mb-3 leading-relaxed">
            You were about to enroll in{" "}
            <strong className="text-gray-900">
              {courses.map((c) => c.title).join(", ")}
            </strong>
            . Complete your payment now and get an{" "}
            <strong className="text-orange-600">extra {EXTRA_DISCOUNT}% off</strong>!
          </p>

          {/* Timer */}
          <div className="bg-gray-900 rounded-lg p-3 mb-3 text-center">
            <p className="text-[9px] uppercase tracking-widest text-gray-400 mb-0.5">
              Extra discount expires in
            </p>
            <div className="flex items-center justify-center gap-1">
              {timeLeft.split(":").map((unit, i) => (
                <div key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-gray-500 text-base font-bold">:</span>}
                  <span className="bg-gray-800 text-white text-xl font-mono font-black px-2.5 py-1 rounded-lg">
                    {unit}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-12 mt-0.5">
              <span className="text-[9px] text-gray-500">MIN</span>
              <span className="text-[9px] text-gray-500">SEC</span>
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="text-sm text-gray-400 line-through">${totalOriginal}</span>
            <span className="text-2xl font-black text-green-700">${totalDiscounted}</span>
            <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {EXTRA_DISCOUNT}% OFF
            </span>
          </div>
          <p className="text-center text-xs text-green-600 font-medium mb-3">
            You save ${savings} with this limited-time offer
          </p>

          {/* CTA */}
          <button
            onClick={handleGoToCheckout}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3 rounded-xl font-bold text-sm transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg"
          >
            Complete Payment Now
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
