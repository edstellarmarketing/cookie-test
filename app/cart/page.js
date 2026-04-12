"use client";

import { useEffect, useState } from "react";
import { getCookieId } from "@/lib/cookies";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CartPage() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cookieId = getCookieId();
    if (!cookieId) {
      setLoading(false);
      return;
    }

    fetch(`/api/cart?cookie_id=${encodeURIComponent(cookieId)}`)
      .then((res) => res.json())
      .then((data) => setCart(data.cart || []))
      .catch(() => setCart([]))
      .finally(() => setLoading(false));
  }, []);

  const total = cart.reduce((sum, item) => sum + (item.metadata?.price || 0), 0);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center text-gray-400">
        Loading cart...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link href="/" className="text-blue-600 text-sm hover:underline mb-6 inline-block">
        ← Continue Shopping
      </Link>

      <h1 className="text-3xl font-bold mb-8">Your Cart</h1>

      {cart.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-xl text-gray-400 mb-2">Your cart is empty</p>
          <p className="text-sm text-gray-400 mb-6">
            Browse our courses and add one to get started.
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-8">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5"
              >
                <div>
                  <h3 className="font-semibold text-lg capitalize">
                    {item.metadata?.course_title || item.course_slug.replace(/-/g, " ")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Added {new Date(item.created_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <p className="text-xl font-bold">${item.metadata?.price || 0}</p>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Subtotal ({cart.length} course{cart.length > 1 ? "s" : ""})</span>
              <span className="font-semibold">${total}</span>
            </div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-500">Tax</span>
              <span className="text-gray-500">$0.00</span>
            </div>
            <hr className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-green-700">${total}</span>
            </div>
          </div>

          <button
            onClick={() => router.push("/checkout")}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-lg transition-colors"
          >
            Proceed to Checkout
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            This is a demo checkout. No real payment will be processed.
          </p>
        </>
      )}
    </div>
  );
}
