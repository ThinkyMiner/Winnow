// Local reader profile in chrome.storage.local, plus the pure summary that goes into Jev state.
import { FEEDBACK_LOG_MAX, READER_SUMMARY_MAX_CHARS, STORAGE_KEYS, TOPIC_WINDOW_DAYS } from "../config";
import type { FeedbackEntry, ReaderState, ReaderStateSummary, Topic } from "../types";

const DEFAULT: ReaderState = { version: 1, goals: "", topics: [], feedback: [] };
const WINDOW_MS = TOPIC_WINDOW_DAYS * 24 * 3600 * 1000;

async function load(): Promise<ReaderState> {
  const got = await chrome.storage.local.get(STORAGE_KEYS.readerState);
  return { ...DEFAULT, ...(got[STORAGE_KEYS.readerState] as Partial<ReaderState> | undefined) };
}
const save = (rs: ReaderState) => chrome.storage.local.set({ [STORAGE_KEYS.readerState]: rs });

export const readerState = {
  get: load,

  async setGoals(goals: string): Promise<ReaderState> {
    const rs = await load();
    if (goals === rs.goals) return rs;
    const next = { ...rs, goals, version: rs.version + 1 };
    await save(next);
    return next;
  },

  /** Called by judgePage (not feed). Rolling window: topics unseen for TOPIC_WINDOW_DAYS drop out. */
  async recordTopic(topic: Topic): Promise<void> {
    const rs = await load();
    const now = Date.now();
    // ponytail: one counter per topic; a topic seen continuously never decays. Per-event log if that matters.
    const topics = rs.topics.filter((t) => now - t.lastSeen <= WINDOW_MS);
    const hit = topics.find((t) => t.topic === topic);
    if (hit) (hit.count += 1), (hit.lastSeen = now);
    else topics.push({ topic, count: 1, lastSeen: now });
    await save({ ...rs, topics });
  },

  async recordFeedback(e: Omit<FeedbackEntry, "at">): Promise<void> {
    const rs = await load();
    const feedback = [...rs.feedback, { ...e, at: Date.now() }].slice(-FEEDBACK_LOG_MAX);
    await save({ ...rs, feedback });
  },

  reset: () => save(DEFAULT),
};

const titles = (rs: ReaderState, action: FeedbackEntry["action"]) =>
  rs.feedback
    .filter((f) => f.action === action)
    .slice(-8)
    .reverse()
    .map((f) => f.title.slice(0, 80));

/** ≤ READER_SUMMARY_MAX_CHARS when JSON-stringified; lists are trimmed until it fits. */
export function summarizeForState(rs: ReaderState): ReaderStateSummary {
  const now = Date.now();
  const s: ReaderStateSummary = {
    goals: rs.goals.slice(0, 600),
    frequent_topics: rs.topics
      .filter((t) => now - t.lastSeen <= WINDOW_MS)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((t) => t.topic),
    recently_read_titles: titles(rs, "read"),
    recently_skipped_titles: titles(rs, "skip"),
  };
  while (JSON.stringify(s).length > READER_SUMMARY_MAX_CHARS) {
    if (s.recently_skipped_titles.length) s.recently_skipped_titles.pop();
    else if (s.recently_read_titles.length) s.recently_read_titles.pop();
    else if (s.frequent_topics.length) s.frequent_topics.pop();
    else s.goals = s.goals.slice(0, s.goals.length - 100);
  }
  return s;
}
