# Winnow site

Static editorial landing page for Winnow: `index.html`, `styles.css`, `main.js`, no build step and no dependencies. Fonts load from Fontshare (Cabinet Grotesk) and Google Fonts (Inter, JetBrains Mono).

Deploy on Vercel with Root Directory = `site` and Framework Preset = Other. `vercel.json` turns on clean URLs and the `X-Content-Type-Options: nosniff` header.

Preview locally by opening `index.html` directly (asset paths are relative) or serve the folder with `python3 -m http.server`.

Replace the literal `https://winnow-seven.vercel.app` in `index.html` with the production origin once it exists. `assets/og.png` is the social image; `assets/screenshots/` holds product captures used by the docs.
