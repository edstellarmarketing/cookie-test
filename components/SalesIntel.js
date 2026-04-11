"use client";

import { useState } from "react";

const tempStyles = {
  hot: { bg: "bg-red-50", border: "border-red-300", badge: "bg-red-600 text-white" },
  warm: { bg: "bg-amber-50", border: "border-amber-300", badge: "bg-amber-500 text-white" },
  cold: { bg: "bg-blue-50", border: "border-blue-300", badge: "bg-blue-500 text-white" },
};

function IntelCard({ data, signals, temperature, onRefresh, refreshing }) {
  const colors = tempStyles[temperature] || tempStyles.warm;

  return (
    <div className="space-y-3">
      {/* Temperature + Signals */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors.badge}`}>
            {temperature?.toUpperCase()}
          </span>
          <span className="text-xs text-gray-600">{data.temperature_reason}</span>
        </div>
        <button onClick={onRefresh} disabled={refreshing} className="text-xs text-gray-400 hover:text-gray-600">
          {refreshing ? "..." : "Refresh"}
        </button>
      </div>

      {/* Signal Pills */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{signals.total_visits} visits</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{signals.unique_days}d active</span>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{signals.courses_viewed?.length || 0} courses</span>
        {signals.re_engaged && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Re-engaged</span>
        )}
        {signals.minutes_since_last_visit < 5 && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium animate-pulse">Online NOW</span>
        )}
      </div>

      {/* Opening Line */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-wider text-purple-400 font-semibold mb-1">Opening Line</p>
        <p className="text-sm text-purple-900 italic">"{data.opening_line}"</p>
      </div>

      {/* Talking Points */}
      <div>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5">Talking Points</p>
        <ul className="space-y-1">
          {(data.talking_points || []).map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-500 mt-0.5 flex-shrink-0">&#8226;</span>
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Offer + Timing + Watch Out */}
      <div className="grid grid-cols-1 gap-2">
        <div className="bg-green-50 border border-green-200 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-green-500 font-semibold">Suggested Offer</p>
          <p className="text-sm text-gray-700 mt-0.5">{data.suggested_offer}</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-blue-500 font-semibold">Best Time</p>
            <p className="text-sm text-gray-700 mt-0.5">{data.best_time}</p>
          </div>
          <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Watch Out</p>
            <p className="text-sm text-gray-700 mt-0.5">{data.watch_out}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SalesIntel({ leadId, leadName, currentPage, compact }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const fetchIntel = async (force) => {
    if (data && !force) {
      setOpen(!open);
      return;
    }

    setLoading(true);
    setError("");
    setOpen(true);

    try {
      const res = await fetch("/api/ai/sales-intel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, current_page: currentPage }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to get AI intel");
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const button = (
    <button
      onClick={() => fetchIntel(false)}
      disabled={loading}
      className={`${compact ? "w-full text-xs py-1.5" : "text-sm py-2 px-5"} bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2`}
    >
      {loading ? (
        <>
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Analyzing...
        </>
      ) : data ? (
        open ? "Hide Intel" : "Show Intel"
      ) : (
        "Get AI Sales Intel"
      )}
    </button>
  );

  if (compact) {
    return (
      <div className="mt-3">
        {button}
        {open && data && (
          <div className="mt-2">
            <IntelCard
              data={data.intel}
              signals={data.signals}
              temperature={data.temperature}
              onRefresh={() => fetchIntel(true)}
              refreshing={loading}
            />
          </div>
        )}
        {open && error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">AI Sales Intel</h2>
          {leadName && <p className="text-xs text-gray-400">for {leadName}</p>}
        </div>
        {button}
      </div>

      {!open && !loading && !data && (
        <div className="text-center py-6 text-gray-400 text-sm">
          Click "Get AI Sales Intel" for guidance on how to approach this lead
        </div>
      )}

      {open && data && (
        <IntelCard
          data={data.intel}
          signals={data.signals}
          temperature={data.temperature}
          onRefresh={() => fetchIntel(true)}
          refreshing={loading}
        />
      )}

      {open && error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={() => fetchIntel(true)} className="text-xs text-blue-600 hover:underline mt-2">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
