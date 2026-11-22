/* SANcha — shared site app: product/shop/FAQ/wholesale feeds, product detail pages,
   cart card clicks, and form handlers. Defensive (acts only on elements present on
   the current page), so it's safe to load on every page. */
  // Form submissions (tins waiting list + wholesale enquiries) POST to ONE Google Apps Script
  // Web App "/exec" URL — paste it between the quotes below. The doPost script (see
  // SHEET-UPDATES.md) routes by `source`: waitlist rows go to a "Waitlist" tab; wholesale
  // enquiries go to a "Wholesale Enquiries" tab with one column per question (adding a new
  // question adds a new column automatically). While empty, forms validate + thank the
  // visitor but do NOT store anything yet.
  var FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbwtkNq6TlNUQs-lNE_40Q0Ikm03GZuTHOYd8octUnMnZIvsY9-M4DyPOtzooybksyvpoA/exec";

  function handleSubscribe(e){
    e.preventDefault();
    var f=e.target;
    if(f.elements['company'] && f.elements['company'].value){return false;}   // honeypot = bot, drop
    var nameEl=f.elements['name'], email=f.elements['email'], consent=f.elements['consent'];
    if(!nameEl.value.trim()){nameEl.reportValidity();return false;}
    if(!email.value || !email.checkValidity()){email.reportValidity();return false;}
    if(consent && !consent.checked){consent.reportValidity();return false;}    // marketing opt-in required
    var btn=f.querySelector('button');
    var done=function(){ f.reset(); if(btn){btn.textContent="You're on the list ✓";btn.disabled=true;} };
    if(FORM_ENDPOINT){
      if(btn){btn.textContent='…';btn.disabled=true;}
      var body=new URLSearchParams({name:nameEl.value.trim(), email:email.value.trim(),
                                    consent:(consent&&consent.checked)?'yes':'', source:'tins-waitlist'});
      fetch(FORM_ENDPOINT,{method:'POST',mode:'no-cors',
            headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body})
        .then(done)
        .catch(function(){ if(btn){btn.textContent='Try again';btn.disabled=false;} });
    } else {
      console.warn('Waitlist: FORM_ENDPOINT is empty — not stored yet. Paste your Apps Script URL to go live.');
      done();
    }
    return false;
  }

  // Wholesale enquiry. Posts every named field using its label as the key, so the "Wholesale
  // Enquiries" tab gets one column per question. Fields are whatever the WholesaleForm sheet
  // tab defines (or the built-in fallback set). Required fields use native HTML validation.
  function handleWholesale(e){
    e.preventDefault();
    var f=e.target;
    if(f.elements['company_hp'] && f.elements['company_hp'].value){return false;}   // honeypot
    if(!f.checkValidity()){ f.reportValidity(); return false; }
    var btn=f.querySelector('button[type="submit"]');
    var done=function(){ f.reset(); if(btn){btn.textContent='Enquiry sent ✓';btn.disabled=true;} };
    if(FORM_ENDPOINT){
      if(btn){btn.textContent='…';btn.disabled=true;}
      var data=new URLSearchParams();
      Array.prototype.forEach.call(f.elements,function(el){
        if(!el.name || el.name==='company_hp') return;
        if((el.type==='checkbox'||el.type==='radio') && !el.checked) return;
        if(!el.value) return;
        data.append(el.name, el.value);
      });
      data.append('source','wholesale-enquiry');
      fetch(FORM_ENDPOINT,{method:'POST',mode:'no-cors',
            headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data})
        .then(done)
        .catch(function(){ if(btn){btn.textContent='Try again';btn.disabled=false;} });
    } else {
      console.warn('Wholesale: FORM_ENDPOINT is empty — not stored yet. Paste your Apps Script URL to go live.');
      done();
    }
    return false;
  }

  // Generic form submit for the contact + returns forms. Posts every named field
  // (label = column) + a `source` tag; the forms Apps Script routes it to a tab and
  // sends an auto-reply. `okText` is the confirmation shown in the form's .form-msg.
  function submitSimpleForm(e, source, okText){
    e.preventDefault();
    var f=e.target;
    if(f.elements['company_hp'] && f.elements['company_hp'].value){return false;}   // honeypot
    if(!f.checkValidity()){ f.reportValidity(); return false; }
    var btn=f.querySelector('button[type="submit"]'), msg=f.querySelector('.form-msg');
    var done=function(){ f.reset(); if(btn){btn.style.display='none';} if(msg){msg.hidden=false;msg.textContent=okText;} };
    if(FORM_ENDPOINT){
      if(btn){btn.textContent='…';btn.disabled=true;}
      var data=new URLSearchParams();
      Array.prototype.forEach.call(f.elements,function(el){
        if(!el.name || el.name==='company_hp') return;
        if((el.type==='checkbox'||el.type==='radio') && !el.checked) return;
        if(!el.value) return;
        data.append(el.name, el.value);
      });
      data.append('source',source);
      fetch(FORM_ENDPOINT,{method:'POST',mode:'no-cors',
            headers:{'Content-Type':'application/x-www-form-urlencoded'},body:data})
        .then(done)
        .catch(function(){ if(btn){btn.textContent='Try again';btn.disabled=false;} });
    } else {
      console.warn(source+': FORM_ENDPOINT is empty — not stored yet.');
      done();
    }
    return false;
  }
  function handleContact(e){ return submitSimpleForm(e,'contact',"Thanks — we've got your message and will reply soon ✓"); }
  function handleReturn(e){ return submitSimpleForm(e,'returns-request',"Thanks — we've received your return request and will be in touch ✓"); }


