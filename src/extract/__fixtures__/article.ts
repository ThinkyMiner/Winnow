const para = (i: number) =>
  `<p>Paragraph ${i}. The quick brown fox jumps over the lazy dog while the committee debates the merits of static typing in large codebases. Nobody agreed, but everyone learned something about tradeoffs, tooling, and the cost of migration in a growing organisation.</p>`;

export const READABLE_HTML = `<!doctype html><html><head><title>Why Types Matter - Example Blog</title>
<meta property="og:site_name" content="Example Blog"><meta name="author" content="Jane Doe"></head>
<body><nav><a href="/">Home</a><a href="/about">About</a></nav>
<article><h1>Why Types Matter</h1><p class="byline">By Jane Doe</p>
${Array.from({ length: 12 }, (_, i) => para(i)).join("\n")}
</article><footer>© Example</footer></body></html>`;

/** Content with plenty of words but structured so Readability's scoring is unlikely to fire (bare divs). */
export const FALLBACK_HTML = `<!doctype html><html><head><title>Notes</title></head><body>
<main>${Array.from({ length: 30 }, (_, i) => `<span>line ${i} some words here that add up to a decent body of text for the fallback path.</span>`).join(" ")}</main>
</body></html>`;

export const SHORT_HTML = `<!doctype html><html><head><title>Tiny</title></head><body><article><p>Just a few words here.</p></article></body></html>`;
