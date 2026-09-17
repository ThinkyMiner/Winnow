import { attachBadge } from "../src/ui/badge";
import { type CardState, mountCard } from "../src/ui/card";
import { FIXTURES } from "./fixtures";

const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;
const log = (s: string) => ($("#log").textContent = `${new Date().toLocaleTimeString()} ${s}\n${$("#log").textContent}`);

// Dark toggle: color-scheme for the page, data-wi-theme so the shadow roots follow (see styles.ts).
const dark = $<HTMLInputElement>("#dark");
dark.checked = matchMedia("(prefers-color-scheme: dark)").matches;
const applyTheme = () => {
  document.documentElement.style.colorScheme = dark.checked ? "dark" : "light";
  document.documentElement.dataset.wiTheme = dark.checked ? "dark" : "light";
};
dark.addEventListener("change", applyTheme);
applyTheme();

const errorState: CardState = {
  status: "error",
  error: { code: "jev_error", message: "x", jev: { kind: "rate_limit", status: 429, message: "Rate limit exceeded" } },
};
const states: Array<[string, CardState]> = [
  ["loading", { status: "loading" }],
  ["error", errorState],
  ["ready article", { status: "ready", model: FIXTURES[0]! }],
  ["ready video", { status: "ready", model: FIXTURES[4]! }],
  ["low confidence", { status: "ready", model: FIXTURES[5]! }],
];
for (const [name, state] of states) {
  const slot = document.createElement("div");
  $("#cards").append(slot);
  const card = mountCard({
    state,
    container: slot,
    onFeedback: (a) => log(`card[${name}] feedback ${a}`),
    onSeek: (s) => log(`card[${name}] seek ${s}s`),
    onDismiss: () => log(`card[${name}] dismissed`),
  });
  // Cards are position:fixed in production; lay them out inline here.
  Object.assign(card.el.style, { position: "static" });
}

const feedStates: CardState[] = [
  ...FIXTURES.map((m): CardState => ({ status: "ready", model: m })),
  { status: "loading" },
  { status: "error", error: { code: "no_key", message: "" } },
];
feedStates.forEach((state, i) => {
  const title = state.status === "ready" ? state.model.title : i === 6 ? "Something still being judged" : "A link that failed";
  const url = state.status === "ready" ? state.model.url : `https://example.com/${i}`;
  const a = Object.assign(document.createElement("a"), { href: url, textContent: title });
  const li = document.createElement("li");
  li.append(a);
  $("#feed").append(li);
  attachBadge(a, {
    state,
    onFeedback: (act) => log(`badge[${i}] feedback ${act}`),
    onOpen: (u) => log(`badge[${i}] open ${u}`),
  });
});
