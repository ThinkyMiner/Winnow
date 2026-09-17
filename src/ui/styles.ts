/** Single stylesheet for card + badge shadow roots. */
const LIGHT = `
  --wi-bg: #fff; --wi-fg: #1f2328; --wi-muted: #656d76; --wi-border: #d0d7de;
  --wi-chip: #f6f8fa; --wi-pill-fg: #fff; --wi-shadow: 0 8px 24px rgba(31,35,40,.18);
  --wi-go: #1a7f37; --wi-skim: #9a6700; --wi-save: #0969da; --wi-skip: #cf222e; --wi-unknown: #6e7781;`;
const DARK = `
  --wi-bg: #161b22; --wi-fg: #e6edf3; --wi-muted: #8d96a0; --wi-border: #30363d;
  --wi-chip: #21262d; --wi-pill-fg: #0d1117; --wi-shadow: 0 8px 24px rgba(0,0,0,.6);
  --wi-go: #3fb950; --wi-skim: #d29922; --wi-save: #4493f8; --wi-skip: #f85149; --wi-unknown: #8d96a0;`;

export const STYLES = `
:host { all: initial; ${LIGHT}
  font: 13px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--wi-fg); }
@media (prefers-color-scheme: dark) { :host { ${DARK} } }
:host-context([data-wi-theme="dark"]) { ${DARK} }
:host-context([data-wi-theme="light"]) { ${LIGHT} }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }

*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; color: inherit; cursor: pointer; }
button:focus-visible, a:focus-visible, .wi-badge:focus-visible { outline: 2px solid var(--wi-save); outline-offset: 1px; }

:host(.wi-card-host) { position: fixed; top: 16px; right: 16px; z-index: 2147483647; width: 320px; max-width: calc(100vw - 32px); }
.wi-card, .wi-pop { background: var(--wi-bg); border: 1px solid var(--wi-border); border-radius: 10px; box-shadow: var(--wi-shadow); padding: 12px; position: relative; }
.wi-x { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border: 0; border-radius: 6px; background: transparent; color: var(--wi-muted); font-size: 16px; line-height: 1; }
.wi-x:hover { background: var(--wi-chip); }

.wi-head { display: flex; align-items: center; gap: 8px; margin-right: 24px; }
.wi-pill { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 999px; font-weight: 600; background: var(--wi-verdict, var(--wi-unknown)); color: var(--wi-pill-fg); white-space: nowrap; }
.wi-pill small { font-weight: 400; opacity: .85; font-size: 11px; }
.wi-pill-low { background: var(--wi-unknown); }
.wi-skel { width: 88px; height: 20px; border-radius: 999px; background: linear-gradient(90deg, var(--wi-chip) 25%, var(--wi-border) 50%, var(--wi-chip) 75%); background-size: 200% 100%; animation: wi-shimmer 1.2s linear infinite; }
@keyframes wi-shimmer { to { background-position: -200% 0; } }

.wi-title { margin: 8px 0; font-weight: 600; font-size: 14px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: inherit; text-decoration: none; }
a.wi-title:hover { text-decoration: underline; }
.wi-grid { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 0; font-size: 12px; }
.wi-grid dt { color: var(--wi-muted); }
.wi-grid dd { margin: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.wi-bar { display: inline-flex; gap: 2px; }
.wi-bar i { width: 8px; height: 8px; border-radius: 2px; background: var(--wi-border); }
.wi-bar i.on { background: var(--wi-go); }
.wi-chip { padding: 1px 7px; border-radius: 999px; border: 1px solid var(--wi-border); background: var(--wi-chip); font-size: 11px; }
.wi-chip:hover:not(:disabled) { border-color: var(--wi-save); }
.wi-reasons { margin: 8px 0 0; padding-left: 16px; font-size: 12px; }
.wi-reasons li { margin: 2px 0; }
.wi-foot { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--wi-border); font-size: 12px; }
.wi-foot button { padding: 3px 10px; border-radius: 6px; border: 1px solid var(--wi-border); background: var(--wi-chip); }
.wi-foot button:disabled { opacity: .5; cursor: default; }
.wi-thanks { color: var(--wi-muted); }
.wi-cache { margin-left: auto; width: 8px; height: 8px; border-radius: 50%; background: var(--wi-muted); }
.wi-muted { color: var(--wi-muted); font-size: 12px; margin-top: 4px; }
.wi-err { font-size: 13px; }

:host(.wi-badge-host) { display: inline-block; vertical-align: middle; margin-left: 6px; line-height: 1; max-height: 1.2em; }
.wi-badge { display: inline-flex; align-items: center; gap: 4px; height: 1.2em; padding: 0 6px; border: 0; border-radius: 999px; font-size: 10px; font-weight: 700; letter-spacing: .02em; background: var(--wi-verdict, var(--wi-unknown)); color: var(--wi-pill-fg); vertical-align: middle; }
.wi-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.wi-dot-high { opacity: 1; } .wi-dot-medium { opacity: .55; } .wi-dot-low { opacity: .25; }
.wi-pop { position: fixed; z-index: 2147483647; width: 320px; max-width: calc(100vw - 16px); text-align: left; font-weight: 400; letter-spacing: 0; }
.wi-pop[hidden] { display: none; }
`;
