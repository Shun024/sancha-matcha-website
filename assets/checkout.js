/* SANcha — cart + SumUp checkout (frontend).  [SCAFFOLD]
 *
 * Talks to the checkout Apps Script web app (CHECKOUT_ENDPOINT) and mounts the
 * SumUp card widget. Product data comes from the same Google Sheet the tins use,
 * but PRICE + STOCK are re-validated server-side before any payment.
 *
 * Needs in index.html:
 *   <script src="https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"></script>
 *   <script src="assets/checkout.js" defer></script>
 *   a basket button, a drawer container, and a <div id="sumup-card"></div> in the checkout view.
 */
(function () {
  "use strict";

  // Paste the checkout Apps Script "/exec" URL here to go live (sandbox first).
  var CHECKOUT_ENDPOINT = "";

  /* ---- cart state (persisted) --------------------------------------------- */
  var CART_KEY = "sancha_cart";
  function getCart()  { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (_) { return []; } }
  function saveCart(c){ localStorage.setItem(CART_KEY, JSON.stringify(c)); renderCount(); }
  function add(id, name, price) {
    var c = getCart(), row = find(c, id);
    if (row) row.qty++; else c.push({ id: id, name: name, price: Number(price) || 0, qty: 1 });
    saveCart(c); openDrawer(); renderDrawer();
  }
  function setQty(id, qty) {
    var c = getCart().map(function (x) { if (x.id === id) x.qty = qty; return x; })
                     .filter(function (x) { return x.qty > 0; });
    saveCart(c); renderDrawer();
  }
  function find(c, id) { for (var i = 0; i < c.length; i++) if (c[i].id === id) return c[i]; return null; }
  function count()     { return getCart().reduce(function (t, x) { return t + x.qty; }, 0); }
  function total()     { return getCart().reduce(function (t, x) { return t + x.price * x.qty; }, 0); }

  /* ---- UI (TODO: flesh out markup/styles) --------------------------------- */
  function renderCount()  { var b = document.getElementById("cart-count"); if (b) { b.textContent = count(); b.hidden = count() === 0; } }
  function openDrawer()   { var d = document.getElementById("cart-drawer"); if (d) d.classList.add("open"); }
  function closeDrawer()  { var d = document.getElementById("cart-drawer"); if (d) d.classList.remove("open"); }
  function renderDrawer() { /* TODO: list items + qty steppers + subtotal + "Checkout" button into #cart-items */ }

  /* ---- checkout orchestration --------------------------------------------- */
  // customer = { name, email, address, ... } collected from the checkout form.
  function startCheckout(customer) {
    if (!getCart().length) return;
    post({ action: "createCheckout", cart: getCart(), customer: customer })
      .then(function (res) {
        if (!res || res.error) throw new Error((res && res.error) || "createCheckout failed");
        mountWidget(res.checkoutId);
      })
      .catch(showError);
  }

  function mountWidget(checkoutId) {
    if (!window.SumUpCard) { showError("SumUp SDK not loaded"); return; }
    SumUpCard.mount({
      id: "sumup-card",               // the <div id="sumup-card"> in the checkout view
      checkoutId: checkoutId,
      onResponse: function (type, body) {
        if (type === "success") finalize(checkoutId);
        else if (type === "fail" || type === "error") showError(body);
        // "sent" / "invalid" / "auth-screen" → let the widget handle it
      }
    });
  }

  function finalize(checkoutId) {
    post({ action: "finalizeOrder", checkoutId: checkoutId })
      .then(function (res) {
        if (res && res.ok) { localStorage.removeItem(CART_KEY); renderCount(); showConfirmation(res); }
        else showError(res);
      })
      .catch(showError);
  }

  /* ---- helpers ------------------------------------------------------------ */
  function post(body) {
    if (!CHECKOUT_ENDPOINT) return Promise.reject("CHECKOUT_ENDPOINT is empty");
    // text/plain keeps it a "simple" request so the browser skips the CORS
    // preflight that Apps Script can't answer. The backend reads e.postData.contents.
    return fetch(CHECKOUT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function showConfirmation(res) { /* TODO: success screen with the order reference */ console.log("[checkout] PAID", res); }
  function showError(e)          { console.error("[checkout] error", e); /* TODO: user-facing message */ }

  /* ---- expose for product + drawer buttons -------------------------------- */
  window.SANchaCart = { add: add, setQty: setQty, open: openDrawer, close: closeDrawer, startCheckout: startCheckout, count: count, total: total };
  renderCount();
})();
