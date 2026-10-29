/* SANcha — cart + SumUp checkout (frontend).
 *
 * Basket drawer + checkout flow. Talks to the checkout Apps Script web app
 * (CHECKOUT_ENDPOINT) and mounts the SumUp card widget. Product data comes from
 * the Google Sheet, but PRICE + STOCK are re-validated server-side before payment.
 */
(function () {
  "use strict";

  // Checkout Apps Script "/exec" URL. Currently the SANDBOX deployment (test sheet +
  // sandbox SumUp). Swap to the live deployment URL at go-live.
  var CHECKOUT_ENDPOINT = "https://script.google.com/macros/s/AKfycbxh5hnIxGmDFdqNi5kggKZtkIlWEtESaZixTJOQg_7-rGlmPsnS1hxdYPOU1kFLHbC_rA/exec";

  // Customer-facing contact (matches the backend REPLY_TO).
  var CONTACT_EMAIL = "contact@sanchamatcha.co.uk";

  /* ---- cart state (persisted) --------------------------------------------- */
  var CART_KEY = "sancha_cart";
  function getCart()  { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (_) { return []; } }
  function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); renderCount(); renderDrawer(); }
  function find(c, id){ for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i]; return null; }
  function add(id, name, price) {
    var c = getCart(), r = find(c, id);
    if (r) r.qty++; else c.push({ id: id, name: name, price: Number(price) || 0, qty: 1 });
    saveCart(c); open();
  }
  function setQty(id, qty) {
    var c = getCart().map(function (x) { if (x.id === id) x.qty = qty; return x; })
                     .filter(function (x) { return x.qty > 0; });
    saveCart(c);
  }
  function remove(id) { setQty(id, 0); }
  function count() { return getCart().reduce(function (t, x) { return t + x.qty; }, 0); }
  function total() { return getCart().reduce(function (t, x) { return t + x.price * x.qty; }, 0); }
  function money(n) { return "£" + (Number(n) || 0).toFixed(2); }

  /* ---- helpers ------------------------------------------------------------ */
  function el(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }

  /* ---- drawer open/close + steps ------------------------------------------ */
  function open() {
    var d = el("cart-drawer"), o = el("cart-overlay"); if (!d) return;
    showStep("basket"); renderDrawer();
    o.hidden = false;
    requestAnimationFrame(function () { o.classList.add("open"); d.classList.add("open"); });
    d.setAttribute("aria-hidden", "false");
  }
  function close() {
    var d = el("cart-drawer"), o = el("cart-overlay"); if (!d) return;
    d.classList.remove("open"); o.classList.remove("open"); d.setAttribute("aria-hidden", "true");
    setTimeout(function () { o.hidden = true; }, 320);
  }
  function showStep(name) {
    var steps = document.querySelectorAll("#cart-drawer .cart-step");
    for (var i = 0; i < steps.length; i++) steps[i].hidden = steps[i].getAttribute("data-step") !== name;
    var titles = { basket: "Your basket", details: "Delivery details", payment: "Payment", processing: "Processing", done: "Order confirmed" };
    var t = el("cart-title"); if (t) t.textContent = titles[name] || "Your basket";
  }

  /* ---- render ------------------------------------------------------------- */
  function renderCount() { var b = el("cart-count"); if (b) { b.textContent = count(); b.hidden = count() === 0; } }
  function renderDrawer() {
    var wrap = el("cart-items"); if (!wrap) return;
    var c = getCart();
    wrap.innerHTML = c.map(function (x) {
      return '<div class="cart-line">' +
        '<div class="nm"><b>' + esc(x.name) + '</b><span>' + money(x.price) + ' each</span>' +
          '<button class="cart-rm" data-rm="' + esc(x.id) + '">Remove</button></div>' +
        '<div class="qty"><button data-dec="' + esc(x.id) + '" aria-label="Decrease">&minus;</button>' +
          '<span>' + x.qty + '</span>' +
          '<button data-inc="' + esc(x.id) + '" aria-label="Increase">+</button></div>' +
        '<div class="lp">' + money(x.price * x.qty) + '</div></div>';
    }).join("");
    var has = c.length > 0;
    if (el("cart-empty"))   el("cart-empty").hidden   = has;
    if (el("cart-sub-row")) el("cart-sub-row").hidden = !has;
    if (el("cart-note"))    el("cart-note").hidden    = !has;
    if (el("to-details"))   el("to-details").disabled = !has;
    if (el("cart-subtotal"))el("cart-subtotal").textContent = money(total());
  }

  /* ---- checkout flow ------------------------------------------------------ */
  function startDetails() { if (getCart().length) showStep("details"); }

  function submitDetails(e) {
    e.preventDefault();
    var f = e.target;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    var customer = {
      name:     f.elements["name"].value.trim(),
      email:    f.elements["email"].value.trim(),
      address:  f.elements["address"].value.trim(),
      postcode: f.elements["postcode"].value.trim()
    };
    if (!validateDetails(customer)) return;
    clearDetailsErr();
    startCheckout(customer);
  }

  /* ---- details validation (catch email / address typos) ------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var UK_POSTCODE_RE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i;
  var COMMON_DOMAINS = ["gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","hotmail.com",
    "hotmail.co.uk","outlook.com","live.com","icloud.com","me.com","aol.com","btinternet.com","sky.com"];
  var _emailConfirmed = "";   // email the customer kept despite a typo nudge

  function detailsErr(html, focusName) {
    var e = el("details-err"); if (e) { e.hidden = false; e.innerHTML = html; }
    if (focusName) { var inp = document.querySelector('#details-form [name="' + focusName + '"]'); if (inp) inp.focus(); }
  }
  function clearDetailsErr() { var e = el("details-err"); if (e) { e.hidden = true; e.textContent = ""; } }

  function validateDetails(c) {
    if (!EMAIL_RE.test(c.email)) {
      detailsErr("Please enter a valid email address — that's where your order confirmation goes.", "email"); return false;
    }
    if (!UK_POSTCODE_RE.test(c.postcode)) {
      detailsErr("Please enter a valid UK postcode (e.g. SW1A 1AA).", "postcode"); return false;
    }
    if (c.address.replace(/\s/g, "").length < 6) {
      detailsErr("Please enter your full delivery address.", "address"); return false;
    }
    // Soft nudge for a likely mistyped email domain (e.g. gmial.com → gmail.com).
    var sug = suggestEmail(c.email);
    if (sug && _emailConfirmed !== c.email.toLowerCase()) {
      _emailConfirmed = c.email.toLowerCase();   // 2nd press with same value = accept as-is
      detailsErr('Did you mean <button type="button" class="email-fix" data-email="' + esc(sug) + '">' +
        esc(sug) + '</button>? If your address is correct, press "Continue to payment" again.');
      return false;
    }
    return true;
  }

  // Suggest a corrected domain if it's a close misspelling of a common provider.
  function suggestEmail(email) {
    var at = email.lastIndexOf("@"); if (at < 1) return null;
    var dom = email.slice(at + 1).toLowerCase();
    if (!dom || COMMON_DOMAINS.indexOf(dom) > -1) return null;
    var best = null, bestD = 99;
    COMMON_DOMAINS.forEach(function (d) { var dist = lev(dom, d); if (dist < bestD) { bestD = dist; best = d; } });
    return (best && bestD > 0 && bestD <= 2) ? email.slice(0, at + 1) + best : null;
  }
  function lev(a, b) {   // Levenshtein distance
    var m = a.length, n = b.length, i, j, d = [];
    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a.charAt(i-1) === b.charAt(j-1) ? 0 : 1));
    return d[m][n];
  }

  function startCheckout(customer) {
    if (!getCart().length) return;
    if (el("pay-err")) el("pay-err").hidden = true;
    showStep("payment");
    if (el("pay-summary")) el("pay-summary").innerHTML = "Total <b>" + money(total()) + "</b> · " + count() + " item(s)";
    var card = el("sumup-card");
    if (card) card.innerHTML = "<p style='color:#6a6a60;font-size:14px'>Loading secure payment…</p>";
    post({ action: "createCheckout", cart: getCart(), customer: customer })
      .then(function (res) {
        console.log("[checkout] createCheckout response:", res);
        if (!res || res.error) throw new Error((res && res.error) || "createCheckout failed");
        if (!res.checkoutId) throw new Error("No checkout id returned — please try again.");
        if (card) card.innerHTML = "";
        mountWidget(res.checkoutId);
      })
      .catch(payError);
  }

  // Live SumUp widget instance. Must be unmounted before re-mounting — leaving a
  // stale instance alive while mounting a new one makes the SDK fail with an
  // opaque "undefined: undefined" on the second payment attempt.
  var cardWidget = null;
  function unmountWidget() {
    if (cardWidget && typeof cardWidget.unmount === "function") {
      try { cardWidget.unmount(); } catch (_) {}
    }
    cardWidget = null;
  }

  function mountWidget(checkoutId) {
    if (!window.SumUpCard) { payError("Payment library not loaded — please refresh."); return; }
    unmountWidget();
    cardWidget = SumUpCard.mount({
      id: "sumup-card",
      checkoutId: checkoutId,
      onResponse: function (type, body) {
        console.log("[checkout] widget response:", type, body);
        if (type === "success") finalize(checkoutId);
        else if (type === "error" || type === "fail")
          payError((body && body.message) ? body.message
                   : ("Payment didn't go through (" + type + "). Please try again."));
        // "sent" / "invalid" / "auth-screen" → handled by the widget
      }
    });
  }

  function finalize(checkoutId) {
    // Payment succeeded — swap the card form for a "confirming…" view while the
    // backend records the order (SumUp status re-check + sheet writes + emails).
    showStep("processing");
    post({ action: "finalizeOrder", checkoutId: checkoutId })
      .then(function (res) {
        console.log("[checkout] finalizeOrder response:", res);
        if (res && res.ok) {
          localStorage.removeItem(CART_KEY); renderCount(); renderDrawer();
          if (res.reference && el("done-msg"))
            el("done-msg").textContent = "Your order (" + res.reference + ") is confirmed. A confirmation email is on its way.";
          showStep("done");
        } else {
          finalizeError(res && res.status ? "Status: " + res.status : null);
        }
      })
      .catch(function (e) { console.error("[checkout]", e); finalizeError(null); });
  }

  // Payment succeeded but the backend couldn't confirm the order. NEVER send the
  // customer back to pay again — reassure them and give a contact route.
  function finalizeError(detail) {
    showStep("processing");
    var box = document.querySelector('[data-step="processing"] .cart-done');
    if (box) box.innerHTML =
      '<h4>Almost there</h4>' +
      '<p>Your payment went through, but we hit a snag confirming your order automatically. ' +
      'Don\'t worry — your payment is safe. Please email ' +
      '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a> and we\'ll sort it straight away.' +
      (detail ? '<br><br><small style="color:#6a6a60">' + esc(detail) + '</small>' : '') + '</p>';
  }

  function payError(e) {
    var p = el("pay-err");
    if (p) { p.hidden = false; p.textContent = (typeof e === "string" ? e : (e && e.message) || "Something went wrong."); }
    console.error("[checkout]", e);
  }

  /* ---- network ------------------------------------------------------------ */
  function post(body) {
    if (!CHECKOUT_ENDPOINT) return Promise.reject("CHECKOUT_ENDPOINT is empty — paste the Apps Script /exec URL in assets/checkout.js");
    // text/plain keeps it a "simple" request so the browser skips the CORS
    // preflight that Apps Script can't answer. Backend reads e.postData.contents.
    return fetch(CHECKOUT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  /* ---- events (delegated) ------------------------------------------------- */
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var addb = t.closest(".add-btn");
    if (addb) { add(addb.getAttribute("data-id"), addb.getAttribute("data-name"), addb.getAttribute("data-price")); return; }
    if (t.closest(".notify-btn")) { location.hash = "#join"; return; }
    var fix = t.closest(".email-fix");
    if (fix) {
      var em = document.querySelector('#details-form [name="email"]');
      if (em) { em.value = fix.getAttribute("data-email"); em.focus(); }
      _emailConfirmed = ""; clearDetailsErr(); return;
    }
    if (t.closest("#cart-btn")) { open(); return; }
    if (t.classList.contains("cart-close")) { close(); return; }
    if (t.id === "cart-overlay") { close(); return; }
    if (t.id === "to-details") { startDetails(); return; }
    if (t.getAttribute("data-back")) { showStep(t.getAttribute("data-back")); return; }
    var dec = t.getAttribute("data-dec"); if (dec) { var r = find(getCart(), dec); if (r) setQty(dec, r.qty - 1); return; }
    var inc = t.getAttribute("data-inc"); if (inc) { var r2 = find(getCart(), inc); if (r2) setQty(inc, r2.qty + 1); return; }
    var rm = t.getAttribute("data-rm"); if (rm) { remove(rm); return; }
  });
  document.addEventListener("submit", function (e) { if (e.target && e.target.id === "details-form") submitDetails(e); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  /* ---- expose for product buttons ----------------------------------------- */
  window.SANchaCart = { add: add, open: open, close: close, count: count, total: total };
  renderCount();
})();
