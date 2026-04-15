"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const RULES = [
  {
    key: "repeat_course_visit",
    label: "Repeated Course Interest",
    description: "Visitor views the same course 3 or more times",
    color: "blue",
  },
  {
    key: "cart_abandoned",
    label: "Cart Abandoned",
    description: "Visitor adds a course to cart but doesn't complete payment",
    color: "orange",
  },
  {
    key: "lead_went_hot",
    label: "Lead Went Hot",
    description: "Lead score reaches 70+ points indicating strong buying intent",
    color: "red",
  },
  {
    key: "re_engaged_after_gap",
    label: "Re-engagement",
    description: "Visitor returns to the site after being away for 2 or more days",
    color: "purple",
  },
];

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", badge: "bg-orange-100 text-orange-700" },
  red: { bg: "bg-red-50", border: "border-red-200", badge: "bg-red-100 text-red-700" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
};

function Toggle({ enabled, onChange, disabled = false }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${enabled ? "bg-green-500" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function EmailRulesPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [rules, setRules] = useState({
    repeat_course_visit: true,
    cart_abandoned: true,
    lead_went_hot: true,
    re_engaged_after_gap: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      setAuthenticated(true);
    } else {
      router.push("/admin/login");
    }
  }, [router]);

  // Load saved settings
  useEffect(() => {
    if (!authenticated) return;
    fetch("/api/admin/email-settings?password=admin123")
      .then((r) => r.json())
      .then(({ settings }) => {
        if (!settings) return;
        setGlobalEnabled(settings.global_enabled !== false);
        setRules({
          repeat_course_visit: settings.rule_repeat_course_visit !== false,
          cart_abandoned: settings.rule_cart_abandoned !== false,
          lead_went_hot: settings.rule_lead_went_hot !== false,
          re_engaged_after_gap: settings.rule_re_engaged_after_gap !== false,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated]);

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "admin123",
        global_enabled: globalEnabled,
        rule_repeat_course_visit: rules.repeat_course_visit,
        rule_cart_abandoned: rules.cart_abandoned,
        rule_lead_went_hot: rules.lead_went_hot,
        rule_re_engaged_after_gap: rules.re_engaged_after_gap,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!authenticated) return null;

  const activeRuleCount = Object.values(rules).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Email Rules</h1>
            <p className="text-sm text-gray-500 mt-0.5">Control which visitor behaviors trigger autonomous emails</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Dashboard</Link>
            <Link href="/admin/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">All Leads</Link>
            <Link href="/admin/emails" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Email Log</Link>
            <Link href="/admin/settings" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Settings</Link>
            <button onClick={() => { sessionStorage.removeItem("admin_authenticated"); router.push("/admin/login"); }}
              className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg">Logout</button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Loading settings...</div>
        ) : (
          <>
            {/* Global toggle */}
            <div className={`rounded-xl border-2 p-6 transition-colors ${globalEnabled ? "bg-white border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold text-gray-900">Email Automation</h2>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${globalEnabled ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}>
                      {globalEnabled ? "ON" : "OFF"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {globalEnabled
                      ? `Autonomous emails active — ${activeRuleCount} of ${RULES.length} triggers enabled`
                      : "All autonomous emails are paused — no emails will be sent regardless of visitor behavior"}
                  </p>
                </div>
                <Toggle enabled={globalEnabled} onChange={setGlobalEnabled} />
              </div>
            </div>

            {/* Per-rule toggles */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Trigger Rules</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {globalEnabled ? "Toggle individual triggers on or off" : "Global automation is OFF — rules have no effect until you turn it on"}
                </p>
              </div>
              <div className="divide-y divide-gray-100">
                {RULES.map(({ key, label, description, color }) => {
                  const colors = COLOR_MAP[color];
                  const isOn = rules[key];
                  return (
                    <div key={key} className={`flex items-center justify-between px-6 py-5 transition-colors ${!globalEnabled ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOn && globalEnabled ? "bg-green-500" : "bg-gray-300"}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-gray-900">{label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                              {key.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                        </div>
                      </div>
                      <Toggle
                        enabled={isOn}
                        onChange={(val) => setRules((prev) => ({ ...prev, [key]: val }))}
                        disabled={!globalEnabled}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Changes only apply after saving</p>
              <button
                onClick={saveSettings}
                disabled={saving || saved}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  saved
                    ? "bg-green-500 text-white"
                    : "bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
                }`}
              >
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
