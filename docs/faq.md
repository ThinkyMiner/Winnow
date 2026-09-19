# FAQ

**How much does it cost to run?**
You pay TypeSafe for Jev at $0.042 per million input tokens; output tokens are free, and Winnow has no fee. A Hacker News front page of 30 links is about 34,000 tokens, roughly $0.0015. A long article is 2,000–8,000 tokens. Judgments are cached for 7 days per URL, so revisiting a feed is free. Running the whole 40-item eval costs about half a cent.

**How accurate is it?**
Against Winnow's own 40 fixtures, on the 10 items nobody tuned thresholds on, the verdict agrees with the (model-written, not yet human-reviewed) golden label 80% of the time and the content type 90% of the time. Treat the verdict as a fast prior, not a ruling. The known soft spot is insight density: polished opinion pieces and tutorials often score as high as original research. Details in [eval.md](eval.md).

**Does it work behind paywalls?**
It judges whatever text Mozilla Readability can see. If the page shows a teaser paragraph and a subscribe wall, the teaser is what gets judged, and it usually fails the 120-word minimum so no card appears. Winnow does not bypass anything.

**Why do some YouTube videos have "Skip to" chips and others not?**
Chips need a caption track. Winnow fetches tracks through YouTube's InnerTube player endpoint because the caption URLs embedded in the watch page are token-gated and return empty bodies. Videos without captions are judged on title and description only. YouTube changes these endpoints without notice, so this is the most fragile part of the extension; a fixture for it is on the roadmap.

**Does it work in Firefox / Safari / Edge / Brave?**
Firefox: no. The extension uses Chrome MV3 APIs (`chrome.storage`, `chrome.permissions`, a module service worker) and has not been ported. Chromium-based browsers that support MV3 and "Load unpacked" (Edge, Brave, Arc, etc.) generally work but are untested.

**Does it slow pages down?**
The content script runs at `document_idle`, after the page has loaded. Extraction is synchronous Readability on a cloned document, then one async message; the Jev call (about 1.2 s observed) happens in the service worker and never blocks the page. The card and badges render inside shadow roots with their own stylesheet, so they neither trigger the page's CSS nor get restyled by it. Feed mode observes visibility with `IntersectionObserver`, coalesces items over 400 ms, and cancels items you scroll far past.

**Can I use my own model, or an OpenAI/Anthropic key?**
No. Winnow's design leans on Jev's typed-answer contract: every question returns a probability, a choice with a distribution, or a score over ordered levels, and the card is built only from templates keyed to those. A text-generating model would need a prompt-and-parse layer, would be able to put prose on your screen, and would make the thresholds meaningless. Swapping the model is a different product.

**Why bring-your-own-key?**
So there is no Winnow server. Your page text goes from your browser to TypeSafe and back; nobody in between can read it, meter it, or shut it off. It also keeps the extension free to run and simple to audit: one endpoint, one key, stored locally.

**What happens offline?**
Cache hits still work: a URL you had judged in the last 7 days (under the same goals version and depth) shows its card or badge with the "from cache" marker. Anything else fails with a network error; the page card shows "Jev couldn't judge this" and the badge shows `!`. Nothing is queued for later.

**How does "already known" work?**
One of the questions asks Jev whether a reader with your goals, your most frequent topics over the last 30 days, and your recently read titles would already know the main idea. The topics come from pages you have had judged in page mode; the titles come from the last 8 items you clicked **Read** on. It is an estimate about the idea, not a lookup of whether you visited the URL. At 80% or more it triggers a skip; above 50% it blocks read-now (both are sliders).

**What does the `?` badge mean?**
The verdict's confidence is below your **Min confidence** slider (default 0.4). A label was still computed; hover to see it with the full card. Confidence is the probability Jev assigned to the final label in its own four-way verdict question (read-now and save share their mass, since length decides between them in code).

**What do the badge letters mean?**
`GO` read now, `~` skim, `SAVE` save for later, `SKIP` skip, `?` low confidence, `…` still judging, `!` this item's judgment failed. The dot next to the label is the confidence band: high (≥ 0.8), medium (≥ 0.5), low.

**Why is a feed badge different from the page card for the same link?**
Feed items are judged on title + snippet (unless you enable prefetch), and body-dependent rules (low density, AI-written, unsupported claims, the read-now density gate) only fire when the body was seen. Open the page and the card judges the full text. Both are cached separately by depth.

**What does "Read" / "Skip" on the card do?**
It appends the item to a local feedback log (last 200 entries). The titles of the last 8 in each column go into every future request as `recently_read_titles` and `recently_skipped_titles`. It does not re-judge anything or send feedback to TypeSafe on its own.

**Does changing my goals re-judge everything?**
Saving different goals bumps a version number that is part of every cache key, so every cached judgment becomes a miss and is re-judged the next time you see it. Saving identical text does not bump it.

**Where is the source of truth for how Jev behaves?**
[jev-contract.md](jev-contract.md): observed request and response shapes, error bodies, limits, pricing, latency, and the model-behaviour notes the questions are written around.
