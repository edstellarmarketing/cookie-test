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

export default function SettingsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [copied, setCopied] = useState("");
  const [origin, setOrigin] = useState("https://your-app.com");
  const [banners, setBanners] = useState({});
  const [savingBanner, setSavingBanner] = useState("");
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      setAuthenticated(true);
      setOrigin(window.location.origin);
      // Fetch existing banner configs
      fetch("/api/banners")
        .then((r) => r.json())
        .then((data) => {
          const map = {};
          for (const b of data.banners || []) {
            map[b.course_slug] = b;
          }
          setBanners(map);
        })
        .catch(() => {});
    } else {
      router.push("/admin/login");
    }
  }, [router]);

  const embedCode = `<script src="${origin}/tracker.js" data-host="${origin}"></script>`;

  const inlineCode = `<script>
(function(){
  var s = document.createElement("script");
  s.src = "${origin}/tracker.js";
  s.setAttribute("data-host", "${origin}");
  document.head.appendChild(s);
})();
</script>`;

  const leadCaptureFormCode = `<form id="contact-form">
  <input type="text" id="name" placeholder="Full Name" required />
  <input type="email" id="email" placeholder="Email" required />
  <input type="tel" id="phone" placeholder="Phone (optional)" />
  <button type="submit">Submit</button>
</form>

<script>
document.getElementById("contact-form")
  .addEventListener("submit", function(e) {
    e.preventDefault();

    window.CookieTracker.captureLead({
      name:  document.getElementById("name").value,
      email: document.getElementById("email").value,
      phone: document.getElementById("phone").value,
      course_interest: "advanced-python" // optional
    }).then(function(result) {
      alert("Thanks! We will be in touch.");
    });
});
</script>`;

  const leadCaptureCode = `// Call this from your form's submit handler
window.CookieTracker.captureLead({
  name: "John Doe",
  email: "john@example.com",
  phone: "+1 234 567 8900",       // optional
  course_interest: "advanced-python" // optional
}).then(function(result) {
  console.log("Lead captured:", result);
});`;

  const getVisitorCode = `// Get the current visitor's tracking ID
var visitorId = window.CookieTracker.getVisitorId();
console.log("Visitor ID:", visitorId);`;

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(""), 2000);
    });
  };

  const getBannerConfig = (slug) => {
    return banners[slug] || {
      course_slug: slug,
      is_active: false,
      offer_text: "Limited Time Offer!",
      discount_percent: 10,
      cta_text: "Enroll Now",
    };
  };

  const updateBannerField = (slug, field, value) => {
    setBanners((prev) => ({
      ...prev,
      [slug]: { ...getBannerConfig(slug), [field]: value },
    }));
  };

  const saveBanner = async (slug) => {
    setSavingBanner(slug);
    try {
      const config = getBannerConfig(slug);
      await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch {}
    setSavingBanner("");
  };

  const toggleBanner = async (slug) => {
    const config = getBannerConfig(slug);
    const newActive = !config.is_active;
    updateBannerField(slug, "is_active", newActive);
    setSavingBanner(slug);
    try {
      await fetch("/api/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, is_active: newActive }),
      });
    } catch {}
    setSavingBanner("");
  };

  if (!authenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <p className="text-gray-400">Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500 text-sm">
            Embed tracking code on any website to monitor visitor behavior
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Live Dashboard
          </Link>
          <Link
            href="/admin/leads"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            All Leads
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

      <div className="space-y-6">
        {/* Step 1: Embed Code */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">
                <span className="text-blue-600 mr-2">1.</span>Embed Tracking Code
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add this script tag to every page you want to track. Place it just before the closing{" "}
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">&lt;/body&gt;</code> tag.
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono">
              {embedCode}
            </pre>
            <button
              onClick={() => copyToClipboard(embedCode, "embed")}
              className={`absolute top-2 right-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                copied === "embed"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {copied === "embed" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              <strong>How it works:</strong> The script automatically generates a unique visitor ID cookie,
              tracks every page view, and supports single-page applications (SPA).
              No additional configuration needed — just paste and go.
            </p>
          </div>
        </div>

        {/* Step 1b: Inline Alternative */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            <span className="text-gray-400 mr-2">1b.</span>Inline Alternative
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            If you can only inject inline scripts (e.g., via a tag manager), use this version instead:
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono whitespace-pre-wrap">
              {inlineCode}
            </pre>
            <button
              onClick={() => copyToClipboard(inlineCode, "inline")}
              className={`absolute top-2 right-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                copied === "inline"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {copied === "inline" ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* How It Works — Visual Explanation */}
        <div className="bg-white border-2 border-indigo-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            <span className="text-indigo-600 mr-2">&#9432;</span>How It Works — The Full Picture
          </h2>

          <div className="space-y-6">
            {/* Timeline */}
            <div className="space-y-4">
              {/* Phase 1 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                  <span className="w-0.5 flex-1 bg-gray-200 mt-1" />
                </div>
                <div className="pb-4">
                  <h3 className="font-semibold text-gray-900">Visitor arrives on your external website</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    The tracking script auto-creates a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">visitor_id</code> cookie
                    in their browser. Every page they visit is silently sent to your tracker.
                  </p>
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-600">
                    Cookie set: visitor_id = a3f8b2c1-...<br />
                    Tracking: /products, /about, /pricing, /contact
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                  <span className="w-0.5 flex-1 bg-gray-200 mt-1" />
                </div>
                <div className="pb-4">
                  <h3 className="font-semibold text-gray-900">Anonymous lead is auto-created</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    You don't know WHO the visitor is yet, but the system creates a placeholder lead and logs all their page visits.
                    You can already see them browsing in the admin dashboard.
                  </p>
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white">COLD</span>
                      <span className="font-medium">Anonymous</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500 text-xs">5 pts</span>
                    </div>
                    <p className="text-xs text-gray-500">Email: pending@unknown</p>
                    <p className="text-xs text-gray-500">Visited: /products, /about, /pricing, /contact</p>
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                  <span className="w-0.5 flex-1 bg-gray-200 mt-1" />
                </div>
                <div className="pb-4">
                  <h3 className="font-semibold text-gray-900">Visitor fills your form — <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">captureLead()</code> is called</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    When the visitor submits a contact/inquiry form on your site, you call <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">CookieTracker.captureLead()</code> with
                    their name, email, and phone. This <strong>upgrades</strong> the anonymous lead to a real person.
                  </p>
                  <p className="text-sm text-green-700 font-medium mt-2">
                    All their past anonymous page visits are automatically linked — nothing is lost.
                  </p>
                </div>
              </div>

              {/* Phase 4 */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Lead is now fully tracked with identity</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    The admin dashboard shows the lead with their real name, email, complete browsing history,
                    milestone score, temperature, and AI sales intelligence.
                  </p>
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white">WARM</span>
                      <span className="font-medium">John Doe</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500 text-xs">35 pts</span>
                    </div>
                    <p className="text-xs text-gray-500">Email: john@example.com | Phone: +1 234 567 8900</p>
                    <p className="text-xs text-gray-500">Visited: /products, /about, /pricing, /contact (all preserved)</p>
                    <p className="text-xs text-green-600 font-medium mt-1">Milestones: form_submitted, first_visit, multi_page_viewer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Lead Capture — Full Form Example */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            <span className="text-blue-600 mr-2">2.</span>Capture Leads — Full Form Example
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Add this complete example to your external website. When a visitor submits the form,
            their anonymous browsing history is linked to their real identity.
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono whitespace-pre-wrap">
              {leadCaptureFormCode}
            </pre>
            <button
              onClick={() => copyToClipboard(leadCaptureFormCode, "form")}
              className={`absolute top-2 right-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                copied === "form"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {copied === "form" ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-4 bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="text-xs text-purple-800">
              <strong>Already have a form?</strong> You don't need to use this HTML. Just add the
              {" "}<code className="bg-purple-100 px-1 rounded">CookieTracker.captureLead()</code> call
              inside your existing form's submit handler with the field values from your form.
            </p>
          </div>
        </div>

        {/* Step 2b: JS-only API */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            <span className="text-gray-400 mr-2">2b.</span>JS-Only API (For Custom Integrations)
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            If you just need the JavaScript call without the form HTML:
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono whitespace-pre-wrap">
              {leadCaptureCode}
            </pre>
            <button
              onClick={() => copyToClipboard(leadCaptureCode, "lead")}
              className={`absolute top-2 right-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                copied === "lead"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {copied === "lead" ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Step 3: Get Visitor ID */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            <span className="text-blue-600 mr-2">3.</span>Get Visitor ID (Optional)
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            Retrieve the current visitor's tracking ID for custom integrations.
          </p>
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-sm overflow-x-auto font-mono whitespace-pre-wrap">
              {getVisitorCode}
            </pre>
            <button
              onClick={() => copyToClipboard(getVisitorCode, "visitor")}
              className={`absolute top-2 right-2 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                copied === "visitor"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {copied === "visitor" ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Quick Start Guide</h2>
          <ol className="space-y-4 text-sm text-blue-900">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <div>
                <strong>Copy the embed code</strong> from Step 1 above.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <div>
                <strong>Paste it before <code className="bg-blue-100 px-1 rounded">&lt;/body&gt;</code></strong>{" "}
                on every page of your external website. If using a CMS or template system, add it to the global footer or theme.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>Anonymous tracking starts immediately.</strong>{" "}
                Visitors are tracked the moment they land on your site — no form needed yet.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>(Optional) Add lead capture</strong> to your forms using the code from Step 2.
                This converts anonymous visitors into named leads with their full browsing history preserved.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">5</span>
              <div>
                <strong>Open the{" "}
                <Link href="/admin" className="underline font-semibold">Live Dashboard</Link>
                </strong>{" "}
                and use the <strong>domain filter</strong> to view visitor activity per website.
              </div>
            </li>
          </ol>
        </div>

        {/* Ad Banner Management */}
        <div className="bg-white border-2 border-orange-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            <span className="text-orange-600 mr-2">&#9888;</span>Ad Banner Management
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Activate dynamic offer banners on course pages. Banners appear in the right sidebar when a visitor
            views the same course <strong>3 or more times</strong> — a strong buying signal.
          </p>

          <div className="space-y-3">
            {COURSES.map((course) => {
              const config = getBannerConfig(course.slug);
              const isSaving = savingBanner === course.slug;
              const discounted = Math.round(course.price * (1 - (config.discount_percent || 10) / 100));

              return (
                <div
                  key={course.slug}
                  className={`border rounded-xl p-4 transition-colors ${
                    config.is_active
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Toggle */}
                      <button
                        onClick={() => toggleBanner(course.slug)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          config.is_active ? "bg-green-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            config.is_active ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <div>
                        <span className="font-medium text-sm">{course.title}</span>
                        <span className="text-xs text-gray-400 ml-2">${course.price}</span>
                        {config.is_active && (
                          <span className="text-xs text-green-600 ml-2">
                            → ${discounted} ({config.discount_percent}% off)
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        config.is_active
                          ? "bg-green-600 text-white"
                          : "bg-gray-300 text-gray-600"
                      }`}
                    >
                      {config.is_active ? "ACTIVE" : "OFF"}
                    </span>
                  </div>

                  {config.is_active && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Offer Text</label>
                        <input
                          type="text"
                          value={config.offer_text || ""}
                          onChange={(e) => updateBannerField(course.slug, "offer_text", e.target.value)}
                          className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Discount %</label>
                        <input
                          type="number"
                          min="1"
                          max="90"
                          value={config.discount_percent || 10}
                          onChange={(e) => updateBannerField(course.slug, "discount_percent", parseInt(e.target.value) || 10)}
                          className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">CTA Button Text</label>
                        <input
                          type="text"
                          value={config.cta_text || ""}
                          onChange={(e) => updateBannerField(course.slug, "cta_text", e.target.value)}
                          className="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => saveBanner(course.slug)}
                          disabled={isSaving}
                          className="w-full text-sm bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
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
        </div>

        {/* What Gets Tracked */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">What Gets Tracked</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Every page view with URL and title</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Visitor identified by unique cookie (90 days)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Domain/hostname of each visit</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>SPA navigation (pushState, popstate)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Anonymous visitors tracked before form submission</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Automatic milestone detection and lead scoring</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Past visits linked when lead is captured</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Works across multiple websites with domain filter</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
