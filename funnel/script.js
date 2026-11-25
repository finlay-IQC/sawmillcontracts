/* Sawmill Contracts funnel — lightweight helpers (no dependencies)
   1. UTM / click-ID capture → sessionStorage
   2. Append tracking params to internal links + the form iframe src
   3. Smooth scroll for every CTA to #form
   4. Sticky CTA (shows after hero, hides while the form is on screen)
   5. FAQ accordion
*/
(function () {
  "use strict";

  var KEYS = [
    "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
    "fbclid", "gclid", "ttclid", "msclkid"
  ];
  var STORE = "sawmill_tracking";

  /* ---------- 1. Capture ---------- */
  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
  }
  function writeStore(obj) {
    try { sessionStorage.setItem(STORE, JSON.stringify(obj)); } catch (e) { /* storage blocked */ }
  }

  var params = new URLSearchParams(window.location.search);
  var stored = readStore();
  var found = false;
  KEYS.forEach(function (k) {
    var v = params.get(k);
    if (v) { stored[k] = v; found = true; }
  });
  if (found) writeStore(stored);

  // Fall back to the live URL if storage is unavailable.
  var tracking = {};
  KEYS.forEach(function (k) {
    var v = stored[k] || params.get(k);
    if (v) tracking[k] = v;
  });

  function withTracking(url) {
    try {
      var u = new URL(url, window.location.href);
      Object.keys(tracking).forEach(function (k) {
        if (!u.searchParams.has(k)) u.searchParams.set(k, tracking[k]);
      });
      return u.toString();
    } catch (e) { return url; }
  }

  /* ---------- 2a. Internal links (landing → thank-you etc.) ---------- */
  document.querySelectorAll("a[data-keep-utm]").forEach(function (a) {
    a.href = withTracking(a.getAttribute("href"));
  });

  /* ---------- 2b. Form embed ----------
     The LeadConnector iframe is written with data-src so we can add the
     tracking params BEFORE it loads. LeadConnector prefills hidden fields whose
     query key matches the param name (e.g. utm_source).
     >>> MANUAL STEP: in the LeadConnector form builder, add Hidden fields with
     >>> query keys: utm_source, utm_medium, utm_campaign, utm_content, utm_term,
     >>> fbclid, gclid, ttclid, msclkid — otherwise the values are not saved.
     The form_embed.js script is loaded only once the iframe has its src. */
  var frame = document.querySelector("iframe[data-src]");
  function loadForm() {
    if (!frame || frame.getAttribute("src")) return;
    frame.setAttribute("src", withTracking(frame.getAttribute("data-src")));
    var s = document.createElement("script");
    s.src = "https://link.msgsndr.com/js/form_embed.js";
    s.async = true;
    document.body.appendChild(s);
  }
  if (frame) {
    // The form sits right under the hero, so load it straight away on page load
    // (it does not block first paint because this script is deferred).
    loadForm();
  }

  // Expose a redirect helper in case a postMessage / custom submit hook is used.
  window.sawmillRedirect = function (path) {
    window.location.href = withTracking(path || "thank-you.html");
  };

  /* ---------- 3. CTA scroll ---------- */
  var formSection = document.getElementById("form");
  document.querySelectorAll("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (!formSection) return;
      e.preventDefault();
      formSection.scrollIntoView({ behavior: "smooth", block: "start" });
      // Move focus for keyboard / screen reader users.
      formSection.setAttribute("tabindex", "-1");
      formSection.focus({ preventScroll: true });
    });
  });

  /* ---------- 4. Sticky CTA ---------- */
  var sticky = document.querySelector(".sticky-cta");
  var hero = document.querySelector(".hero");
  if (sticky && hero && "IntersectionObserver" in window) {
    var pastHero = false;
    var formVisible = false;
    function update() {
      var show = pastHero && !formVisible;
      sticky.classList.toggle("is-visible", show);
      sticky.setAttribute("aria-hidden", show ? "false" : "true");
      sticky.querySelectorAll("a").forEach(function (a) { a.tabIndex = show ? 0 : -1; });
    }
    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      update();
    }, { threshold: 0 }).observe(hero);
    if (formSection) {
      new IntersectionObserver(function (entries) {
        formVisible = entries[0].isIntersecting;
        update();
      }, { threshold: 0.15 }).observe(formSection);
    }
    update();
  }

  /* ---------- 5. FAQ accordion ---------- */
  document.querySelectorAll(".faq__q").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      if (panel) panel.hidden = open;
    });
  });

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
