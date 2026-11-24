/* ============================================================
   Equalize — analytics.js
   Privacy-friendly Vercel Web Analytics loader for this static site.

   - Cookieless Vercel Web Analytics only. No advertising pixels,
     no fingerprinting, no other analytics platforms.
   - Loaded at most once per page (prevents duplicate pageviews).
   - Not loaded when the browser sends Global Privacy Control or
     Do Not Track, or when the visitor has opted out on the
     Privacy Policy page (section 18.1).
   - Query strings and fragments are stripped from every URL sent.
   - Deliberately NOT included on /join/ or /challenge/ pages,
     whose URLs contain household invite / referral codes.

   Must be included before any script that calls window.va().
============================================================ */

(function () {
  'use strict';

  /* Vercel's HTML snippet uses a project-specific script path shown
     in Vercel dashboard → Project → Analytics. If the dashboard shows
     a path other than this one, replace this constant (it is the only
     place the path is defined). Verify on a preview deployment that
     this URL returns JavaScript (HTTP 200) before promoting. */
  var VERCEL_SCRIPT_SRC = '/_vercel/insights/script.js';

  var OPT_OUT_KEY = 'equalize-analytics-opt-out';

  // Vercel's documented queue: calls made before the script loads are
  // queued and replayed. If analytics never loads, calls are harmless.
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  function hasOptedOut() {
    try {
      return window.localStorage.getItem(OPT_OUT_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function browserSignalsOptOut() {
    var nav = window.navigator || {};
    if (nav.globalPrivacyControl === true) return true;
    var dnt = nav.doNotTrack || window.doNotTrack || nav.msDoNotTrack;
    return dnt === '1' || dnt === 'yes';
  }

  // Remove query strings and fragments; collapse anything under /v/
  // to its validated campaign path; drop anything from invite pages.
  function scrubUrl(rawUrl) {
    var url;
    try {
      url = new URL(rawUrl, window.location.href);
    } catch (e) {
      return null;
    }
    var path = url.pathname;
    if (/^\/(join|challenge)(\/|$)/i.test(path)) return null;
    if (/^\/v(\/|$)/i.test(path)) {
      var campaign = window.EqualizeCampaign;
      if (!campaign || typeof campaign.analyticsPath !== 'function') return null;
      path = campaign.analyticsPath(path);
    }
    return url.origin + path;
  }

  var api = {
    OPT_OUT_KEY: OPT_OUT_KEY,
    scrubUrl: scrubUrl,
    isEnabled: function () {
      return !hasOptedOut() && !browserSignalsOptOut();
    },
    setOptOut: function (optOut) {
      try {
        if (optOut) {
          window.localStorage.setItem(OPT_OUT_KEY, '1');
        } else {
          window.localStorage.removeItem(OPT_OUT_KEY);
        }
        return true;
      } catch (e) {
        return false;
      }
    },
    hasOptedOut: hasOptedOut,
    browserSignalsOptOut: browserSignalsOptOut
  };
  window.EqualizeAnalytics = api;

  // Guard against double inclusion → duplicate pageviews.
  if (window.__equalizeAnalyticsLoaded) return;
  window.__equalizeAnalyticsLoaded = true;

  if (!api.isEnabled()) return;

  window.va('beforeSend', function (event) {
    if (!event || typeof event.url !== 'string') return null;
    var cleaned = scrubUrl(event.url);
    if (!cleaned) return null;
    event.url = cleaned;
    return event;
  });

  var script = document.createElement('script');
  script.defer = true;
  script.src = VERCEL_SCRIPT_SRC;
  (document.head || document.documentElement).appendChild(script);
})();
