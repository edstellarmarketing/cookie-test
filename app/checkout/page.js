"use client";

import { useEffect, useState } from "react";
import { getCookieId } from "@/lib/cookies";
import Link from "next/link";

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [result, setResult] = useState(null); // { success, message } or null
  const [card, setCard] = useState({
    number: "",
    name: "",
    expiry: "",
    cvv: "",
  });

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

  const handlePay = async (e) => {
    e.preventDefault();
    setPaying(true);
    setResult(null);

    const cookieId = getCookieId();
    const results = [];

    for (const item of cart) {
      try {
        const res = await fetch("/api/cart/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cookie_id: cookieId,
            course_slug: item.course_slug,
            course_title: item.metadata?.course_title || item.course_slug,
            price: item.metadata?.price || 0,
            card_number: card.number.replace(/\s/g, ""),
          }),
        });

        const data = await res.json();
        results.push({ slug: item.course_slug, ...data });
      } catch (err) {
        results.push({ slug: item.course_slug, success: false, error: err.message });
      }
    }

    const allSuccess = results.every((r) => r.success);
    if (allSuccess) {
      setResult({
        success: true,
        message: "Payment successful! You are now enrolled.",
      });
    } else {
      const failedMsg = results
        .filter((r) => !r.success)
        .map((r) => r.error || "Payment failed")
        .join("; ");
      setResult({
        success: false,
        message: failedMsg,
      });
    }

    setPaying(false);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center text-gray-400">
        Loading checkout...
      </div>
    );
  }

  if (result?.success) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-10">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Enrollment Confirmed!</h2>
          <p className="text-gray-600 mb-6">{result.message}</p>
          <p className="text-sm text-gray-500 mb-6">
            Total charged: <strong>${total}</strong> (demo — no real charge)
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <Link href="/cart" className="text-blue-600 text-sm hover:underline mb-6 inline-block">
        ← Back to Cart
      </Link>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {cart.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p>No items to checkout.</p>
          <Link href="/" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* Payment Form */}
          <form onSubmit={handlePay} className="md:col-span-3 space-y-5">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="font-semibold text-lg mb-4">Payment Details</h2>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                Demo mode — use any card number. End with <strong>0000</strong> to simulate a declined payment.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name on Card
                  </label>
                  <input
                    type="text"
                    required
                    value={card.name}
                    onChange={(e) => setCard({ ...card, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={card.number}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").replace(/(\d{4})/g, "$1 ").trim();
                      setCard({ ...card, number: val });
                    }}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-mono"
                    placeholder="4242 4242 4242 4242"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={card.expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (val.length >= 2) val = val.slice(0, 2) + "/" + val.slice(2, 4);
                        setCard({ ...card, expiry: val });
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-mono"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={card.cvv}
                      onChange={(e) =>
                        setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none font-mono"
                      placeholder="123"
                    />
                  </div>
                </div>
              </div>
            </div>

            {result && !result.success && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-red-700 text-sm">
                {result.message}
              </div>
            )}

            <button
              type="submit"
              disabled={paying}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-lg transition-colors disabled:opacity-50"
            >
              {paying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `Pay $${total}`
              )}
            </button>
          </form>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-2">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 sticky top-6">
              <h3 className="font-semibold mb-4">Order Summary</h3>
              <div className="space-y-3 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700 capitalize">
                      {item.metadata?.course_title || item.course_slug.replace(/-/g, " ")}
                    </span>
                    <span className="font-medium">${item.metadata?.price || 0}</span>
                  </div>
                ))}
              </div>
              <hr className="my-3" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-700">${total}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
