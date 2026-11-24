/* ============================================================
   Equalize — v/campaign.js
   Campaign landing pages: equalizeapp.com/v/<campaign-id>

   Campaign ID format:  <channel>-<label>
     channel  one of the CHANNELS keys below (e.g. ig, tt, yt)
     label    lowercase letters/digits, optional single hyphens
     max      32 characters in total
   Examples: ig-v08, tt-v03, yt-v02, ig-launch-week1

   The same ID is used for:
     - the Vercel pageview path        /v/ig-v08
     - the store_click event property  campaign: "ig-v08"
     - Apple App Store campaign token  ct=ig-v08
     - Google Play install referrer    utm_campaign=ig-v08
============================================================ */

(function (root) {
  'use strict';

  /* ----------------------------------------------------------
     CONFIGURATION — edit these when store status changes.

     status:
       'soon'      listing not public yet → non-clickable
                   "Coming soon" badge, no outbound link
       'preorder'  Apple pre-order / Google pre-registration
                   listing is publicly reachable
       'live'      app is downloadable

     Only change a status after opening the store URL logged out /
     in a private window and confirming the listing loads.
  ---------------------------------------------------------- */
  var CONFIG = {
    apple: {
      appId: '6822657088',
      status: 'soon',
      // From App Store Connect → Apps → App Analytics → Campaigns
      // (campaign link generator). Digits only. Leave empty until
      // you have the real value — never guess it.
      providerToken: ''
    },
    google: {
      packageName: 'com.equalizehousehold.app',
      status: 'soon'
    }
  };

  // Channel prefix → utm_source used for Google Play attribution.
  var CHANNELS = {
    ig: 'instagram',
    tt: 'tiktok',
    yt: 'youtube',
    fb: 'facebook',
    th: 'threads',
    x:  'x',
    li: 'linkedin',
    rd: 'reddit',
    pn: 'pinterest'
  };

  var MAX_LENGTH = 32;
  var ID_PATTERN = /^([a-z]{1,3})-([a-z0-9]+(?:-[a-z0-9]+)*)$/;

  var LABELS = {
    apple: {
      soon:     { sub: 'Coming soon on the', aria: 'App Store — coming soon' },
      preorder: { sub: 'Pre-order on the',   aria: 'Pre-order on the App Store' },
      live:     { sub: 'Download on the',    aria: 'Download on the App Store' },
      main: 'App Store'
    },
    google: {
      soon:     { sub: 'Coming soon on',     aria: 'Google Play — coming soon' },
      preorder: { sub: 'Pre-register on',    aria: 'Pre-register on Google Play' },
      live:     { sub: 'Get it on',          aria: 'Get it on Google Play' },
      main: 'Google Play'
    }
  };

  var PLATFORM_EVENT_VALUE = { apple: 'app_store', google: 'google_play' };

  /* ----------------------------------------------------------
     Validation
  ---------------------------------------------------------- */

  // Returns { id, channel, source } for a valid ID, otherwise null.
  function validateId(raw) {
    if (typeof raw !== 'string') return null;
    if (raw.length === 0 || raw.length > MAX_LENGTH) return null;
    var id = raw.toLowerCase();
    var match = ID_PATTERN.exec(id);
    if (!match) return null;
    if (!Object.prototype.hasOwnProperty.call(CHANNELS, match[1])) return null;
    return { id: id, channel: match[1], source: CHANNELS[match[1]] };
  }

  // Reads the campaign from a pathname such as "/v/ig-v08" or "/v/ig-v08/".
  // state: 'valid' | 'invalid' | 'none'
  function parsePath(pathname) {
    var m = /^\/v(?:\/([^/]*))?\/?$/i.exec(pathname || '');
    if (!m) return { state: 'invalid', campaign: null };
    var segment = m[1] || '';
    if (segment === '' || /^index\.html$/i.test(segment)) {
      return { state: 'none', campaign: null };
    }
    // Reject percent-encoded input outright rather than decoding it.
    if (segment.indexOf('%') !== -1) return { state: 'invalid', campaign: null };
    var campaign = validateId(segment);
    return campaign
      ? { state: 'valid', campaign: campaign }
      : { state: 'invalid', campaign: null };
  }

  // Path reported to Vercel: canonical campaign path, or a fixed bucket.
  function analyticsPath(pathname) {
    var parsed = parsePath(pathname);
    if (parsed.state === 'valid') return '/v/' + parsed.campaign.id;
    if (parsed.state === 'none') return '/v/';
    return '/v/invalid';
  }

  // Value for the store_click "campaign" property.
  function campaignValue(parsed) {
    return parsed.state === 'valid' ? parsed.campaign.id : parsed.state;
  }

  /* ----------------------------------------------------------
     Store URLs
  ---------------------------------------------------------- */

  function appleUrl(campaign, config) {
    var cfg = config || CONFIG.apple;
    var params = [];
    if (/^[0-9]+$/.test(cfg.providerToken || '')) {
      params.push('pt=' + cfg.providerToken);
    }
    if (campaign) params.push('ct=' + encodeURIComponent(campaign.id));
    params.push('mt=8');
    return 'https://apps.apple.com/app/apple-store/id' + cfg.appId + '?' + params.join('&');
  }

  function googleUrl(campaign, config) {
    var cfg = config || CONFIG.google;
    var url = 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(cfg.packageName);
    if (campaign) {
      var referrer =
        'utm_source=' + encodeURIComponent(campaign.source) +
        '&utm_medium=social' +
        '&utm_campaign=' + encodeURIComponent(campaign.id);
      url += '&referrer=' + encodeURIComponent(referrer);
    }
    return url;
  }

  /* ----------------------------------------------------------
     Analytics event
  ---------------------------------------------------------- */

  function trackStoreClick(parsed, store) {
    if (typeof root.va !== 'function') return;
    try {
      root.va('event', {
        name: 'store_click',
        data: {
          campaign: campaignValue(parsed),
          platform: PLATFORM_EVENT_VALUE[store]
        }
      });
    } catch (e) {
      /* never block navigation */
    }
  }

  /* ----------------------------------------------------------
     Rendering
  ---------------------------------------------------------- */

  function renderBadge(doc, slot, store, parsed, config) {
    var cfg = config[store];
    var status = cfg && LABELS[store][cfg.status] ? cfg.status : 'soon';
    var labels = LABELS[store];
    var existing = slot.querySelector('.store-badge');
    var icon = existing ? existing.querySelector('.store-icon') : null;

    var el;
    if (status === 'soon') {
      el = doc.createElement('span');
      el.className = 'store-badge store-badge--soon';
    } else {
      el = doc.createElement('a');
      el.className = 'store-badge';
      el.href = store === 'apple'
        ? appleUrl(parsed.campaign, cfg)
        : googleUrl(parsed.campaign, cfg);
      el.rel = 'noopener';
      el.setAttribute('data-platform', PLATFORM_EVENT_VALUE[store]);
      var handler = function (e) {
        // Primary click, keyboard activation, or middle-click.
        if (e.type === 'auxclick' && e.button !== 1) return;
        trackStoreClick(parsed, store);
      };
      el.addEventListener('click', handler);
      el.addEventListener('auxclick', handler);
    }
    el.setAttribute('aria-label', labels[status].aria);

    if (icon) el.appendChild(icon.cloneNode(true));
    var text = doc.createElement('span');
    text.className = 'store-badge-text';
    var sub = doc.createElement('span');
    sub.className = 'store-sub';
    sub.textContent = labels[status].sub;
    var main = doc.createElement('span');
    main.className = 'store-main';
    main.textContent = labels.main;
    text.appendChild(sub);
    text.appendChild(main);
    el.appendChild(text);

    if (existing) {
      slot.replaceChild(el, existing);
    } else {
      slot.appendChild(el);
    }
    return status;
  }

  function init(doc, loc, config) {
    doc = doc || root.document;
    loc = loc || root.location;
    config = config || CONFIG;
    var parsed = parsePath(loc.pathname);

    // Normalise e.g. /v/IG-V08 → /v/ig-v08 in the address bar.
    if (parsed.state === 'valid' && loc.pathname !== '/v/' + parsed.campaign.id &&
        root.history && typeof root.history.replaceState === 'function') {
      try { root.history.replaceState(null, '', '/v/' + parsed.campaign.id); } catch (e) { /* ignore */ }
    }

    var statuses = {};
    ['apple', 'google'].forEach(function (store) {
      var slot = doc.querySelector('[data-store="' + store + '"]');
      if (slot) statuses[store] = renderBadge(doc, slot, store, parsed, config);
    });

    var note = doc.getElementById('store-status-note');
    if (note) {
      var anyOpen = statuses.apple !== 'soon' || statuses.google !== 'soon';
      note.hidden = anyOpen;
    }
    return { parsed: parsed, statuses: statuses };
  }

  var api = {
    CONFIG: CONFIG,
    CHANNELS: CHANNELS,
    MAX_LENGTH: MAX_LENGTH,
    validateId: validateId,
    parsePath: parsePath,
    analyticsPath: analyticsPath,
    campaignValue: campaignValue,
    appleUrl: appleUrl,
    googleUrl: googleUrl,
    trackStoreClick: trackStoreClick,
    init: init
  };

  root.EqualizeCampaign = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (root.document && !root.__equalizeCampaignNoAutoInit) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', function () { init(); });
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
