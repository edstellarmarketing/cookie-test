"use client";

import { useEffect, useState } from "react";

const typeColors = {
  form_submitted: "bg-purple-500",
  first_visit: "bg-green-500",
  visits_5: "bg-green-500",
  visits_15: "bg-green-600",
  visits_30: "bg-green-700",
  multi_course_viewed: "bg-blue-500",
  course_explorer: "bg-blue-700",
  repeat_course_visit: "bg-indigo-500",
  multi_day_visitor: "bg-teal-500",
  weekly_visitor: "bg-teal-700",
  re_engaged_after_gap: "bg-orange-500",
  cart_page_reached: "bg-yellow-600",
  cart_abandoned: "bg-red-400",
  payment_completed: "bg-emerald-600",
};

const tempStyles = {
  hot: "bg-red-600 text-white",
  warm: "bg-amber-500 text-white",
  cold: "bg-blue-500 text-white",
};

export default function MilestoneTimeline({ leadId }) {
  const [milestones, setMilestones] = useState([]);
  const [score, setScore] = useState(0);
  const [temperature, setTemperature] = useState("Cold");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    fetch(`/api/leads/${leadId}/milestones`)
      .then((res) => res.json())
      .then((data) => {
        setMilestones(data.milestones || []);
        setScore(data.score || 0);
        setTemperature(data.temperature || "Cold");
      })
      .catch(() => {
        setMilestones([]);
        setScore(0);
        setTemperature("Cold");
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Milestones</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-700">{score} pts</span>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              tempStyles[temperature.toLowerCase()] || tempStyles.cold
            }`}
          >
            {temperature.toUpperCase()}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-400 text-sm">Loading milestones...</div>
      ) : milestones.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">
          No milestones achieved yet
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {milestones.map((ms) => (
            <div key={ms.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center mt-1">
                <span
                  className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    typeColors[ms.milestone_type] || "bg-gray-400"
                  }`}
                />
                <span className="w-px h-full bg-gray-200" />
              </div>
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800">
                    {ms.milestone_label}
                  </p>
                  <span className="text-xs font-semibold text-green-600 flex-shrink-0">
                    +{ms.points}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{formatDate(ms.achieved_at)}</p>
                {ms.metadata?.course_slug && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded capitalize mt-1 inline-block">
                    {ms.metadata.course_slug.replace(/-/g, " ")}
                  </span>
                )}
                {ms.metadata?.gap_days && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded mt-1 inline-block">
                    {ms.metadata.gap_days}d gap
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