(function () {
  // 1) Paste each tab's published-to-web CSV link between the quotes below.
  //    (Google Sheet › File › Share › Publish to web › pick the tab › CSV.)
  //    Leave any blank to keep that section's built-in cards. See SHEET-SETUP.md.
  var SHEET = {
    tins:      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1IYWaAhwgZnA3V5ekw7lOYANzVZ43oxpMzHYyfpQx46am7Pkjzxc8lIx73XepoqgYSmV6a1A1oFp/pub?gid=2006886247&single=true&output=csv",   // Tins tab
    shop:      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1IYWaAhwgZnA3V5ekw7lOYANzVZ43oxpMzHYyfpQx46am7Pkjzxc8lIx73XepoqgYSmV6a1A1oFp/pub?gid=465562058&single=true&output=csv",   // Shop tab
    wholesale: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1IYWaAhwgZnA3V5ekw7lOYANzVZ43oxpMzHYyfpQx46am7Pkjzxc8lIx73XepoqgYSmV6a1A1oFp/pub?gid=739120538&single=true&output=csv",   // Wholesale tab
    faq:           "https://docs.google.com/spreadsheets/d/e/2PACX-1vTf1IYWaAhwgZnA3V5ekw7lOYANzVZ43oxpMzHYyfpQx46am7Pkjzxc8lIx73XepoqgYSmV6a1A1oFp/pub?gid=1195687923&single=true&output=csv",   // FAQ tab
    wholesaleform: ""    // Wholesale enquiry FORM fields — publish the "WholesaleForm" tab (question/type/options/required/placeholder) as CSV and paste its link here
  };

  // ---- shared helpers -------------------------------------------------------
  function parseCSV(text) { // handles quoted fields, commas & newlines in quotes
    var rows = [], row = [], field = "", i = 0, c, inQ = false;
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (; i < text.length; i++) {
      c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }
  function rowsToObjects(rows) {
    if (!rows.length) return [];
    var headers = rows[0].map(function (h) { return h.trim().toLowerCase(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) { o[h] = (r[idx] || "").trim(); });
      return o;
    });
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m];
    });
  }
  function visible(p) { // default TRUE; hide on false/no/0/hide
    var v = (p.visible == null ? "true" : p.visible).trim();
    return v !== "" && !/^(false|no|0|hide|hidden)$/i.test(v);
  }
  function pipes(s) {
    return (s || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
  }
  // Turn a value from an `image` column into a usable <img> URL. A Google Drive
  // share link (or any Drive URL with a file id) is rewritten to Drive's image
  // endpoint so photos can be added straight from the sheet. Anything else
  // (a repo path like assets/x.png, or a direct image URL) is used as-is.
  function imageUrl(v) {
    v = (v || "").trim();
    if (!v) return "";
    if (/drive\.google\.com/.test(v)) {
      var m = v.match(/\/d\/([-\w]{20,})/) || v.match(/[?&]id=([-\w]{20,})/);
      if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1000";
    }
    return v;
  }

  // ---- per-section renderers ------------------------------------------------
  // Products with hand-drawn logo artwork. Auto-matched by name so IKI/YUAN show
  // their real logo with no sheet change; an `image` column in the sheet overrides.
  var TIN_LOGOS = { iki: "assets/product-iki.png", yuan: "assets/product-yuan.png" };
  var TINS = {};   // name(lowercased) → product object, for the detail pop-up

  // Top-left product badges. Sheet columns `badge` (type label) + `new` (yes/no) override
  // these per-tin defaults. Type badge = red/pink; NEW badge = pink/red.
  var TIN_BADGE_DEFAULTS = { iki:{badge:"Signature Blend",isNew:true}, yuan:{badge:"Single Cultivar",isNew:true} };

  // Product-detail-page copy. Per-tin defaults; sheet columns
  // lede / meet / origin / harvest / cultivar / taste override these if present.
  var TIN_DETAILS = {
    iki: {
      lede: "The matcha we serve in store. First-harvest Zhejiang tea with Longjing’s toasty depth and Yabukita’s savoury umami.",
      meet: "Grown in Zhejiang, China and picked at first harvest, IKI pairs Longjing’s toasty, chestnut-sweet depth with Yabukita’s bright, savoury umami. Rich, vivid green, with an aroma of dark chocolate, built to stand up to milk, ice, or a straight whisk.",
      origin: "Zhejiang, China", harvest: "First Harvest",
      cultivar: "Longjing #43, Yabukita", taste: "Nutty, Toasty, Savoury, Bold bitter finish"
    },
    yuan: {
      lede: "Single-cultivar Yabukita from Zhejiang, China. Smooth, savoury, and umami-rich.",
      meet: "Grown in Zhejiang, China, YUAN is pure Yabukita with nothing blended in. Bright, savoury umami with a smooth, easy finish. A clean, approachable cup that’s easy to enjoy straight whisked or in a latte.",
      origin: "Zhejiang, China", harvest: "First Harvest",
      cultivar: "Yabukita", taste: "Savoury, Umami, Smooth"
    }
  };
  function tinBadges(p){
    var key=(p.roman||p.name||"").toLowerCase(), def=TIN_BADGE_DEFAULTS[key]||{};
    var isNew = (p.new!=null && String(p.new).trim()!=="") ? /^(true|yes|1|new)$/i.test(String(p.new).trim()) : !!def.isNew;
    // Type badge (e.g. "Signature Blend" / "Single Cultivar") from the sheet `badge`
    // column, falling back to the per-tin default. Plus the optional "New" badge.
    var type = (p.badge!=null && String(p.badge).trim()!=="") ? String(p.badge).trim() : (def.badge||"");
    var html = (type?'<span class="tin-badge">'+esc(type)+'</span>':'') +
               (isNew?'<span class="tin-badge is-new">New</span>':'');
    return html?'<div class="tin-badges">'+html+'</div>':'';
  }

  function renderTin(p) {
    var tinKey = String(p.name || "").trim().toLowerCase();
    TINS[tinKey] = p;   // remember the full object so the pop-up can show everything
    // IKI is the matcha served in the physical store — small italic note under its name.
    var serveNote = (tinKey === "iki") ? '<div class="tin-serve">the matcha we serve in store</div>' : '';
    // Option 2 checkout: "Add to basket" when there's a numeric price + stock; sold-out otherwise.
    var priceNum = parseFloat(String(p.price || '').replace(/[^0-9.]/g, '')) || 0;
    var stock = (p.stock != null && String(p.stock).trim() !== '') ? parseInt(p.stock, 10) : null;
    var soldOut = stock != null && stock <= 0;
    // Image used both for the card and as the basket line thumbnail.
    var cartImg = imageUrl(p.image) || TIN_LOGOS[(p.roman || p.name || "").toLowerCase()] || "";
    var buy = '';
    if (priceNum > 0 && !soldOut) {
      buy = '<button class="btn btn-solid tin-buy add-btn" data-id="' + esc(p.name) + '" data-name="' + esc(p.name) + '" data-price="' + priceNum + '" data-image="' + esc(cartImg) + '">Add to basket</button>';
    } else if (soldOut) {
      buy = '<button class="btn btn-ghost tin-buy notify-btn" data-id="' + esc(p.name) + '" data-name="' + esc(p.name) + '">Notify me when back in stock</button>';
    }
    // Simplified card: name + subtitle (above), size + price here; full details on the
    // product page (reached by clicking the card). Add-to-basket / notify below.
    var body =
        '<div class="tin-foot"><span class="sizes">' + esc(p.sizes) + '</span>' +
          '<span class="price">' + esc(p.price) + '</span></div>' + buy;

    var logo = cartImg;
    // Optional second image that fades in on hover (sheet column "hover_image").
    var hoverImg = p.hover_image ? imageUrl(p.hover_image) : "";
    if (logo) {
      return '<div class="tin-card" data-tin-key="' + esc(tinKey) + '">' + tinBadges(p) +
          '<div class="tin-logo"><img src="' + esc(logo) + '" alt="' + esc(p.name) + ' matcha" loading="lazy">' +
            (hoverImg ? '<img class="tin-hover" src="' + esc(hoverImg) + '" alt="" loading="lazy">' : '') + '</div>' +
          '<div class="tin-head"><h3>' + esc(p.name) + '</h3>' +
            (p.subtitle ? '<div class="sub">' + esc(p.subtitle) + '</div>' : '') + serveNote + '</div>' +
          body +
        '</div>';
    }

    var from = p.tin_from || "#7c8a63", to = p.tin_to || "#4c5541";
    return '<div class="tin-card" data-tin-key="' + esc(tinKey) + '">' + tinBadges(p) +
        '<div class="tin-top">' +
          '<div class="tin" style="background:linear-gradient(160deg,' + esc(from) + ',' + esc(to) + ')">' +
            '<div class="kanji">' + esc(p.kanji) + '</div>' +
            '<div class="rom">' + esc(p.roman || p.name) + '</div>' +
          '</div>' +
          '<div><h3>' + esc(p.name) + '</h3>' +
            (p.subtitle ? '<div class="sub">' + esc(p.subtitle) + '</div>' : '') + serveNote + '</div>' +
        '</div>' +
        body +
      '</div>';
  }

  var SHOP_ICONS = { // named presets so the sheet just picks one by name
    tin:  '<rect x="14" y="12" width="20" height="28" rx="3"/><path d="M17 12v-2h14v2"/><path d="M18 22h12"/>',
    merch:'<path d="M12 18h24l-2 22H14z"/><path d="M18 18a6 6 0 0 1 12 0"/>',
    gift: '<rect x="10" y="16" width="28" height="20" rx="2"/><path d="M10 24h28M24 16v20"/><path d="M24 16c-3-6-9-4-9 0M24 16c3-6 9-4 9 0"/>'
  };
  function renderShop(p) {
    var head = '<h3>' + esc(p.title) + '</h3>' +
        (p.description ? '<p>' + esc(p.description) + '</p>' : '') +
        (p.note ? '<span class="soon">' + esc(p.note) + '</span>' : '') +
        (p.buy_url ? '<a class="btn btn-solid tin-buy" href="' + esc(p.buy_url) + '" target="_blank" rel="noopener">Buy now</a>' : '');
    // Optional "link" column makes the whole card a link (e.g. Tinned Matcha → #tins).
    var tag = p.link ? "a" : "div", attr = p.link ? ' href="' + esc(p.link) + '"' : "";
    // `image` column (photo or Google Drive link) takes priority; else the icon preset.
    var img = imageUrl(p.image);
    if (img) {
      return "<" + tag + ' class="cat"' + attr + '>' +
          '<div class="cat-img"><img src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy"></div>' +
          head +
        "</" + tag + ">";
    }
    var paths = SHOP_ICONS[(p.icon || "tin").toLowerCase()] || SHOP_ICONS.tin;
    return "<" + tag + ' class="cat"' + attr + '>' +
        '<svg class="ic" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">' + paths + '</svg>' +
        head +
      "</" + tag + ">";
  }

  function renderWholesale(p) {
    var img = imageUrl(p.image);
    var thumb = img ? '<img class="thumb" src="' + esc(img) + '" alt="' + esc(p.title) + '" loading="lazy">' : '';
    return '<div class="b2b-opt">' +
        '<div class="wl-main">' + thumb +
          '<div class="lft"><h3>' + esc(p.title) + '</h3>' +
            (p.description ? '<p>' + esc(p.description) + '</p>' : '') + '</div>' +
        '</div>' +
        '<div class="rgt">' + esc(p.action) + '</div></div>';
  }

  // FAQ items from a sheet tab with `question` + `answer` columns.
  function renderFAQ(p) {
    return '<details class="faq-item"><summary>' + esc(p.question) + '</summary>' +
        '<p>' + esc(p.answer) + '</p></details>';
  }

  // Wholesale enquiry FORM fields from a sheet tab. Columns: question / type / options /
  // required / placeholder (+ visible). type = text | email | tel | number | textarea | select.
  // The question text is used as the field name, so it becomes the response column header.
  function renderField(p) {
    var name = p.question;
    var type = (p.type || "text").toLowerCase();
    var req = /^(true|yes|1|required|y)$/i.test((p.required || "").trim()) ? " required" : "";
    var ph = p.placeholder ? ' placeholder="' + esc(p.placeholder) + '"' : "";
    var field;
    if (type === "textarea") {
      field = '<textarea name="' + esc(name) + '" rows="3"' + req + ph + "></textarea>";
    } else if (type === "select") {
      var opts = (p.options || "").split(/[|,]/).map(function (s) { return s.trim(); }).filter(Boolean);
      field = '<select name="' + esc(name) + '"' + req + '><option value="">Select…</option>' +
        opts.map(function (o) { return "<option>" + esc(o) + "</option>"; }).join("") + "</select>";
    } else {
      var t = /^(email|tel|number)$/.test(type) ? type : "text";
      field = '<input type="' + t + '" name="' + esc(name) + '"' + req + ph + ">";
    }
    return '<label class="wf-field"><span class="wf-q">' + esc(name) + "</span>" + field + "</label>";
  }

  // ---- loader ---------------------------------------------------------------
  // ?demo=1 renders every section from the local sample CSVs so you can preview
  // the sheet-driven layout before wiring up Google Sheets.
  var params = new URLSearchParams(location.search);
  var demo = params.get("demo") === "1";
  var FEEDS = [
    { grid: "tins-grid",      key: "tins",      demoCsv: "assets/product-sheet-template.csv",   render: renderTin,   needs: "name" },
    { grid: "shop-grid",      key: "shop",      demoCsv: "assets/shop-sheet-template.csv",       render: renderShop,  needs: "title" },
    { grid: "wholesale-grid", key: "wholesale", demoCsv: "assets/wholesale-sheet-template.csv",  render: renderWholesale, needs: "title" },
    { grid: "faq-list",       key: "faq",       demoCsv: "assets/faq-sheet-template.csv",        render: renderFAQ,       needs: "question" },
    { grid: "wholesale-fields", key: "wholesaleform", demoCsv: "assets/wholesale-form-template.csv", render: renderField, needs: "question" }
  ];

  FEEDS.forEach(function (feed) {
    var grid = document.getElementById(feed.grid);
    if (!grid) return;
    var url = params.get(feed.key + "_csv") || (demo ? feed.demoCsv : SHEET[feed.key]);
    if (!url) return; // not configured → keep this section's static fallback

    fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
      .then(function (text) {
        var rows = rowsToObjects(parseCSV(text)).filter(function (p) {
          return p[feed.needs] && visible(p);
        });
        if (!rows.length) return; // nothing usable → keep the static fallback
        grid.innerHTML = rows.map(feed.render).join("");
        if (feed.key === "tins" && productSlug) renderProductPage();   // feed drives the product page
      })
      .catch(function (err) { // offline / bad link / private sheet → keep fallback
        console.warn("[SANcha] '" + feed.key + "' sheet not loaded; showing built-in content.", err);
        if (feed.key === "tins" && productSlug) renderProductPage();
      });
  });

  // ---- separate product page: /matcha/<slug>/ (or legacy ?tin=<slug>) --------
  var productSlug = (function () {
    var m = location.pathname.match(/\/matcha\/([^\/]+)\/?$/);
    return (m ? decodeURIComponent(m[1]) : (params.get("tin") || "")).trim().toLowerCase();
  })();

  // Build URLs relative to the site root so they work at the domain root AND under
  // a subpath (e.g. the /sancha-preview/ preview). Preserves ?tins_csv overrides.
  function siteRoot() {
    var m = location.pathname.match(/^(.*\/)matcha\/[^\/]+\/?$/);
    return (m ? m[1] : location.pathname.replace(/[^\/]*$/, "")) || "/";
  }
  function urlForTin(slug) { return siteRoot() + "matcha/" + encodeURIComponent(slug) + "/" + location.search; }
  function urlHome()       { return siteRoot() + location.search; }

  // Product-page gallery state + navigation (arrows / thumbnails / keyboard).
  var PP_GALLERY = [], PP_INDEX = 0;
  function showImage(i) {
    if (!PP_GALLERY.length) return;
    PP_INDEX = (i + PP_GALLERY.length) % PP_GALLERY.length;   // wrap around
    var main = document.querySelector("#product-page .pp-art img");
    if (main) main.src = PP_GALLERY[PP_INDEX];
    var cur = document.querySelector("#product-page .pp-cur");
    if (cur) cur.textContent = PP_INDEX + 1;
    Array.prototype.forEach.call(document.querySelectorAll("#product-page .pp-thumb"),
      function (btn, n) { btn.classList.toggle("active", n === PP_INDEX); });
  }

  // Preparation steps + ingredients shown on every matcha product page. Sheet
  // columns `instructions` (steps split on "|" or newlines) and `ingredients`
  // override these defaults per product.
  var PREP_STEPS_DEFAULT = [
    "Sift 4g of matcha and add 40ml of 70°C water.",
    "Whisk with a “W” or a “M” motion until a fine layer of foam forms.",
    "Enjoy it with 120ml of water or milk of your choice."
  ];
  var INGREDIENTS_DEFAULT = "100% matcha green tea powder";

  function renderProductPage() {
    var host = document.getElementById("product-page-inner");
    if (!host) return;
    document.documentElement.classList.add("product-mode");
    // Nav/footer links are already absolute + site-wide (injected by site.js), so no
    // repointing is needed. Just build the "all matcha" link back to the homepage.
    var back = '<a class="pp-back" href="' + urlHome() + '#tins">&larr; All matcha</a>';
    var p = TINS[productSlug];
    if (!p) {
      host.innerHTML = back + '<p style="color:var(--muted);font-size:17px">Sorry, we couldn\'t find that product.</p>';
      document.title = "Matcha — SANcha"; return;
    }
    // Gallery: main image + extras from sheet columns image, image2 … image6 (Drive links ok).
    var gallery = [p.image, p.image2, p.image3, p.image4, p.image5, p.image6]
      .filter(function (x) { return x && String(x).trim(); })
      .map(function (x) { return imageUrl(x); });
    if (!gallery.length) { var fb = TIN_LOGOS[(p.roman || p.name || "").toLowerCase()]; if (fb) gallery = [fb]; }
    var mainImg = gallery[0] || "";
    // Stash the gallery so the arrow/thumbnail handlers can page through it.
    PP_GALLERY = gallery; PP_INDEX = 0;
    var arrows = gallery.length > 1
      ? '<button type="button" class="pp-arrow pp-prev" aria-label="Previous image">&#8249;</button>' +
        '<button type="button" class="pp-arrow pp-next" aria-label="Next image">&#8250;</button>' +
        '<div class="pp-count"><span class="pp-cur">1</span> / ' + gallery.length + '</div>'
      : "";
    var art = mainImg
      ? tinBadges(p) + '<img src="' + esc(mainImg) + '" alt="' + esc(p.name) + ' matcha">' + arrows
      : tinBadges(p) + '<div class="tin" style="background:linear-gradient(160deg,' +
          esc(p.tin_from || "#7c8a63") + ',' + esc(p.tin_to || "#4c5541") + ')">' +
          '<div class="kanji">' + esc(p.kanji || "") + '</div>' +
          '<div class="rom">' + esc(p.roman || p.name) + '</div></div>';
    var thumbs = gallery.length > 1
      ? '<div class="pp-thumbs">' + gallery.map(function (src, i) {
          return '<button type="button" class="pp-thumb' + (i === 0 ? ' active' : '') + '" data-full="' + esc(src) + '">' +
                 '<img src="' + esc(src) + '" alt="" loading="lazy"></button>';
        }).join("") + '</div>'
      : "";
    var priceNum = parseFloat(String(p.price || "").replace(/[^0-9.]/g, "")) || 0;
    var stock = (p.stock != null && String(p.stock).trim() !== "") ? parseInt(p.stock, 10) : null;
    var soldOut = stock != null && stock <= 0;
    var buy = (priceNum > 0 && !soldOut)
      ? '<button class="btn btn-solid add-btn" data-id="' + esc(p.name) + '" data-name="' + esc(p.name) + '" data-price="' + priceNum + '" data-image="' + esc(mainImg) + '">Add to basket</button>'
      : (soldOut ? '<button class="btn btn-ghost notify-btn" data-id="' + esc(p.name) + '" data-name="' + esc(p.name) + '">Notify me when back in stock</button>' : "");
    var d = TIN_DETAILS[(p.roman || p.name || "").toLowerCase()] || {};
    var lede = p.lede || d.lede || p.description || "";
    var meet = p.meet || d.meet || "";
    var specRows = [["Origin", p.origin || d.origin], ["Harvest", p.harvest || d.harvest],
                    ["Cultivar", p.cultivar || d.cultivar], ["Taste", p.taste || d.taste]]
      .filter(function (r) { return r[1]; })
      .map(function (r) { return "<div><dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("");
    var steps = (p.instructions ? String(p.instructions).split(/\s*\|\s*|\n+/) : PREP_STEPS_DEFAULT)
      .map(function (s) { return String(s).trim(); }).filter(Boolean);
    var ingredients = (p.ingredients && String(p.ingredients).trim()) || INGREDIENTS_DEFAULT;
    host.innerHTML = back +
      '<div class="pp-grid">' +
        '<div class="pp-art-wrap"><div class="pp-art">' + art + '</div>' + thumbs + '</div>' +
        '<div class="pp-info">' +
          (p.kanji ? '<div class="pp-kanji">' + esc(p.kanji) + '</div>' : "") +
          '<h1>' + esc(p.name) + '</h1>' +
          (p.subtitle ? '<div class="sub">' + esc(p.subtitle) + '</div>' : "") +
          (lede ? '<p class="desc">' + esc(lede) + '</p>' : "") +
          (meet ? '<h3 class="pp-meet-h">Meet your matcha</h3><p class="pp-meet">' + esc(meet) + '</p>' : "") +
          (specRows ? '<dl class="pp-spec">' + specRows + '</dl>' : "") +
          (steps.length ? '<details class="pp-acc"><summary>Instructions</summary><ol class="pp-steps">' +
            steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ol></details>' : "") +
          (ingredients ? '<details class="pp-acc"><summary>Ingredients</summary><p class="pp-meet">' + esc(ingredients) + '</p></details>' : "") +
          '<div class="pp-foot"><span class="sizes">' + esc(p.sizes || "") + '</span>' +
            '<span class="price">' + esc(p.price || "") + '</span></div>' + buy +
        '</div>' +
      '</div>';
    document.title = p.name + " — SANcha Matcha";
    window.scrollTo(0, 0);
  }

  // Clicking anywhere on a tin card opens its own page — except the add-to-basket
  // / notify controls, which keep their own behaviour.
  document.addEventListener("click", function (e) {
    var t = e.target; if (!t || !t.closest) return;
    // Product-page gallery navigation: arrows + thumbnails.
    if (t.closest(".pp-next")) { showImage(PP_INDEX + 1); return; }
    if (t.closest(".pp-prev")) { showImage(PP_INDEX - 1); return; }
    var thumb = t.closest(".pp-thumb");
    if (thumb) {
      var thumbs = [].slice.call(document.querySelectorAll("#product-page .pp-thumb"));
      showImage(thumbs.indexOf(thumb));
      return;
    }
    if (t.closest(".add-btn, .notify-btn, .notify-form")) return;
    var card = t.closest(".tin-card"), slug = card && card.getAttribute("data-tin-key");
    if (slug) { e.preventDefault(); location.href = urlForTin(slug); }
  });

  // Keyboard: left/right arrows page the product gallery (when on a product page).
  document.addEventListener("keydown", function (e) {
    if (!document.documentElement.classList.contains("product-mode") || PP_GALLERY.length < 2) return;
    if (e.key === "ArrowRight") showImage(PP_INDEX + 1);
    else if (e.key === "ArrowLeft") showImage(PP_INDEX - 1);
  });

  // Touch: swipe left/right on the main image to page the gallery (mobile).
  (function () {
    var x0 = null, y0 = null;
    function inArt(t) { return t && t.closest && t.closest("#product-page .pp-art"); }
    document.addEventListener("touchstart", function (e) {
      if (PP_GALLERY.length < 2 || !inArt(e.target)) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    document.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      // horizontal swipe only (ignore vertical scrolls); ~40px threshold
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) showImage(PP_INDEX + (dx < 0 ? 1 : -1));
      x0 = y0 = null;
    }, { passive: true });
  })();
})();
