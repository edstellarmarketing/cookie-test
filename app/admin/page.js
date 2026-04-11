"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import Link from "next/link";
import SalesIntel from "@/components/SalesIntel";

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeVisitors, setActiveVisitors] = useState(new Map());
  const [connected, setConnected] = useState(false);
  const [totalToday, setTotalToday] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioContextRef = useRef(null);
  const router = useRouter();

  const enableSound = () => {
    // Create AudioContext on user gesture to satisfy browser autoplay policy
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioContextRef.current = ctx;
    setSoundEnabled(true);
  };

  const playNotificationSound = () => {
    if (!soundEnabled || !audioContextRef.current) return;
    try {
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.4);
    } catch {}
  };

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

    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "page_visits" },
        async (payload) => {
          const visit = payload.new;

          const { data: lead } = await supabase
            .from("leads")
            .select("name, email, phone, course_interest")
            .eq("id", visit.lead_id)
            .single();

          const notification = {
            id: visit.id,
            lead_id: visit.lead_id,
            page_url: visit.page_url,
            page_title: visit.page_title,
            visited_at: visit.visited_at,
            name: lead?.name || "Unknown",
            email: lead?.email || "",
            phone: lead?.phone || "",
            course_interest: lead?.course_interest || "",
            isNew: true,
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 100));
          setTotalToday((prev) => prev + 1);

          // Track active visitors — keep latest page per lead
          setActiveVisitors((prev) => {
            const next = new Map(prev);
            next.set(visit.lead_id, notification);
            return next;
          });

          // Remove from "active" after 2 minutes of no new activity
          setTimeout(() => {
            setActiveVisitors((prev) => {
              const next = new Map(prev);
              const current = next.get(visit.lead_id);
              if (current && current.id === visit.id) {
                next.delete(visit.lead_id);
              }
              return next;
            });
          }, 120000);

          // Play sound
          playNotificationSound();

          // Remove "new" highlight after 8 seconds
          setTimeout(() => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id ? { ...n, isNew: false } : n
              )
            );
          }, 8000);
        }
      )
      .subscribe((status, err) => {
        console.log("Realtime status:", status, err);
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authenticated]);

  // Polling fallback — fetch recent visits every 10 seconds
  const lastPollIdRef = useRef(0);
  useEffect(() => {
    if (!authenticated) return;

    const poll = async () => {
      try {
        const { data: visits } = await supabase
          .from("page_visits")
          .select("id, lead_id, page_url, page_title, visited_at")
          .order("id", { ascending: false })
          .limit(5);

        if (!visits || visits.length === 0) return;

        const maxId = Math.max(...visits.map((v) => v.id));
        if (lastPollIdRef.current === 0) {
          lastPollIdRef.current = maxId;
          return;
        }

        const newVisits = visits.filter((v) => v.id > lastPollIdRef.current);
        if (newVisits.length === 0) return;
        lastPollIdRef.current = maxId;

        for (const visit of newVisits.reverse()) {
          const { data: lead } = await supabase
            .from("leads")
            .select("name, email, phone, course_interest")
            .eq("id", visit.lead_id)
            .single();

          const notification = {
            id: visit.id,
            lead_id: visit.lead_id,
            page_url: visit.page_url,
            page_title: visit.page_title,
            visited_at: visit.visited_at,
            name: lead?.name || "Unknown",
            email: lead?.email || "",
            phone: lead?.phone || "",
            course_interest: lead?.course_interest || "",
            isNew: true,
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === notification.id)) return prev;
            return [notification, ...prev].slice(0, 100);
          });
          setTotalToday((prev) => prev + 1);

          setActiveVisitors((prev) => {
            const next = new Map(prev);
            next.set(visit.lead_id, notification);
            return next;
          });

          setTimeout(() => {
            setActiveVisitors((prev) => {
              const next = new Map(prev);
              const current = next.get(visit.lead_id);
              if (current && current.id === visit.id) next.delete(visit.lead_id);
              return next;
            });
          }, 120000);

          playNotificationSound();

          setTimeout(() => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === notification.id ? { ...n, isNew: false } : n))
            );
          }, 8000);
        }
      } catch {}
    };

    const interval = setInterval(poll, 10000);
    poll();
    return () => clearInterval(interval);
  }, [authenticated, soundEnabled]);

  const getPageName = (url) => {
    try {
      const path = new URL(url).pathname;
      if (path === "/") return "Home Page";
      return path
        .split("/")
        .filter(Boolean)
        .map((s) => s.replace(/-/g, " "))
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" / ");
    } catch {
      return url;
    }
  };

  const timeAgo = (timestamp) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  const activeList = Array.from(activeVisitors.values());

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Live Dashboard</h1>
          <p className="text-gray-500 text-sm">Real-time visitor monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
                : "border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {soundEnabled ? "Sound ON" : "Sound OFF"}
          </button>
          <Link
            href="/admin/leads"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            View All Leads
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

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{activeList.length}</p>
          <p className="text-xs text-gray-500 mt-1">Active Right Now</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{totalToday}</p>
          <p className="text-xs text-gray-500 mt-1">Page Views This Session</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <span className={`w-3 h-3 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
            <p className="text-sm font-medium text-gray-700">{connected ? "Live" : "Polling (10s)"}</p>
          </div>
          <p className="text-xs text-gray-500 mt-1">{connected ? "Real-time WebSocket" : "Auto-refresh active"}</p>
        </div>
      </div>

      {/* Active Visitors - Prominent Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Currently Viewing</h2>
        {activeList.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            <p className="text-gray-400">No active visitors right now</p>
            <p className="text-xs text-gray-300 mt-1">Visitors appear here when they browse your site</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeList.map((v) => (
              <div
                key={v.lead_id}
                className="bg-green-50 border-2 border-green-300 rounded-xl p-5 shadow-sm animate-fade-in"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-semibold text-base">{v.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{timeAgo(v.visited_at)}</span>
                </div>

                <div className="bg-white rounded-lg p-3 mb-3 border border-green-200">
                  <p className="text-xs text-gray-400 mb-0.5">Currently viewing</p>
                  <p className="text-sm font-medium text-blue-700">{getPageName(v.page_url)}</p>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="text-gray-700">
                    <span className="text-gray-400">Email:</span> {v.email}
                  </p>
                  {v.phone && (
                    <p className="text-gray-700">
                      <span className="text-gray-400">Phone:</span> {v.phone}
                    </p>
                  )}
                  {v.course_interest && (
                    <p className="text-gray-700">
                      <span className="text-gray-400">Interest:</span>{" "}
                      <span className="capitalize">{v.course_interest.replace(/-/g, " ")}</span>
                    </p>
                  )}
                </div>

                <SalesIntel
                  leadId={v.lead_id}
                  leadName={v.name}
                  currentPage={getPageName(v.page_url)}
                  compact
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {notifications.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Waiting for visitor activity...
            <br />
            <span className="text-xs">Page views will appear here in real-time</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-4 py-3 px-2 transition-all duration-700 ${
                  n.isNew ? "bg-yellow-50 -mx-2 px-4 rounded-lg" : ""
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.isNew ? "bg-yellow-500" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{n.name}</span>
                    <span className="text-gray-400"> viewed </span>
                    <span className="font-medium text-blue-600">{getPageName(n.page_url)}</span>
                  </p>
                  <p className="text-xs text-gray-400">{n.email}{n.phone ? ` | ${n.phone}` : ""}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(n.visited_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
