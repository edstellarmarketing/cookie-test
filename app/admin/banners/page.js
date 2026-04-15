"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COURSES = [
  { slug: "advanced-python", title: "Advanced Python", price: 799 },
  { slug: "cloud-devops", title: "Cloud DevOps", price: 899 },
  { slug: "data-science", title: "Data Science & ML", price: 999 },
  { slug: "full-stack-web", title: "Full-Stack Web Development", price: 849 },
  { slug: "cybersecurity-fundamentals", title: "Cybersecurity Fundamentals", price: 949 },
  { slug: "mobile-app-development", title: "Mobile App Development", price: 879 },
  { slug: "ai-prompt-engineering", title: "AI & Prompt Engineering", price: 699 },
  { slug: "blockchain-web3", title: "Blockchain & Web3", price: 1099 },
  { slug: "ui-ux-design", title: "UI/UX Design", price: 649 },
  { slug: "database-engineering", title: "Database Engineering", price: 849 },
  { slug: "system-design", title: "System Design & Architecture", price: 1199 },
  { slug: "aws-solutions-architect", title: "AWS Solutions Architect", price: 999 },
  { slug: "data-analytics-power-bi", title: "Data Analytics with Power BI", price: 599 },
  { slug: "java-spring-boot", title: "Java & Spring Boot", price: 899 },
];

const SCENARIOS = [
  {
    key: "frequent_visitor",
    name: "Frequent Visitor",
    description: "Visitor viewed this course 3 or more times",
    icon: "&#128293;",
    color: "red",
    defaults: { offer_text: "We see you love this course!", discount_percent: 20, timer_hours: 4, cta_text: "Enroll Now — Limited Time!", priority: 30 },
  },
  {
    key: "cart_abandoned",
    name: "Cart Abandoned",
    description: "Added to cart but didn't pay within 30 minutes",
    icon: "&#128722;",
    color: "orange",
    defaults: { offer_text: "Your cart is waiting!", discount_percent: 15, timer_hours: 1, cta_text: "Complete Purchase", priority: 50 },
  },
  {
    key: "re_engagement",
    name: "Re-engagement",
    description: "Returned after 2+ days away",
    icon: "&#128075;",
    color: "purple",
    defaults: { offer_text: "Welcome back! Here's a treat.", discount_percent: 12, timer_hours: 6, cta_text: "Grab Your Offer", priority: 20 },
  },
  {
    key: "first_visit",
    name: "First Visit Hook",
    description: "First time visiting this course page",
    icon: "&#11088;",
    color: "blue",
    defaults: { offer_text: "New here? Start with a discount!", discount_percent: 5, timer_hours: 2, cta_text: "Get Started", priority: 5 },
  },
  {
    key: "course_explorer",
    name: "Course Explorer",
    description: "Browsed 3+ different courses, now on this one",
    icon: "&#128269;",
    color: "indigo",
    defaults: { offer_text: "We think this one's perfect for you!", discount_percent: 8, timer_hours: 3, cta_text: "Enroll Now", priority: 15 },
  },
  {
    key: "checkout_dropout",
    name: "Checkout Dropout",
    description: "Started checkout but didn't complete payment",
    icon: "&#128680;",
    color: "rose",
    defaults: { offer_text: "Last chance — finish your enrollment!", discount_percent: 20, timer_hours: 0.5, cta_text: "Pay Now — Don't Miss Out", priority: 60 },
  },
];

const colorMap = {
  red: { border: "border-red-300", bg: "bg-red-50", activeBg: "bg-red-600", badge: "bg-red-100 text-red-700" },
  orange: { border: "border-orange-300", bg: "bg-orange-50", activeBg: "bg-orange-600", badge: "bg-orange-100 text-orange-700" },
  purple: { border: "border-purple-300", bg: "bg-purple-50", activeBg: "bg-purple-600", badge: "bg-purple-100 text-purple-700" },
  blue: { border: "border-blue-300", bg: "bg-blue-50", activeBg: "bg-blue-600", badge: "bg-blue-100 text-blue-700" },
  indigo: { border: "border-indigo-300", bg: "bg-indigo-50", activeBg: "bg-indigo-600", badge: "bg-indigo-100 text-indigo-700" },
  rose: { border: "border-rose-300", bg: "bg-rose-50", activeBg: "bg-rose-600", badge: "bg-rose-100 text-rose-700" },
};

