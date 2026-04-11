"use client";

import { useEffect, useState } from "react";

export default function VisitHistory({ lead }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lead) return;
    setLoading(true);
    fetch(`/api/leads/${lead.id}/visits`)
      .then((res) => res.json())
      .then((data) => setVisits(data.visits || []))
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, [lead]);

  if (!lead) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        Click on a lead above to view their visit history
      </div>
    );
  }

  const getPageName = (url) => {
    try {
      const path = new URL(url).pathname;
      if (path === "/") return "Home Page";
      return path
        .split("/")
        .filter(Boolean)
        .map((s) => s.replace(/-/g, " "))
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" > ");
    } catch {
      return url;
    }
  };

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">{lead.name}</h3>
          <p className="text-xs text-gray-500">{lead.email}{lead.phone ? ` | ${lead.phone}` : ""}</p>
        </div>
        <span className="text-xs text-gray-400">{visits.length} visit(s)</span>
      </div>

      {loading ? (
        <div className="text-center py-4 text-gray-400 text-sm">Loading...</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">No visits recorded yet</div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {visits.map((visit) => (
            <div key={visit.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
              <div>
                <p className="font-medium text-blue-700">{getPageName(visit.page_url)}</p>
                <p className="text-xs text-gray-400">{visit.page_title}</p>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                {formatDateTime(visit.visited_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
