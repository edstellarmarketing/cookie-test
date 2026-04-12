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

        {/* Step 2: Lead Capture */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-1">
            <span className="text-blue-600 mr-2">2.</span>Capture Leads (Optional)
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            To convert anonymous visitors into known leads, call this from your website's form handler.
            This links the visitor's browsing history to their contact info.
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
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Installation Guide</h2>
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
                on every page of your external website. If using a CMS or template system, add it to the global footer.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <div>
                <strong>(Optional) Integrate lead capture</strong> with your existing forms using the JavaScript API from Step 2.
                This converts anonymous visitors into named leads with email/phone.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
              <div>
                <strong>Visit the{" "}
                <Link href="/admin" className="underline font-semibold">Live Dashboard</Link>
                </strong>{" "}
                to see visitor tracking data. Use the <strong>domain filter</strong> to view activity per website.
              </div>
            </li>
          </ol>
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
              <span>Lead info when captured via JS API</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
              <span>Automatic milestone detection and scoring</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
