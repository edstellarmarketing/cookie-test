"use client";

import { useState } from "react";
import { getCookieId } from "@/lib/cookies";

export default function AddToCartButton({ slug, courseTitle, price }) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    const cookieId = getCookieId();

    if (!cookieId) {
      alert("Please fill out the interest form first to add courses to your cart.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie_id: cookieId,
          course_slug: slug,
          course_title: courseTitle,
          price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add to cart");
      }

      setAdded(true);
      setTimeout(() => { window.location.href = "/cart"; }, 800);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (added) {
    return (
      <button
        disabled
        className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold text-lg"
      >
        Added! Redirecting...
      </button>
    );
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50"
    >
      {loading ? "Adding..." : "Add to Cart"}
    </button>
  );
}
