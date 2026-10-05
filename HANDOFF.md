# HANDOFF — Meghan Laura Hair

Working state of the site. Keep this current when you make meaningful changes.

## At a glance

- **Repo:** https://github.com/justin-harvey/Meg (branch `main`)
- **Live:** https://meghanlaurahair.com, hosted on Netlify, auto-deploys from `main`
- **Build:** none — static site, Netlify publishes the repo root (`publish = "."`)
- **Theme:** Windows 95 / Frutiger Aero desktop; draggable windows, boot screen,
  water-ripple desktop background
- **SEO/GEO:** local target "hair color portland maine"; `schema.jsonld`, `llms.txt`,
  `robots.txt`, `sitemap.xml`, Google Search Console verification file in place

> Note: this repo was previously under `G00DTECH/Meg`. The GitHub account was renamed
> to `justin-harvey`, so the canonical path is now `justin-harvey/Meg`. Old
> `G00DTECH/Meg` URLs redirect. Update the `origin` remote to the new path.

## Layout

- `index.html` — all markup (desktop icons, taskbar, start menu, and every window:
  Welcome, About, **My Work/Portfolio**, Services, Reviews, Book, Instagram, Paint, AIM)
- `styles.css` — all styling. Linked with `?v=N` cache-bust.
- `scripts.js` — single IIFE: window manager (open/close/min/max/drag/resize),
  portfolio filters, photo lightbox, the **3D round carousel**, clock, boot screen,
  and the desktop water-ripple canvas.
- `images/` — portfolio photography (case-sensitive filenames; Netlify is case-sensitive)

**Cache-busting:** after editing `styles.css` or `scripts.js`, bump the `?v=N` number
on both `<link>`/`<script>` tags in `index.html` (currently `v=5`).

## My Work section — 3D carousel (current feature)

The Portfolio window (`#win-portfolio`) now opens with a **3D rotating ring carousel**
above the existing 57-photo filterable grid. It's a vanilla port of the "Round
Carousel" component, restyled so each rotating photo is framed as a miniature
Windows 95 window (raised bevel, purple title bar with the photo's label, sunken
image well); back faces are dimmed.

- **Markup:** `#rc-stage > .rc-scaler > .rc-tilt > #rc-ring` in `index.html`
  (faces are built in JS, not hand-written).
- **Styles:** "Featured 3D Round Carousel" block in `styles.css`. `.rc-ring` width/height
  (190×145) **must match** `W`/`H` in `scripts.js`.
- **Logic:** `initRoundCarousel()` in `scripts.js` builds the ring, auto-spins it,
  supports drag + inertia, and opens the existing lightbox on a (non-drag) click.
  - Featured photos: the `FEATURED` array (9 images, each also present in the grid so
    clicks map onto the lightbox). Edit that array to change the lineup.
  - **Rotation speed:** `speedDegS` (currently **21 deg/s** — half of the original 42).
  - Respects `prefers-reduced-motion` (auto-spin pauses; drag still works) and only
    animates while the window is visible.

## Open items / notes

- **Object-count mismatch (pre-existing):** the Portfolio status bar's dynamic count
  shows the real number of `.photo-thumb` elements (56), while the hardcoded
  "Showing all 57 photos" label (`#portfolio-count`) says 57. Reconcile when
  convenient — either fix the hardcoded text or the grid.
- Some grid `data-src` images may reference files not present in `images/`; audit if a
  thumbnail ever shows blank.
- `server.js` + `*-data.js` power an optional Claude chatbot backend; the static site
  does not depend on it.

## Deploy

```bash
# push to main → Netlify auto-deploys
git push origin main
```
