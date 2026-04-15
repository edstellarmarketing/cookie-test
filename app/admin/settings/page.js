"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [copied, setCopied] = useState("");
  const [origin, setOrigin] = useState("https://your-app.com");
  const router = useRouter();

  useEffect(() => {
    const isAuth = sessionStorage.getItem("admin_authenticated");
    if (isAuth === "true") {
      setAuthenticated(true);
      setOrigin(window.location.origin);
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
          <Link
            href="/admin/emails"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Emails
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

        {/* Ad Banners Link */}
        <Link
          href="/admin/banners"
          className="block bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6 hover:border-orange-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-orange-900">
                Ad Banner Management
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure dynamic offer banners with 6 scenario types — frequent visitor, cart abandoned,
                re-engagement, first visit, course explorer, and checkout dropout.
              </p>
            </div>
            <span className="text-orange-500 text-2xl flex-shrink-0 ml-4">&rarr;</span>
          </div>
        </Link>

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
