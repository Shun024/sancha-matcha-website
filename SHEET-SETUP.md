# Edit the website content from a Google Sheet (no code)

Three sections of the homepage can be edited by anyone from a Google Sheet — change
a price, tasting note, or add a product, and the site updates within seconds of a
refresh. No code, no developer, no deploy.

| Section on the site | What it controls | Sheet tab | Starter file |
|---|---|---|---|
| **Tinned Matcha** (IKI / YUAN cards) | name, kanji, copy, cultivars, sizes, price, tin colours | `Tins` | `assets/product-sheet-template.csv` |
| **The Shop** (3 cards) | title, description, “coming soon” note, icon | `Shop` | `assets/shop-sheet-template.csv` |
| **Wholesale** (500g / 1kg / 10kg+) | title, description, right-hand label | `Wholesale` | `assets/wholesale-sheet-template.csv` |

Set up once by a technical person (steps 1–3). After that, **anyone** just edits the
spreadsheet (step 4).

---

## Preview it first (local, optional)

You can see exactly how the sheet-driven layout looks before touching Google Sheets:

```bash
# from the project folder
python3 -m http.server 8000
```

Then open <http://localhost:8000/index.html?demo=1>. The `?demo=1` makes all three
sections render from the sample CSVs in `assets/`. Edit those CSV files, refresh, and
watch the cards change — that’s the same mechanism the live sheet uses.

> You can also point a single section at any CSV with a URL parameter, e.g.
> `?tins_csv=assets/product-sheet-template.csv` — handy for testing one tab.

---

## One-time setup (≈10 minutes)

### 1. Create the sheet with three tabs
- Create a new sheet at <https://sheets.google.com>.
- For **each** section, add a tab and import its starter file so the columns are right:
  **File › Import › Upload**, choose the matching `assets/*-template.csv`, and pick
  **“Insert new sheet(s)”**. Rename the tabs `Tins`, `Shop`, `Wholesale`.
- (You can start with just the `Tins` tab and add the others later.)

### 2. Publish each tab as CSV
- **File › Share › Publish to web**.
- Under *Link*, choose the **tab** (e.g. `Tins`) and format **Comma-separated values (.csv)**.
- **Publish**, confirm, and **copy the link**. Repeat for each tab. Each looks like:
  `https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv`

  > This only exposes those tabs as read-only data. It does **not** give anyone edit
  > access to your account or the sheet.

### 3. Paste the links into the site (once)
- Open `index.html`, find the `SHEET` block near the bottom (in the “SHEET-DRIVEN
  CONTENT” script), and paste each link:
  ```js
  var SHEET = {
    tins:      "https://docs.google.com/.../pub?gid=0&single=true&output=csv",
    shop:      "https://docs.google.com/.../pub?gid=111&single=true&output=csv",
    wholesale: "https://docs.google.com/.../pub?gid=222&single=true&output=csv"
  };
  ```
  Leave any blank to keep that section’s built-in cards. Commit & push — done.

---

## Everyday editing (anyone, forever after)

### 4. Just edit the spreadsheet
- Change any cell — live on the next refresh.
- **Add an item:** add a row. **Remove/hide:** set `visible` to `FALSE` (back to
  `TRUE` to show again). **Reorder:** items follow the row order.
- If the sheet is ever unreachable, the site falls back to the built-in cards, so it
  never looks broken.

---

## Columns per tab

### Tins
| Column | Meaning | Example |
|---|---|---|
| `name` | Product name (heading + on the tin) | `IKI` |
| `kanji` | Character shown large on the tin | `粋` |
| `roman` | Small letters under the kanji (defaults to `name`) | `IKI` |
| `subtitle` | Small line under the name | `Signature Blend` |
| `description` | Paragraph of copy | `Two exceptional cultivars…` |
| `cultivars` | Tags — separate each with `\|` (pipe) | `Longjing 43 · nutty \| Yabukita · umami` |
| `for_who` | Italic “for those who…” line | `For those who appreciate balance.` |
| `sizes` | Sizes line (bottom-left) | `30g tin · 500g coming soon` |
| `price` | Price (bottom-right) — free text | `£28` or `Price coming soon` |
| `tin_from` / `tin_to` | *(optional)* tin gradient colours (hex) | `#7c8a63` / `#4c5541` |
| `image` | *(optional)* product photo/logo — see below | Google Drive link, or `assets/x.png` |
| `visible` | `TRUE` shows, `FALSE` hides | `TRUE` |

