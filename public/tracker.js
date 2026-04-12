/**
 * CookieTracker — Embeddable Visitor Tracking Script
 *
 * Usage:
 *   <script src="https://your-app.com/tracker.js" data-host="https://your-app.com"></script>
 *
 * API:
 *   window.CookieTracker.getVisitorId()   — returns the visitor's unique ID
 *   window.CookieTracker.captureLead(data) — submit lead info { name, email, phone?, course_interest? }
 *   window.CookieTracker.trackEvent()      — manually trigger a page view track
 */
(function () {
  "use strict";

  // ── Configuration ──────────────────────────────────────────────
  var scriptTag = document.currentScript;
  var BASE_URL = "";

  if (scriptTag) {
    BASE_URL = scriptTag.getAttribute("data-host") || "";
    if (!BASE_URL && scriptTag.src) {
      try {
        var srcUrl = new URL(scriptTag.src);
        BASE_URL = srcUrl.origin;
      } catch (e) {}
    }
  }

  // Strip trailing slash
  BASE_URL = BASE_URL.replace(/\/+$/, "");

  // ── Cookie Management ──────────────────────────────────────────
  var COOKIE_NAME = "visitor_id";
  var COOKIE_DAYS = 90;

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie =
      name +
      "=" +
      encodeURIComponent(value) +
      "; path=/; max-age=" +
      days * 86400 +
      "; SameSite=Lax";
  }

  // Generate UUID (crypto.randomUUID with fallback)
  function generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  var visitorId = getCookie(COOKIE_NAME);
  if (!visitorId) {
    visitorId = generateUUID();
    setCookie(COOKIE_NAME, visitorId, COOKIE_DAYS);
  }

  // ── Tracking ───────────────────────────────────────────────────
  var lastTracked = {};
  var DEBOUNCE_MS = 30000; // 30 seconds

  function sendTrack(url, title) {
    var payload = JSON.stringify({
      cookie_id: visitorId,
      page_url: url || window.location.href,
      page_title: title || document.title,
    });

    // Prefer sendBeacon with Blob for correct Content-Type
    if (navigator.sendBeacon) {
      var blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(BASE_URL + "/api/track", blob);
    } else {
      // Fallback to fetch with keepalive
      try {
        fetch(BASE_URL + "/api/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(function () {});
      } catch (e) {}
    }
  }

  function debouncedTrack() {
    var key = window.location.pathname;
    var now = Date.now();
    if (lastTracked[key] && now - lastTracked[key] < DEBOUNCE_MS) return;
    lastTracked[key] = now;
    sendTrack();
  }

  // ── SPA Navigation Support ─────────────────────────────────────
  // Override pushState / replaceState
  var origPushState = history.pushState;
  var origReplaceState = history.replaceState;

  history.pushState = function () {
    origPushState.apply(this, arguments);
    setTimeout(debouncedTrack, 0);
  };

  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    setTimeout(debouncedTrack, 0);
  };

  window.addEventListener("popstate", function () {
    setTimeout(debouncedTrack, 0);
  });

  // MutationObserver fallback for frameworks that don't use pushState
  var lastUrl = window.location.href;
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function () {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        debouncedTrack();
      }
    });
    var target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }
  }

  // ── Public API ─────────────────────────────────────────────────
  window.CookieTracker = {
    /** Returns the visitor's unique tracking ID */
    getVisitorId: function () {
      return visitorId;
    },

    /**
     * Submit lead information to convert an anonymous visitor into a known lead.
     * @param {Object} data - { name: string, email: string, phone?: string, course_interest?: string }
     * @returns {Promise} Resolves with the API response
     */
    captureLead: function (data) {
      if (!data || !data.name || !data.email) {
        return Promise.reject(new Error("name and email are required"));
      }
      var payload = {
        cookie_id: visitorId,
        name: data.name,
        email: data.email,
        phone: data.phone || "",
        course_interest: data.course_interest || "",
      };
      return fetch(BASE_URL + "/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(function (res) {
        return res.json();
      });
    },

    /** Manually trigger a page view track */
    trackEvent: function () {
      sendTrack();
    },
  };

  // ── Initial Page View ──────────────────────────────────────────
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    debouncedTrack();
  } else {
    document.addEventListener("DOMContentLoaded", debouncedTrack);
  }
})();
