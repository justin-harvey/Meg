# Meghan Laura Hair

Marketing + portfolio site for **Meghan Laura**, hair colorist in Portland, Maine.
A Windows 95 / Frutiger Aero themed single-page experience: draggable windows, a
boot screen, a photo portfolio, services, reviews, and booking.

- **Live site:** https://meghanlaurahair.com
- **Repo:** https://github.com/justin-harvey/Meg
- **Host:** Netlify (auto-deploys from `main`)
- **Local-SEO target:** "hair color portland maine"

## Tech

Plain static site, no build step. The whole UI is hand-rolled HTML/CSS/vanilla JS.

| File | Purpose |
| --- | --- |
| `index.html` | All markup: desktop, windows, portfolio, services, etc. |
| `styles.css` | Win95/Frutiger Aero styling (served with `?v=N` cache-bust) |
| `scripts.js` | Window manager, portfolio filters, lightbox, 3D carousel, water-ripple desktop |
| `images/` | Portfolio photography |
| `netlify.toml` | Publish dir (`.`), security headers, SPA + crawler redirects |
| `schema.jsonld`, `llms.txt`, `robots.txt`, `sitemap.xml` | SEO / GEO |
| `server.js`, `chatbot-data.js`, `services-data.js` | Optional Express chatbot backend (not required for the static site) |

> **Cache-busting:** `styles.css` and `scripts.js` are linked in `index.html` with a
> `?v=N` query string. When you change either file, bump that number so Netlify's
> long-lived cache serves the new version.

## Run locally

It's static — serve the folder with anything:

```bash
python3 -m http.server 8799
# → http://localhost:8799/
```

## Deploy

Push to `main`; Netlify builds and publishes the repo root automatically.

See [HANDOFF.md](HANDOFF.md) for current state and open items.
