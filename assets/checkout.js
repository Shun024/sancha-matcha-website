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
    var titles = { basket: "Your basket", details: "Delivery details", payment: "Payment", done: "Order confirmed" };
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
    startCheckout(customer);
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
    post({ action: "finalizeOrder", checkoutId: checkoutId })
      .then(function (res) {
        console.log("[checkout] finalizeOrder response:", res);
        if (res && res.ok) {
          localStorage.removeItem(CART_KEY); renderCount(); renderDrawer();
          if (res.reference && el("done-msg"))
            el("done-msg").textContent = "Your order (" + res.reference + ") is confirmed. A confirmation email is on its way.";
          showStep("done");
        } else {
          payError(res && res.status ? "Payment status: " + res.status : "Couldn't confirm the order — please contact us.");
        }
      })
      .catch(payError);
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
