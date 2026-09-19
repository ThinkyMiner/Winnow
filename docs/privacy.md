# Privacy policy

**Effective date: 2026-09-19.** This document describes what the Winnow Chrome extension does with your data. It is written to serve as the extension's Chrome Web Store privacy policy and is kept in step with the code at https://github.com/ThinkyMiner/Winnow. Where this text and the code disagree, the code is what runs; please open an issue.

## Summary

Winnow sends the content of pages you are judging, plus a short summary of your reading preferences, to one third-party API (TypeSafe's Jev) using an API key you supply. It stores your key, settings, reading profile, and a cache of judgments on your own computer. It has no server of its own, no analytics, and no telemetry.

## What data is processed

Only when Winnow judges something, and only for the item being judged:

| Data | When | Purpose |
|---|---|---|
| The readable text, title, byline, site name, and reading time of the article you are on | Page mode, on an eligible `https:` page | So Jev can answer the questions that produce the verdict |
| A YouTube video's title, channel, duration, description, and caption transcript | Page mode, on a YouTube watch page | Same, plus locating the segment with the core idea |
| Titles and short snippets (domain, points, comment count, channel, view count, nearby text) of links in a feed | Feed mode, for links that scroll into view | Title-level judgment of feed items |
| The first ~1,200 characters of text from each feed link's page | Feed mode, **only** if you turn on "Prefetch link text" | Judging feed items on body text instead of the headline |
| Your reading goals text | Every judgment | Personalising the verdict |
| Up to 6 topic labels from pages you had judged in the last 30 days | Every judgment | Estimating what you already know |
| The titles (up to 80 characters each) of the last 8 items you marked **Read** and the last 8 you marked **Skip** | Every judgment | Estimating what you already know and what you skip |

The exact shape sent is documented in [how-judgments-work.md](how-judgments-work.md#the-state). Article text is capped at 24,000 characters and transcripts at 24,000 characters.

## Where it goes

To **`https://api.typesafe.ai`** only, authenticated with your own API key, over HTTPS:

- `POST /v1/systemone` for judgments;
- `GET /v1/models` once when you save or replace a key, to verify it.

TypeSafe's handling of that data is governed by their privacy policy: https://typesafe.ai/legal/privacy-policy. Winnow sends no identifier of you other than your API key. The request contains the page's text and title but not its URL (a feed snippet may include the link's domain).

Two other kinds of network request happen, both to sites you are already visiting:

- On a YouTube watch page, the content script asks YouTube's own player endpoint (`youtube.com/youtubei/v1/player`, with `credentials: "omit"`) for caption tracks and then fetches the caption file from the URL it returns as an ordinary same-origin request from the page.
- With "Prefetch link text" on, the extension fetches the pages linked from a feed, also with `credentials: "omit"`, to extract text for judging. This is off by default and requires you to grant the `<all_urls>` permission when you enable it.

Nothing goes anywhere else. There is no Winnow server.

## What is stored locally

All in Chrome's extension storage (`chrome.storage.local`) on your device, readable by this extension only:

| Item | Storage key | Kept for |
|---|---|---|
| Your Jev API key | `jev_api_key` | Until you replace it, clear it, or remove the extension |
| Settings (modes, site toggles, excluded hosts, prefetch toggle, thresholds) | `settings` | Until changed or the extension is removed |
| Reader state: goals text, topic counts with last-seen timestamps, and a feedback log of URL, title, action, and time for up to 200 Read/Skip clicks | `reader_state` | Topics unused for 30 days drop out; feedback keeps the latest 200; all of it until you reset it or remove the extension |
| Judgment cache: for each judged URL, the typed answers, verdict inputs, model name, token usage, and timestamp | `c:<hash>` and `cache_index` | 7 days, or until evicted past 3,000 entries, cleared, or the extension is removed |

The cached judgment stores the item's URL and title alongside the answers. It does not store the page text.

Chrome may sync extension settings between your signed-in Chrome profiles only if you have enabled that in Chrome; Winnow uses `storage.local`, which Chrome does not sync.

## What is never collected

- No analytics, usage statistics, crash reports, or telemetry of any kind.
- No browsing history. Winnow looks at the page you are on when it judges it and at feed links as they scroll into view; it does not record where you have been.
- No account, sign-in, or identifier with Winnow's author; there is nothing to sign in to.
- No data is sold, shared, or transferred to anyone other than the API call to TypeSafe described above.
- The API key is never logged, never included in any message reply inside the extension, and never available to content scripts running in web pages.

## Permissions and why

| Permission | Why |
|---|---|
| `storage`, `unlimitedStorage` | Local key, settings, reader state, and cache |
| Host permission `https://api.typesafe.ai/*` | To call Jev |
| Content scripts on `<all_urls>` | To read the page you are on and the links in a feed, and to draw the card or badges. Content scripts do not make network requests other than the YouTube caption fetch on YouTube watch pages. |
| Optional host permission `<all_urls>` | Requested only when you turn on "Prefetch link text", so the extension's background can fetch linked pages. Turning the option off removes the grant. |

## Sites where nothing runs

Winnow never judges `http:` pages, `localhost`, or private-network addresses. By default it is also off on webmail (Gmail, Outlook), Google Docs/Sheets/Slides/Drive, Notion, and any host you add under **Excluded hosts** in options. Exclusion is enforced in the extension's background, not only in the page.

## How to delete everything

- **Clear the judgment cache**: options page → Data → **Clear cache**.
- **Erase your reading profile** (goals, topics, feedback log): options page → Data → **Reset reader state**.
- **Remove your API key**: options page → API key → verify and replace it with a new one, or remove the extension.
- **Everything at once**: remove the extension at `chrome://extensions`. Chrome deletes the extension's storage with it.

Data already sent to TypeSafe is subject to their retention policy; see their privacy policy for how to request deletion there.

## Changes

Changes to this policy are made in the repository and recorded in the project's `CHANGELOG.md`. The effective date at the top changes with them.

## Contact

Open an issue at https://github.com/ThinkyMiner/Winnow/issues. For anything sensitive, use private vulnerability reporting: https://github.com/ThinkyMiner/Winnow/security/advisories/new.
