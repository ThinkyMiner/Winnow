# Winnow site

Static landing page for Winnow: `index.html`, `styles.css`, `main.js`, no build step and no dependencies.

Deploy on Vercel with Root Directory = `site` and Framework Preset = Other. `vercel.json` turns on clean URLs and the `X-Content-Type-Options: nosniff` header.

Preview locally by opening `index.html`, or serve the folder (`python3 -m http.server`) so the absolute `/styles.css` and `/main.js` paths resolve.

Replace the literal `SITE_URL_TBD` in `index.html` with the production origin once it exists.
