/* SANcha — shared site chrome for the multi-page site.
 * Injects the nav, footer and basket drawer into every page (so they're identical
 * everywhere and the basket works site-wide), then wires the nav behaviours.
 * Load this BEFORE site-app.js and checkout.js. */
(function () {
  "use strict";

  var NAV_LINKS = [
    { label: "Why Matcha", href: "/why-matcha/" },
    { label: "Our Story",  href: "/our-story/" },
    { label: "Matcha",     href: "/#tins" },
    { label: "Wholesale",  href: "/wholesale/" },
    { label: "Visit",      href: "/visit/" }
  ];

  // Mark the nav link for the current page as active.
  function isActive(href) {
    var path = location.pathname.replace(/index\.html$/, "");
    if (path === "/" || path === "") return href === "/#tins";   // homepage
    return href.indexOf(path) === 0;
  }

  function navHtml() {
    var links = NAV_LINKS.map(function (l) {
      return '<li><a href="' + l.href + '"' + (isActive(l.href) ? ' aria-current="page"' : '') + '>' + l.label + '</a></li>';
    }).join("");
    return '' +
      '<nav>' +
        '<div class="wrap nav-inner">' +
          '<a href="/" aria-label="SANcha home"><picture><source srcset="/assets/logo-dark.webp" type="image/webp"><img src="/assets/logo-dark.png" alt="SANcha" class="logo"></picture></a>' +
          '<div class="nav-right">' +
            '<div class="nav-menu" id="nav-menu">' +
              '<ul class="nav-links">' + links + '</ul>' +
              '<a href="/#shop" class="nav-cta">Shop</a>' +
            '</div>' +
            '<button class="cart-btn" id="cart-btn" type="button" aria-label="Open basket">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>' +
              '<span class="cart-count" id="cart-count" hidden>0</span>' +
            '</button>' +
            '<button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-menu"><span></span><span></span><span></span></button>' +
          '</div>' +
        '</div>' +
      '</nav>';
  }

  function footerHtml() {
    return '' +
      '<footer>' +
        '<div class="wrap">' +
          '<div class="foot-grid">' +
            '<div>' +
              '<img src="/assets/logo-cream.png" alt="SANcha" class="foot-logo">' +
              '<p class="lead">High-quality matcha for clean, steady energy. Three friends, one better cup — London.</p>' +
            '</div>' +
            '<div class="fcol"><h3>Shop</h3><a href="/#tins">IKI &amp; YUAN Tins</a><a href="/#shop">Merchandise</a><a href="/#shop">Gift Cards</a></div>' +
            '<div class="fcol"><h3>Trade</h3><a href="/wholesale/">Wholesale Supply</a><a href="/why-matcha/">Why Matcha</a><a href="/contact/">Get in Touch</a></div>' +
            '<div class="fcol"><h3>Visit &amp; Follow</h3><a href="/visit/">Westfield Store</a><a href="https://sanchamatcha.co.uk">sanchamatcha.co.uk</a>' +
              '<div class="foot-social">' +
                '<a href="https://www.instagram.com/sanchamatchaa" target="_blank" rel="noopener" aria-label="SANcha on Instagram"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg></a>' +
                '<a href="https://www.tiktok.com/@sanchamatchaa" target="_blank" rel="noopener" aria-label="SANcha on TikTok"><svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor"><path d="M16.6 5.8a4.3 4.3 0 0 1-1-.3 4.3 4.3 0 0 1-1.8-2.9h-2.6v11.3a2.3 2.3 0 1 1-1.9-2.3V8.9a5 5 0 1 0 4.5 5V8.4a6.6 6.6 0 0 0 3.8 1.2V7a4.3 4.3 0 0 1-1-.2z"/></svg></a>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="foot-bottom">' +
            '<span>© 2026 SANcha · London</span>' +
            '<span class="foot-legal"><a href="/faq/">FAQ</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/returns/">Returns</a></span>' +
            '<span>Concept design · Style 01 — Zen Minimal</span>' +
          '</div>' +
        '</div>' +
      '</footer>';
  }

  function cartHtml() {
    return '' +
      '<div id="cart-overlay" class="cart-overlay" hidden></div>' +
      '<aside id="cart-drawer" class="cart-drawer" aria-label="Basket" aria-hidden="true">' +
        '<div class="cart-head"><h3 id="cart-title">Your basket</h3>' +
          '<button class="cart-close" type="button" aria-label="Close basket">&times;</button></div>' +
        '<div class="cart-body">' +
          '<div class="cart-step" data-step="basket">' +
            '<div id="cart-items"></div>' +
            '<div class="cart-empty" id="cart-empty">Your basket is empty.</div>' +
            '<div class="cart-subtotal" id="cart-sub-row" hidden><span>Subtotal</span><b id="cart-subtotal">£0.00</b></div>' +
            '<p class="cart-note" id="cart-note" hidden>UK delivery £3.75 &middot; free over £40. Prices include VAT.</p>' +
            '<button class="btn btn-solid cart-full" id="to-details" type="button" disabled>Checkout</button>' +
          '</div>' +
          '<form class="cart-step" data-step="details" id="details-form" hidden novalidate>' +
            '<label class="wf-field"><span class="wf-q">Full name</span><input name="name" autocomplete="name" required></label>' +
            '<label class="wf-field"><span class="wf-q">Email</span><input type="email" name="email" autocomplete="email" required></label>' +
            '<label class="wf-field"><span class="wf-q">Delivery address</span><textarea name="address" rows="3" autocomplete="street-address" required></textarea></label>' +
            '<label class="wf-field"><span class="wf-q">Postcode</span><input name="postcode" autocomplete="postal-code" required></label>' +
            '<div class="cart-err" id="details-err" hidden></div>' +
            '<button class="btn btn-solid cart-full" type="submit">Continue to payment</button>' +
            '<button class="cart-back" type="button" data-back="basket">Back to basket</button>' +
          '</form>' +
          '<div class="cart-step" data-step="payment" hidden>' +
            '<div class="pay-summary" id="pay-summary"></div><div id="sumup-card"></div>' +
            '<div class="cart-err" id="pay-err" hidden></div>' +
            '<button class="cart-back" type="button" data-back="details">Back</button>' +
          '</div>' +
          '<div class="cart-step" data-step="processing" hidden><div class="cart-done">' +
            '<div class="pay-spinner" aria-hidden="true"></div><h4>Confirming your order…</h4>' +
            '<p>Payment received — please don\'t close this window.</p></div></div>' +
          '<div class="cart-step" data-step="done" hidden><div class="cart-done">' +
            '<h4>Thank you!</h4><p id="done-msg">Your order is confirmed. A confirmation email is on its way.</p>' +
            '<button class="btn btn-solid cart-full" data-close type="button">Done</button></div></div>' +
        '</div>' +
      '</aside>';
  }

  // Inject chrome. Nav goes first in <body>, footer + cart at the end.
  var navMount = document.getElementById("site-nav");
  if (navMount) navMount.outerHTML = navHtml();
  else document.body.insertAdjacentHTML("afterbegin", navHtml());

  var footMount = document.getElementById("site-footer");
  if (footMount) footMount.outerHTML = footerHtml();
  else document.body.insertAdjacentHTML("beforeend", footerHtml());

  document.body.insertAdjacentHTML("beforeend", cartHtml());

  // Mobile nav toggle (keyboard-accessible; closes on link click or Esc).
  (function () {
    var nav = document.querySelector("nav"), b = nav && nav.querySelector(".nav-burger");
    if (!b) return;
    function set(open) {
      nav.classList.toggle("open", open);
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    b.addEventListener("click", function () { set(!nav.classList.contains("open")); });
    nav.querySelectorAll(".nav-menu a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
  })();

  // Header is seamless at the top; add a soft shadow once the page is scrolled.
  (function () {
    var nav = document.querySelector("nav");
    if (!nav) return;
    function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  })();
})();