**A tin needs no photo** — if `image` is blank it's drawn from the kanji + colours (that's
what SAN and LIN do). Add a photo only if you want one.

#### Adding a product photo — straight from the sheet (no code)

**First, make sure the Tins tab has an `image` column.** If your sheet was set up before
this feature, it won't yet — add it once: click the header row, **Insert → Column**, and
type **`image`** as the header (position doesn't matter; leave the cell blank for any
product that should keep its kanji tin). Then, for each product you want a photo on:

1. Put the photo in a Google Drive folder.
2. Share it so it's viewable: right-click the file → **Share** → under *General access*
   choose **“Anyone with the link”** (Viewer). *(This step matters — a private file won’t show.)*
3. Right-click → **Copy link**, and paste that link into the **`image`** column next to
   the product’s row.
4. Refresh the site — the photo appears as the card image, cropped to a 4:3 banner. The
   site converts the Drive link automatically; you just paste and go.

That’s the whole workflow: **photo + product details, all added in the sheet.**

Notes & alternatives:
- Square-ish images look best (they’re cropped to 4:3 at the top of the card).
- Google’s Drive image endpoint is informal and can occasionally be slow; for a small
  product list it’s fine. For bulletproof hosting, a free image host (**ImgBB**,
  **Cloudinary**, **Imgur**) works the same way — upload, copy the *direct image link*,
  paste it in `image`.
- You can also reference an image kept in the site itself, e.g. `assets/product-iki.png`
  (that’s how IKI & YUAN are set up).

### Shop
| Column | Meaning | Example |
|---|---|---|
| `title` | Card heading | `Merchandise` |
| `description` | One line of copy | `Whisks, bowls and essentials.` |
| `note` | Small caption at the bottom | `Prices coming soon` |
| `icon` | Icon preset: `tin`, `merch`, or `gift` | `merch` |
| `image` | *(optional)* photo — a Google Drive link or URL; overrides the icon | Google Drive link |
| `visible` | `TRUE` / `FALSE` | `TRUE` |

Shop cards support photos the **same way as Tins**: add an `image` column, paste a Google
Drive link (shared "Anyone with the link") or any direct image URL, and it replaces the
icon. Leave `image` blank to keep the icon. See the “Adding a product photo” steps above.

### Wholesale
| Column | Meaning | Example |
|---|---|---|
| `title` | Option name | `1kg Packet` |
| `description` | Small line under the title | `For steady, high-volume service` |
| `action` | Right-hand label | `Order online` |
| `image` | *(optional)* small thumbnail — Google Drive link or URL | Google Drive link |
| `visible` | `TRUE` / `FALSE` | `TRUE` |

Wholesale rows also take an optional `image` — it shows as a small thumbnail on the left
of the row (not a full banner, since these are compact list rows). Leave blank for no
thumbnail. Same Drive-link / URL rules as above.

---

## Tips for editing CSVs / the sheet
- In Google Sheets you don’t worry about commas — just type in cells. (In a raw CSV
  file, wrap any value containing a comma in `"double quotes"`.)
- Use a real pipe `|` to separate cultivar tags.

## Cost & how it works
- **Cost: £0.** No third-party service or subscription — the site reads the free CSV
  that Google publishes, directly in the browser.
- **How:** on page load a small script fetches each tab and rebuilds those cards with
  the existing styling — only the *content* comes from the sheet.
- **Trade-off:** cards render a split-second after load. If that ever matters for
  search-engine indexing of product text, we can switch to a build step that bakes
  the sheet into the HTML — still free, just a little more setup.