export default function BannerManagementPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(COURSES[0].slug);
  const [bannerConfigs, setBannerConfigs] = useState({});
  const [saving, setSaving] = useState("");
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

  // Fetch all banners
  useEffect(() => {
    if (!authenticated) return;
    setLoading(true);
    fetch("/api/banners")
      .then((r) => r.json())
      .then((data) => {
        const map = {};
        for (const b of data.banners || []) {
          const key = `${b.course_slug}__${b.scenario}`;
          map[key] = b;
        }
        setBannerConfigs(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authenticated]);

  const getConfig = (courseSlug, scenarioKey) => {
    const key = `${courseSlug}__${scenarioKey}`;
    const scenario = SCENARIOS.find((s) => s.key === scenarioKey);
    return bannerConfigs[key] || {
      course_slug: courseSlug,
      scenario: scenarioKey,
      is_active: false,
      ...scenario.defaults,
    };
  };

  const updateField = (courseSlug, scenarioKey, field, value) => {
    const key = `${courseSlug}__${scenarioKey}`;
    setBannerConfigs((prev) => ({
      ...prev,
      [key]: { ...getConfig(courseSlug, scenarioKey), [field]: value },
    }));
  };

  const saveConfig = async (courseSlug, scenarioKey) => {
    const saveKey = `${courseSlug}__${scenarioKey}`;
    setSaving(saveKey);
    const config = getConfig(courseSlug, scenarioKey);
    try {
      await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch {}
    setSaving("");
  };

  const toggleScenario = async (courseSlug, scenarioKey) => {
    const config = getConfig(courseSlug, scenarioKey);
    const newActive = !config.is_active;
    updateField(courseSlug, scenarioKey, "is_active", newActive);
    const saveKey = `${courseSlug}__${scenarioKey}`;
    setSaving(saveKey);
    try {
      await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, is_active: newActive }),
      });
    } catch {}
    setSaving("");
  };

  const activateAll = async () => {
    for (const sc of SCENARIOS) {
      const config = getConfig(selectedCourse, sc.key);
      updateField(selectedCourse, sc.key, "is_active", true);
      await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, is_active: true }),
      }).catch(() => {});
    }
  };

  const deactivateAll = async () => {
    for (const sc of SCENARIOS) {
      const config = getConfig(selectedCourse, sc.key);
      updateField(selectedCourse, sc.key, "is_active", false);
      await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, is_active: false }),
      }).catch(() => {});
    }
  };

  const course = COURSES.find((c) => c.slug === selectedCourse);
  const activeCount = SCENARIOS.filter((sc) => getConfig(selectedCourse, sc.key).is_active).length;

  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ad Banner Management</h1>
          <p className="text-gray-500 text-sm">Configure dynamic offer banners per course and scenario</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            Dashboard
          </Link>
          <Link href="/admin/leads" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            Leads
          </Link>
          <Link href="/admin/emails" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            Emails
          </Link>
          <Link href="/admin/settings" className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
            Settings
          </Link>
          <button onClick={() => { sessionStorage.removeItem("admin_authenticated"); router.push("/admin/login"); }}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-3 py-1.5 rounded-lg">
            Logout
          </button>
        </div>
      </div>

      {/* Course Selector + Bulk Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Select Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="text-sm border border-gray-300 px-4 py-2 rounded-lg bg-white min-w-[280px]"
              >
                {COURSES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title} (${c.price})</option>
                ))}
              </select>
            </div>
            <div className="pt-5">
              <span className="text-sm text-gray-500">
                <strong className="text-gray-700">{activeCount}</strong> of {SCENARIOS.length} scenarios active
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <button
              onClick={activateAll}
              className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Activate All
            </button>
            <button
              onClick={deactivateAll}
              className="text-xs bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Deactivate All
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading banner configs...</div>
      ) : (
        <div className="space-y-4">
          {SCENARIOS.map((sc) => {
            const config = getConfig(selectedCourse, sc.key);
            const colors = colorMap[sc.color] || colorMap.blue;
            const isSaving = saving === `${selectedCourse}__${sc.key}`;
            const discounted = Math.round(course.price * (1 - (config.discount_percent || 10) / 100));

            return (
              <div
                key={sc.key}
                className={`border-2 rounded-xl p-5 transition-colors ${
                  config.is_active ? `${colors.border} ${colors.bg}` : "border-gray-200 bg-white"
                }`}
              >
                {/* Scenario Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleScenario(selectedCourse, sc.key)}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                        config.is_active ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          config.is_active ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span dangerouslySetInnerHTML={{ __html: sc.icon }} />
                        <h3 className="font-semibold">{sc.name}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors.badge}`}>
                          Priority: {config.priority || sc.defaults.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{sc.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      config.is_active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"
                    }`}>
                      {config.is_active ? "ACTIVE" : "OFF"}
                    </span>
                    {config.is_active && (
                      <p className="text-xs text-gray-500 mt-1">
                        ${course.price} → <strong className="text-green-700">${discounted}</strong>
                        {" "}({config.discount_percent}% off, {config.timer_hours}h timer)
                      </p>
                    )}
                  </div>
                </div>

                {/* Config Fields (only when active) */}
                {config.is_active && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-200/50">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Offer Headline</label>
                      <input
                        type="text"
                        value={config.offer_text || ""}
                        onChange={(e) => updateField(selectedCourse, sc.key, "offer_text", e.target.value)}
                        className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                      <input
                        type="number" min="1" max="90"
                        value={config.discount_percent || 10}
                        onChange={(e) => updateField(selectedCourse, sc.key, "discount_percent", parseInt(e.target.value) || 10)}
                        className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Timer (hours)</label>
                      <input
                        type="number" min="0.5" max="48" step="0.5"
                        value={config.timer_hours || 4}
                        onChange={(e) => updateField(selectedCourse, sc.key, "timer_hours", parseFloat(e.target.value) || 4)}
                        className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">CTA Button</label>
                      <input
                        type="text"
                        value={config.cta_text || ""}
                        onChange={(e) => updateField(selectedCourse, sc.key, "cta_text", e.target.value)}
                        className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={() => saveConfig(selectedCourse, sc.key)}
                        disabled={isSaving}
                        className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* How It Works */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mt-6">
        <h3 className="font-semibold mb-3">How Banner Scenarios Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
          <div className="flex gap-2">
            <span className="text-gray-400 flex-shrink-0">1.</span>
            <span>When a visitor lands on a course page, the system checks all <strong>active</strong> scenarios for that course.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 flex-shrink-0">2.</span>
            <span>Each scenario evaluates whether the visitor's behavior matches its trigger condition.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 flex-shrink-0">3.</span>
            <span>If multiple scenarios match, the one with the <strong>highest priority</strong> is shown.</span>
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400 flex-shrink-0">4.</span>
            <span>The offer banner appears with a countdown timer. After expiry, a <strong>24-hour cooldown</strong> begins.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
