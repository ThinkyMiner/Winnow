# Security policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting:

https://github.com/ThinkyMiner/Winnow/security/advisories/new

Please do not open a public issue for anything that could expose a user's Jev key or page content.

## Scope

Things we consider security-relevant:

- **Key handling.** The Jev API key is stored in `chrome.storage.local` under `jev_api_key` and read only by the service worker (`src/background/storage.ts`). It must never appear in a message reply, a log line, a content script, or a `Result` object. Privileged messages (`SET_KEY`, `CLEAR_KEY`, `SET_SETTINGS`, `SET_GOALS`, `CLEAR_CACHE`, `RESET_READER_STATE`) are accepted only from `chrome-extension://` senders (`src/background/router.ts`).
- **Content-script isolation.** Cards and badges render inside shadow roots. Anything that lets host-page script or CSS reach into Winnow's UI, or lets Winnow leak data into the host page, is in scope.
- **Network endpoints.** The extension is meant to contact only `https://api.typesafe.ai` (systemone and models) and, in page mode on YouTube, YouTube's own same-origin endpoints. With "prefetch link text" enabled it also fetches feed link targets with `credentials: "omit"`. Any other outbound request is a bug.
- **Excluded hosts.** `isExcluded` must keep `http:`, loopback and private-range hosts, and the user's exclusion list from ever being judged.

Out of scope: Jev's own accuracy, YouTube changing its endpoints, and issues in Chrome itself.

## Response

Best effort. This is a volunteer project with no on-call rotation. We will acknowledge reports as soon as we see them and fix confirmed issues in the next release.

## Supported versions

Only the latest release on https://github.com/ThinkyMiner/Winnow/releases receives fixes.
