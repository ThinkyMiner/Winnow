// Plain-fetch Jev client. Runs in a MV3 service worker and in Node (tests, eval).
import { JEV_ENDPOINT, JEV_RETRY } from "../config";
import type { JevAnswer, JevError, JevErrorBody, JevErrorKind, JevRequest, JevResponse, Result } from "../types";

// ponytail: no client-side throttle. Account ceiling is 250k tokens/s and 1,200 req/min
// (docs/jev-contract.md); one browser can't approach it. Add a token bucket if 429s show up.

const RETRYABLE: ReadonlySet<JevErrorKind> = new Set(["rate_limit", "overloaded", "network"]);

export const jevFail = (jev: JevError): Result<never> => ({
  ok: false,
  error: { code: "jev_error", message: jev.message, jev },
});

/** The server does not enforce these; we do. Returns a problem description or undefined. */
export function validateRequest(req: JevRequest): string | undefined {
  const entries = Object.entries(req.questions);
  if (entries.length === 0) return "questions must be non-empty";
  for (const [id, q] of entries) {
    if (q.type === "score" && q.criteria.length < 2) return `score question "${id}" needs >= 2 levels`;
    if (q.type === "choice" && Object.keys(q.criteria).length < 2) return `choice question "${id}" needs >= 2 options`;
  }
  return undefined;
}

export async function callJev(req: JevRequest, apiKey: string, signal?: AbortSignal): Promise<Result<JevResponse>> {
  const invalid = validateRequest(req);
  if (invalid) return jevFail({ kind: "bad_request", message: invalid });
  const body = JSON.stringify(req);
  for (let attempt = 0; ; attempt++) {
    const r = await once(body, apiKey, signal);
    if (r.ok) return r;
    const jev = r.error.jev!;
    if (!RETRYABLE.has(jev.kind) || signal?.aborted || attempt >= JEV_RETRY.maxRetries) return r;
    await sleep(jev.retryAfterMs ?? backoff(attempt), signal);
  }
}

async function once(body: string, apiKey: string, signal?: AbortSignal): Promise<Result<JevResponse>> {
  const timeout = AbortSignal.timeout(JEV_RETRY.timeoutMs);
  let res: Response;
  try {
    res = await fetch(JEV_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body,
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
  } catch (e) {
    const message = signal?.aborted
      ? "aborted"
      : timeout.aborted
        ? `timeout after ${JEV_RETRY.timeoutMs}ms`
        : (e as Error)?.message || String(e);
    return jevFail({ kind: "network", message });
  }
  const requestId = res.headers.get("x-typesafe-request-id") ?? undefined;
  if (!res.ok) return jevFail(await errorFromResponse(res));
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return jevFail({ kind: "malformed_response", status: res.status, message: "response body is not JSON", requestId });
  }
  const problem = validateResponse(json);
  if (problem) return jevFail({ kind: "malformed_response", status: res.status, message: problem, requestId });
  return { ok: true, value: json as JevResponse };
}

/** Maps a non-2xx response to a JevError; accepts all three observed `detail` shapes. */
export async function errorFromResponse(res: Response): Promise<JevError> {
  const text = await res.text().catch(() => "");
  let message = text || res.statusText || `HTTP ${res.status}`;
  try {
    message = detailMessage((JSON.parse(text) as JevErrorBody).detail) ?? message;
  } catch {
    /* not JSON; keep raw text */
  }
  return {
    kind: kindForStatus(res.status),
    status: res.status,
    message,
    requestId: res.headers.get("x-typesafe-request-id") ?? undefined,
    retryAfterMs: parseRetryAfter(res.headers.get("retry-after")),
  };
}

function detailMessage(d: JevErrorBody["detail"] | undefined): string | undefined {
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map((e) => `${(e.loc ?? []).join(".")}: ${e.msg}`).join("; ");
  if (d && typeof d === "object" && typeof d.message === "string") return d.message;
  return undefined;
}

function kindForStatus(status: number): JevErrorKind {
  if (status === 401) return "auth";
  if (status === 429) return "rate_limit";
  if (status === 408) return "network";
  if (status >= 500) return "overloaded"; // includes 529
  return "bad_request"; // 400, 422, anything else 4xx: our bug
}

/** `retry-after` as seconds or an HTTP-date, clamped to [0, maxRetryAfterMs]. */
export function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  const ms = Number.isFinite(secs) ? secs * 1000 : new Date(header).getTime() - Date.now();
  if (!Number.isFinite(ms)) return undefined;
  return Math.min(Math.max(0, ms), JEV_RETRY.maxRetryAfterMs);
}

function backoff(attempt: number): number {
  const base = Math.min(JEV_RETRY.backoffMaxMs, JEV_RETRY.backoffInitialMs * 2 ** attempt);
  return base * (1 + (Math.random() * 2 - 1) * JEV_RETRY.backoffJitter);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isProbs = (v: unknown) => !!v && typeof v === "object" && Object.values(v as object).every(isNum);

function validateResponse(j: unknown): string | undefined {
  const r = j as Partial<JevResponse> | null;
  if (!r || typeof r !== "object") return "body is not an object";
  if (typeof r.model !== "string") return "model is not a string";
  if (!r.answers || typeof r.answers !== "object") return "answers missing";
  if (!isNum(r.usage?.input_tokens) || !isNum(r.usage?.output_tokens)) return "usage missing";
  for (const [id, a] of Object.entries(r.answers)) {
    const p = answerProblem(a);
    if (p) return `answer "${id}": ${p}`;
  }
  return undefined;
}

function answerProblem(a: JevAnswer | undefined): string | undefined {
  switch (a?.type) {
    case "noul":
      return isNum(a.noul) ? undefined : "noul is not a number";
    case "choice":
      return typeof a.choice === "string" && isNum(a.confidence) && isProbs(a.probabilities) ? undefined : "bad choice fields";
    case "score":
      return isNum(a.score) && isNum(a.confidence) && isProbs(a.probabilities) && !!a.legend && typeof a.legend === "object"
        ? undefined
        : "bad score fields";
    default:
      return `unknown type ${String((a as { type?: unknown } | undefined)?.type)}`;
  }
}
