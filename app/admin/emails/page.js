"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
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

const STATUS_CONFIG = {
  sent: { label: "Sent", class: "bg-green-100 text-green-700", dot: "bg-green-500" },
  failed: { label: "Failed", class: "bg-red-100 text-red-700", dot: "bg-red-500" },
  skipped: { label: "AI Skipped", class: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  blocked_cap: { label: "Cap Reached", class: "bg-orange-100 text-orange-700", dot: "bg-orange-400" },
  blocked_cooldown: { label: "Cooldown", class: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
};

export default function EmailLogsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [liveCount, setLiveCount] = useState(0);
  const router = useRouter();
  const channelRef = useRef(null);

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") setAuthenticated(true);
    else router.push("/admin/login");
  }, [router]);

  // Initial load
  useEffect(() => {
    if (!authenticated) return;
    supabase
      .from("email_logs")
      .select("id, trigger_event, subject, body, ai_reasoning, error_message, status, sent_at, lead_id, leads(name, email)")
      .order("sent_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [authenticated]);

  // Realtime subscription — new rows appear instantly
  useEffect(() => {
    if (!authenticated) return;

    channelRef.current = supabase
      .channel("email_logs_live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "email_logs" }, async (payload) => {
        // Fetch the full row with lead join since payload won't have the join
        const { data } = await supabase
          .from("email_logs")
          .select("id, trigger_event, subject, body, ai_reasoning, error_message, status, sent_at, lead_id, leads(name, email)")
          .eq("id", payload.new.id)
          .single();

        if (data) {
          setLogs((prev) => [data, ...prev]);
          setLiveCount((c) => c + 1);
        }
      })
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [authenticated]);

  if (!authenticated) return null;

  const formatDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const sentLogs = logs.filter((l) => l.status === "sent");
  const failedLogs = logs.filter((l) => l.status === "failed");
  const skippedLogs = logs.filter((l) => l.status === "skipped");
  const blockedLogs = logs.filter((l) => l.status?.startsWith("blocked"));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Autonomous Email Log</h1>
              <p className="text-sm text-gray-500 mt-0.5">Every AI trigger evaluation — sent, skipped, blocked, and failed</p>
            </div>
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Dashboard</Link>
            <Link href="/admin/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">All Leads</Link>
            <Link href="/admin/banners" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Ad Banners</Link>
            <Link href="/admin/email-rules" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Email Rules</Link>
            <Link href="/admin/settings" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Settings</Link>
            <button onClick={() => { sessionStorage.removeItem("admin_authenticated"); router.push("/admin/login"); }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg">Logout</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{sentLogs.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Failed</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{failedLogs.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Skipped</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{skippedLogs.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blocked</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{blockedLogs.length}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-3">📭</div>
              <div className="text-gray-500 text-sm font-medium">No trigger evaluations yet</div>
              <div className="text-gray-400 text-xs mt-1">All AI decisions will appear here in real time as they happen</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lead</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trigger</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subject / Reason</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const statusCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.skipped;
                  return (
                    <>
                      <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.class}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
                            {statusCfg.label}
                          </span>
                        </td>
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
                          {log.status === "sent" ? (
                            <div className="text-gray-800 truncate">{log.subject}</div>
                          ) : (
                            <div className="text-gray-500 text-xs truncate italic">
                              {log.error_message || log.ai_reasoning || "—"}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(log.sent_at)}</td>
                        <td className="px-5 py-3">
                          {(log.status === "sent" || log.status === "failed") && (
                            <button onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                              {expanded === log.id ? "Hide" : "View"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr key={`${log.id}-body`} className="bg-blue-50 border-b border-blue-100">
                          <td colSpan={6} className="px-5 py-4">
                            {log.status === "failed" && (
                              <div className="mb-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                Error: {log.error_message}
                              </div>
                            )}
                            {log.body && (
                              <>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email body</div>
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans bg-white border border-blue-100 rounded-lg p-4 leading-relaxed">{log.body}</pre>
                              </>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          Updates in real time · Max 3 sent emails per lead · 24hr cooldown (cart abandoned bypasses cooldown)
        </p>
      </div>
    </div>
  );
}
