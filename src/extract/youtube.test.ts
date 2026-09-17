// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractYouTube,
  findPlayerResponse,
  getVideoId,
  isYouTubeWatch,
  parseJson3,
  parseTimedTextXml,
  segmentTranscript,
} from "./youtube";

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("getVideoId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/abc123DEF45", "abc123DEF45"],
    ["https://m.youtube.com/watch?v=xyz", "xyz"],
    ["https://www.youtube.com/feed/subscriptions", null],
    ["https://www.youtube.com/", null],
    ["https://example.com/watch?v=abc", null],
    ["not a url", null],
  ])("%s → %s", (url, id) => {
    expect(getVideoId(url)).toBe(id);
    expect(isYouTubeWatch(url)).toBe(id !== null);
  });
});

const PR = {
  videoDetails: {
    videoId: "abc",
    title: 'Braces } in "strings {"',
    author: "Chan {nel}",
    lengthSeconds: "125",
    shortDescription: "desc with \\\"escaped\\\" quotes",
  },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=de", languageCode: "de" },
        { baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=en&kind=asr", languageCode: "en", kind: "asr" },
        { baseUrl: "https://www.youtube.com/api/timedtext?v=abc&lang=en", languageCode: "en" },
      ],
    },
  },
};
const page = (pr: unknown) =>
  parse(`<html><head><title>Vid - YouTube</title><meta name="title" content="Meta Title"></head>
<body><script>var x = 1;</script><script>var ytInitialPlayerResponse = ${JSON.stringify(pr)};var ytcfg = {};</script></body></html>`);

describe("findPlayerResponse", () => {
  it("parses balanced object with braces inside strings", () => {
    const pr = findPlayerResponse(page(PR));
    expect(pr.videoDetails.title).toBe(PR.videoDetails.title);
    expect(pr.videoDetails.shortDescription).toBe(PR.videoDetails.shortDescription);
    expect(pr.captions.playerCaptionsTracklistRenderer.captionTracks).toHaveLength(3);
  });
});

describe("transcript parsers", () => {
  it("json3", () => {
    const segs = parseJson3({
      events: [
        { tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: "Hello " }, { utf8: "world" }] },
        { tStartMs: 1500, dDurationMs: 100, segs: [{ utf8: "\n" }] },
        { tStartMs: 2000, dDurationMs: 1000, segs: [{ utf8: "again" }] },
        { tStartMs: 3000 },
      ],
    });
    expect(segs).toEqual([
      { start: 0, dur: 1.5, text: "Hello world" },
      { start: 2, dur: 1, text: "again" },
    ]);
  });
  it("xml", () => {
    const segs = parseTimedTextXml(
      `<?xml version="1.0"?><transcript><text start="0.5" dur="2">Hi &amp; bye</text><text start="3" dur="1"> </text><text start="4" dur="2">end</text></transcript>`,
    );
    expect(segs).toEqual([
      { start: 0.5, dur: 2, text: "Hi & bye" },
      { start: 4, dur: 2, text: "end" },
    ]);
  });
});

describe("extractYouTube", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("prefers en non-asr track and fetches json3", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(url).toBe("https://www.youtube.com/api/timedtext?v=abc&lang=en&fmt=json3");
      return new Response(JSON.stringify({ events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "hi" }] }] }), {
        status: 200,
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const v = await extractYouTube(page(PR), "https://www.youtube.com/watch?v=abc");
    expect(v).toMatchObject({
      kind: "video",
      videoId: "abc",
      title: "Meta Title",
      channel: "Chan {nel}",
      durationSec: 125,
      transcript: [{ start: 0, dur: 1, text: "hi" }],
    });
    expect(v!.description).toBe(PR.videoDetails.shortDescription);
  });

  it("falls back to XML when json3 fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("fmt=json3")
          ? new Response("nope", { status: 500 })
          : new Response(`<transcript><text start="1" dur="2">xml</text></transcript>`, { status: 200 }),
      ),
    );
    const v = await extractYouTube(page(PR), "https://www.youtube.com/watch?v=abc");
    expect(v!.transcript).toEqual([{ start: 1, dur: 2, text: "xml" }]);
  });

  it("returns transcript undefined when no captionTracks", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const v = await extractYouTube(page({ videoDetails: PR.videoDetails }), "https://youtu.be/abc");
    expect(v).not.toBeNull();
    expect(v!.transcript).toBeUndefined();
    expect(v!.title).toBe("Meta Title");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("survives fetch throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("net"); }));
    const v = await extractYouTube(page(PR), "https://www.youtube.com/watch?v=abc");
    expect(v!.transcript).toBeUndefined();
  });

  it("strips ' - YouTube' from document.title when no meta", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const doc = parse(`<html><head><title>Plain Vid - YouTube</title><meta itemprop="duration" content="PT1H2M3S"></head><body></body></html>`);
    const v = await extractYouTube(doc, "https://www.youtube.com/watch?v=zzz");
    expect(v).toMatchObject({ title: "Plain Vid", durationSec: 3723, videoId: "zzz" });
  });
});

describe("segmentTranscript", () => {
  it("splits into n spans by time", () => {
    const t = Array.from({ length: 40 }, (_, i) => ({ start: i * 10, dur: 10, text: `w${i}` }));
    const s = segmentTranscript(t, 4);
    expect(s.map((x) => x.id)).toEqual(["s0", "s1", "s2", "s3"]);
    expect(s[0]).toMatchObject({ start: 0, end: 100 });
    expect(s[3]).toMatchObject({ start: 300, end: 400 });
    expect(s[0]!.text.split(" ")).toHaveLength(10);
    expect(s[3]!.text).toMatch(/w39$/);
  });
  it("empty input", () => {
    expect(segmentTranscript([], 8)).toEqual([]);
  });
});
