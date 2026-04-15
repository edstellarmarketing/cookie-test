"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const TRIGGER_LABELS = {
  repeat_course_visit: "Repeated Course Interest",
  re_engaged_after_gap: "Re-engagement",
  lead_went_hot: "Lead Went Hot",
  cart_abandoned: "Cart Abandoned",
};

const TRIGGER_COLORS = {
  repeat_course_visit: "bg-blue-100 text-blue-700",
  re_engaged_after_gap: "bg-purple-100 text-purple-700",
  lead_went_hot: "bg-red-100 text-red-700",
  cart_abandoned: "bg-orange-100 text-orange-700",
};

export default function EmailLogsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
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
    const password = "admin123";
    fetch(`/api/admin/email-logs?password=${encodeURIComponent(password)}`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [authenticated]);

  if (!authenticated) return null;

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Autonomous Email Log</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Every email the AI decided to send — trigger, reasoning, and full content
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Dashboard
            </Link>
            <Link href="/admin/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              All Leads
            </Link>
            <Link href="/admin/banners" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Ad Banners
            </Link>
            <Link href="/admin/settings" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Settings
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
      </div>

      {/* Stats bar */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Object.entries(TRIGGER_LABELS).map(([key, label]) => {
            const count = logs.filter((l) => l.trigger_event === key).length;
            return (
              <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mb-2 ${TRIGGER_COLORS[key]}`}>
                  {label}
                </div>
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-500">emails sent</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading email logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-3">📭</div>
              <div className="text-gray-500 text-sm font-medium">No autonomous emails sent yet</div>
              <div className="text-gray-400 text-xs mt-1">
                Emails will appear here as AI triggers fire based on visitor behavior
              </div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Reasoning</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent At</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{log.leads?.name || "—"}</div>
                        <div className="text-gray-400 text-xs">{log.leads?.email || "—"}</div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TRIGGER_COLORS[log.trigger_event] || "bg-gray-100 text-gray-600"}`}>
                          {TRIGGER_LABELS[log.trigger_event] || log.trigger_event}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <div className="text-gray-800 truncate">{log.subject}</div>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <div className="text-gray-500 text-xs truncate">{log.ai_reasoning}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {formatDate(log.sent_at)}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {expanded === log.id ? "Hide" : "View email"}
                        </button>
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={`${log.id}-body`} className="bg-blue-50 border-b border-blue-100">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Full email body</div>
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white border border-blue-100 rounded-lg p-4 leading-relaxed">
                            {log.body}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Showing last 200 emails · Max 3 per lead · 24-hour cooldown enforced
        </p>
      </div>
    </div>
  );
}
