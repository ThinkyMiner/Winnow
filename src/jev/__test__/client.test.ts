import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JEV_RETRY } from "../../config";
import type { JevRequest } from "../../types";
import { callJev } from "../client";

const req: JevRequest = {
  model: "jev-1.13.0",
  state: { text: "hi" },
  questions: { q: { type: "noul", instructions: "Is `text` short?" } },
};
const good = { model: "jev-1.13.0", answers: { q: { type: "noul", noul: 0.9 } }, usage: { input_tokens: 10, output_tokens: 1 } };
const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.useFakeTimers();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});
afterEach(() => vi.useRealTimers());

/** Drive a callJev promise while advancing fake timers past all backoffs. */
async function run(p: Promise<unknown>) {
  await vi.advanceTimersByTimeAsync(JEV_RETRY.maxRetryAfterMs);
  return p;
}

describe("callJev", () => {
  it("retries a 429 then returns the 200", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { detail: "slow down" })).mockResolvedValueOnce(json(200, good));
    const r = await run(callJev(req, "k"));
    expect(r).toMatchObject({ ok: true, value: good });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry a 400 and parses the string detail", async () => {
    fetchMock.mockResolvedValue(json(400, { detail: "Noul question must have criteria or instructions: q" }, { "x-typesafe-request-id": "req_1" }));
    const r = await run(callJev(req, "k"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({
      ok: false,
      error: { code: "jev_error", jev: { kind: "bad_request", status: 400, requestId: "req_1", message: "Noul question must have criteria or instructions: q" } },
    });
  });

  it("parses the object detail (401 -> auth)", async () => {
    fetchMock.mockResolvedValue(json(401, { detail: { error_type: "authentication_error", message: "Cannot authenticate" } }));
    const r = await run(callJev(req, "k"));
    expect(r).toMatchObject({ ok: false, error: { jev: { kind: "auth", message: "Cannot authenticate" } } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses the pydantic array detail (422 -> bad_request)", async () => {
    fetchMock.mockResolvedValue(json(422, { detail: [{ type: "too_short", loc: ["body", "questions"], msg: "Dictionary should have at least 1 item", input: {} }] }));
    const r = await run(callJev(req, "k"));
    expect(r).toMatchObject({ ok: false, error: { jev: { kind: "bad_request", message: "body.questions: Dictionary should have at least 1 item" } } });
  });

  it("flags a malformed 200 body", async () => {
    fetchMock.mockResolvedValue(json(200, { model: "x", answers: { q: { type: "noul", noul: "high" } }, usage: { input_tokens: 1, output_tokens: 0 } }));
    const r = await run(callJev(req, "k"));
    expect(r).toMatchObject({ ok: false, error: { jev: { kind: "malformed_response" } } });
    expect((r as { error: { message: string } }).error.message).toMatch(/answer "q"/);
  });

  it("honors retry-after seconds before retrying", async () => {
    fetchMock.mockResolvedValueOnce(json(429, { detail: "rl" }, { "retry-after": "3" })).mockResolvedValueOnce(json(200, good));
    const p = callJev(req, "k");
    await vi.advanceTimersByTimeAsync(2500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(600);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await p).toMatchObject({ ok: true });
  });

  it("honors an HTTP-date retry-after, capped at maxRetryAfterMs", async () => {
    const far = new Date(Date.now() + 10 * 60_000).toUTCString();
    fetchMock.mockResolvedValueOnce(json(529, { detail: "overloaded" }, { "retry-after": far })).mockResolvedValueOnce(json(200, good));
    const p = callJev(req, "k");
    await vi.advanceTimersByTimeAsync(JEV_RETRY.maxRetryAfterMs - 100);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await p).toMatchObject({ ok: true });
  });

  it("gives up after maxRetries on network errors", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const r = await run(callJev(req, "k"));
    expect(fetchMock).toHaveBeenCalledTimes(JEV_RETRY.maxRetries + 1);
    expect(r).toMatchObject({ ok: false, error: { jev: { kind: "network", message: "fetch failed" } } });
  });

  it("rejects a one-level score without calling the server", async () => {
    const bad: JevRequest = { ...req, questions: { s: { type: "score", instructions: "x", criteria: ["only"] } } };
    const r = await callJev(bad, "k");
    expect(r).toMatchObject({ ok: false, error: { jev: { kind: "bad_request" } } });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
