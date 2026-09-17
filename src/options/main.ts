import { sendMessage } from "../background/messaging";
import { DEFAULT_THRESHOLDS, STORAGE_KEYS, THRESHOLD_META, type ThresholdKey } from "../config";
import type { FeedAdapterId, ReaderState, Settings } from "../types";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const check = (id: string) => $<HTMLInputElement>(id);
const FEEDS: FeedAdapterId[] = ["hn", "youtube", "generic"];
const KEYS = Object.keys(THRESHOLD_META) as ThresholdKey[];

// ── thresholds: one slider per THRESHOLD_META key ──
$("thresholds").innerHTML = KEYS.map((k) => {
  const m = THRESHOLD_META[k];
  return `<label><span class="row"><span>${m.label}</span><output id="out-${k}"></output></span>
    <input type="range" id="th-${k}" min="${m.min}" max="${m.max}" step="${m.step}" />
    <small>${m.help}</small></label>`;
}).join("");
const slider = (k: ThresholdKey) => $<HTMLInputElement>(`th-${k}`);
const showValue = (k: ThresholdKey) => ($<HTMLOutputElement>(`out-${k}`).value = slider(k).value);
for (const k of KEYS) slider(k).oninput = () => showValue(k);

// ── settings <-> DOM ──
function render(s: Settings) {
  check("pageMode").checked = s.pageMode;
  check("feedMode").checked = s.feedMode;
  for (const f of FEEDS) check(`feed-${f}`).checked = s.feedSites[f];
  check("prefetchLinkText").checked = s.prefetchLinkText;
  $<HTMLTextAreaElement>("excludedHosts").value = s.excludedHosts.join("\n");
  for (const k of KEYS) {
    slider(k).value = String(s.thresholds[k]);
    showValue(k);
  }
}

function collect(): Settings {
  return {
    pageMode: check("pageMode").checked,
    feedMode: check("feedMode").checked,
    feedSites: Object.fromEntries(FEEDS.map((f) => [f, check(`feed-${f}`).checked])) as Settings["feedSites"],
    prefetchLinkText: check("prefetchLinkText").checked,
    excludedHosts: $<HTMLTextAreaElement>("excludedHosts")
      .value.split("\n")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
    thresholds: Object.fromEntries(KEYS.map((k) => [k, Number(slider(k).value)])) as Settings["thresholds"],
  };
}

const save = () => sendMessage({ type: "SET_SETTINGS", settings: collect() });

$("settings").addEventListener("change", async (e) => {
  const prefetch = check("prefetchLinkText");
  if (e.target === prefetch) {
    const origins = ["<all_urls>"];
    if (prefetch.checked) prefetch.checked = await chrome.permissions.request({ origins });
    else await chrome.permissions.remove({ origins });
  }
  await save();
});

$("resetThresholds").onclick = async () => {
  for (const k of KEYS) {
    slider(k).value = String(DEFAULT_THRESHOLDS[k]);
    showValue(k);
  }
  await save();
};

// ── goals ──
const goals = $<HTMLTextAreaElement>("goals");
let lastGoals = "";
async function saveGoals() {
  if (goals.value === lastGoals) return;
  const r = await sendMessage({ type: "SET_GOALS", goals: goals.value });
  lastGoals = goals.value;
  $("goalsMsg").textContent = r.ok ? "Saved." : r.error.message;
  await refreshStatus();
}
goals.onblur = saveGoals;
$("saveGoals").onclick = saveGoals;

// ── data ──
async function refreshStatus() {
  const r = await sendMessage({ type: "GET_STATUS" });
  if (!r.ok) return void ($("status").textContent = r.error.message);
  const { hasKey, cacheEntries, model } = r.value;
  $("status").textContent = `${hasKey ? "Key set" : "No key"} · ${cacheEntries} cached · model ${model}`;
  return cacheEntries;
}

$("clearCache").onclick = async () => {
  const before = (await refreshStatus()) ?? 0;
  await sendMessage({ type: "CLEAR_CACHE" });
  const after = (await refreshStatus()) ?? 0;
  $("dataMsg").textContent = `Cleared ${before - after} entries (${after} left).`;
};

$("resetReader").onclick = async () => {
  await sendMessage({ type: "RESET_READER_STATE" });
  goals.value = lastGoals = "";
  $("dataMsg").textContent = "Reader state reset.";
  await refreshStatus();
};

// ── key rotation ──
const keyInput = $<HTMLInputElement>("key");
const keyMsg = $("keyMsg");
$<HTMLFormElement>("keyForm").onsubmit = async (e) => {
  e.preventDefault();
  const key = keyInput.value.trim();
  if (!key) return;
  keyMsg.className = "";
  keyMsg.textContent = "Verifying…";
  const r = await sendMessage({ type: "SET_KEY", key });
  keyInput.value = "";
  keyMsg.className = r.ok ? "ok" : "err";
  keyMsg.textContent = r.ok
    ? `Key replaced. Model: ${r.value.model}.`
    : r.error.jev?.kind === "auth" ? "That key was rejected." : r.error.message;
  await refreshStatus();
};

// ── init ──
(async () => {
  const s = await sendMessage({ type: "GET_SETTINGS" });
  if (s.ok) render(s.value);
  // No message exposes goals; read the stored ReaderState directly (extension page, same storage).
  const rs = (await chrome.storage.local.get(STORAGE_KEYS.readerState))[STORAGE_KEYS.readerState] as ReaderState | undefined;
  goals.value = lastGoals = rs?.goals ?? "";
  await refreshStatus();
})();
