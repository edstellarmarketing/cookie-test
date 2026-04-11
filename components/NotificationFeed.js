"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase-client";

export default function NotificationFeed() {
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    const channel = supabase
      .channel("page-visits-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "page_visits" },
        async (payload) => {
          const newVisit = payload.new;

          // Fetch lead details
          const { data: lead } = await supabase
            .from("leads")
            .select("name, email, phone, course_interest")
            .eq("id", newVisit.lead_id)
            .single();

          const notification = {
            id: newVisit.id,
            page_url: newVisit.page_url,
            page_title: newVisit.page_title,
            visited_at: newVisit.visited_at,
            name: lead?.name || "Unknown",
            email: lead?.email || "",
            phone: lead?.phone || "",
            course_interest: lead?.course_interest || "",
            isNew: true,
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 50));

          // Play notification sound
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play();
            }
          } catch {}

          // Remove "new" highlight after 5 seconds
          setTimeout(() => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === notification.id ? { ...n, isNew: false } : n
              )
            );
          }, 5000);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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

  return (
    <div>
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjNjktfPo2I/LlF0lci3j1tFTWuFlLKVc1BNYHyQo5pyVU9ea36LmHZYVlxleouWdFhXXWR6iZV0V1peZ3qJk3JWWl9neoiSclZaX2d6iJJyVlpfZ3qIknFWWmBneoiRcVZaYGd6iJFx" type="audio/wav" />
      </audio>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Live Notifications</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Waiting for visitor activity...
          <br />
          <span className="text-xs">Notifications will appear here in real-time</span>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-lg border transition-all duration-500 ${
                n.isNew
                  ? "bg-yellow-50 border-yellow-300 shadow-md"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{n.name}</p>
                  <p className="text-xs text-gray-500">{n.email}{n.phone ? ` | ${n.phone}` : ""}</p>
                </div>
                <span className="text-xs text-gray-400">{formatTime(n.visited_at)}</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Viewing: <strong>{getPageName(n.page_url)}</strong>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
