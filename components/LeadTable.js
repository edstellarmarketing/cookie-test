"use client";

import { useEffect, useState } from "react";

export default function LeadTable({ onSelectLead, selectedLeadId }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400 text-sm">Loading leads...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No leads yet. Leads will appear here when visitors fill the interest form.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="pb-2 pr-4 font-medium">Name</th>
            <th className="pb-2 pr-4 font-medium">Email</th>
            <th className="pb-2 pr-4 font-medium">Phone</th>
            <th className="pb-2 pr-4 font-medium">Interested In</th>
            <th className="pb-2 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              className={`border-b border-gray-100 cursor-pointer transition-colors ${
                selectedLeadId === lead.id
                  ? "bg-blue-50"
                  : "hover:bg-gray-50"
              }`}
            >
              <td className="py-3 pr-4 font-medium">{lead.name}</td>
              <td className="py-3 pr-4 text-gray-600">{lead.email}</td>
              <td className="py-3 pr-4 text-gray-600">{lead.phone || "-"}</td>
              <td className="py-3 pr-4">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {lead.course_interest?.replace(/-/g, " ") || "-"}
                </span>
              </td>
              <td className="py-3 text-gray-500">{formatDate(lead.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
