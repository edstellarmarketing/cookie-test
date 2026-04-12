"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VisitHistory from "@/components/VisitHistory";
import MilestoneTimeline from "@/components/MilestoneTimeline";
import SalesIntel from "@/components/SalesIntel";

export default function LeadsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      setAuthenticated(true);
    } else {
      router.push("/admin/login");
    }
  }, [router]);

  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/leads")
      .then((res) => res.json())
      .then((data) => {
        // Sort by lead_score descending (hottest leads first)
        const sorted = (data.leads || []).sort(
          (a, b) => (b.lead_score || 0) - (a.lead_score || 0)
        );
        setLeads(sorted);
      })
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  }, [authenticated]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">All Leads</h1>
          <p className="text-gray-500 text-sm">{leads.length} total lead(s)</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Live Dashboard
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem("admin_authenticated");
              router.push("/admin/login");
            }}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leads Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No leads yet. Leads appear here when visitors fill the interest form.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-gray-200 text-left text-gray-500">
                    <th className="pb-3 pr-4 font-medium">#</th>
                    <th className="pb-3 pr-4 font-medium">Name</th>
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Phone</th>
                    <th className="pb-3 pr-4 font-medium">Interested In</th>
                    <th className="pb-3 pr-4 font-medium">Score</th>
                    <th className="pb-3 pr-4 font-medium">Temperature</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, index) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedLead?.id === lead.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="py-3 pr-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 pr-4 font-medium">{lead.name}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        <a href={`mailto:${lead.email}`} className="hover:text-blue-600 hover:underline">
                          {lead.email}
                        </a>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">
                        {lead.phone ? (
                          <a href={`tel:${lead.phone}`} className="hover:text-blue-600 hover:underline">
                            {lead.phone}
                          </a>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full capitalize">
                          {lead.course_interest?.replace(/-/g, " ") || "-"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-semibold text-gray-700">{lead.lead_score || 0}</td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const temp = (lead.lead_temperature || "Cold").toLowerCase();
                          const styles = {
                            hot: "bg-red-600 text-white",
                            warm: "bg-amber-500 text-white",
                            cold: "bg-blue-500 text-white",
                          };
                          return (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${styles[temp] || styles.cold}`}>
                              {(lead.lead_temperature || "Cold").toUpperCase()}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 text-gray-500 whitespace-nowrap">{formatDate(lead.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Visit History + AI Intel Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Visit History</h2>
            <VisitHistory lead={selectedLead} />
          </div>

          {selectedLead && (
            <MilestoneTimeline
              key={`ms-${selectedLead.id}`}
              leadId={selectedLead.id}
            />
          )}

          {selectedLead && (
            <SalesIntel
              key={selectedLead.id}
              leadId={selectedLead.id}
              leadName={selectedLead.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}
