/* Winnow site. No dependencies. Each module is wrapped so one failure never blanks the page. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var motionOK = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  function safe(fn) { try { fn(); } catch (e) { /* keep the page alive */ } }

  /* ---------- theme + menu ---------- */
  safe(function () {
    var btn = $('#theme-toggle');
    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark' ||
        (!root.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      var next = dark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('winnow-theme', next); } catch (e) {}
    });
    var nav = $('#nav'), menu = $('#menu-btn');
    menu.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') !== 'true';
      nav.setAttribute('data-open', String(open));
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('#nav-links a').forEach(function (a) { a.addEventListener('click', function () { nav.removeAttribute('data-open'); menu.setAttribute('aria-expanded', 'false'); }); });
  });

  /* ---------- screenshots that are not there yet ---------- */
  safe(function () {
    $$('.shot img').forEach(function (img) {
      var onerr = function () { img.hidden = true; img.parentNode.setAttribute('data-missing', ''); };
      img.addEventListener('error', onerr);
      if (img.complete && img.naturalWidth === 0 && img.src) onerr();
    });
  });

  /* ---------- count-up numbers ---------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count')), dec = parseInt(el.getAttribute('data-dec') || '0', 10);
    var suf = el.getAttribute('data-suffix') || '';
    if (!motionOK) { el.textContent = to.toFixed(dec) + suf; return; }
    var t0 = performance.now(), dur = 900;
    (function tick(now) {
      var p = Math.min(1, (now - t0) / dur); p = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * p).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- reveal on scroll ---------- */
  safe(function () {
    var items = $$('.reveal');
    var show = function (el) { el.classList.add('in'); $$('[data-count]', el).forEach(countUp); };
    if (!('IntersectionObserver' in window) || !motionOK) { items.forEach(show); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });
    items.forEach(function (el) { io.observe(el); });
  });

  /* ---------- hero canvas: chaff blows up-right, kernels settle ----------
     ~120 light particles spawn at the "toss" point, ride a wind vector and fade;
     8 heavy kernels arc up, fall, and stack behind the card. DPR-aware, paused when hidden. */
  safe(function () {
    var cv = $('#chaff'), host = $('#hero-visual');
    if (!motionOK || !cv || !cv.getContext) { return; }
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, raf = 0, running = false, last = 0;
    var chaff = [], kernels = [], chaffRGB = '220,205,170';
    function readColor() {
      var c = getComputedStyle(root).getPropertyValue('--chaff').trim(); if (c) chaffRGB = c;
    }
    function size() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth; H = host.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function origin() { return { x: W * 0.5 - 40, y: H * 0.72 }; }
    function spawnChaff(p) {
      var o = origin(); p = p || {};
      p.x = o.x + (Math.random() - .5) * 40; p.y = o.y + (Math.random() - .5) * 20;
      p.vx = 20 + Math.random() * 40; p.vy = -60 - Math.random() * 50;
      p.r = .8 + Math.random() * 1.6; p.a = 0; p.life = 0; p.ttl = 3 + Math.random() * 3; p.w = Math.random() * 6.28;
      return p;
    }
    function spawnKernel(i) {
      var o = origin();
      return { x: o.x, y: o.y, vx: -10 + Math.random() * 20, vy: -140 - Math.random() * 60, r: 3.2 + Math.random() * 1.4,
        tx: W * 0.5 - 60 + (i % 4) * 12, ty: H * 0.86 - Math.floor(i / 4) * 9, settled: false, delay: i * .35 + Math.random() * .2, t: 0 };
    }
    function reset() {
      chaff = []; kernels = [];
      for (var i = 0; i < 120; i++) { var p = spawnChaff(); p.life = Math.random() * p.ttl; chaff.push(p); }
      for (var k = 0; k < 8; k++) kernels.push(spawnKernel(k));
    }
    function step(dt) {
      ctx.clearRect(0, 0, W, H);
      var i, p;
      for (i = 0; i < chaff.length; i++) {
        p = chaff[i]; p.life += dt; if (p.life > p.ttl) spawnChaff(p);
        p.w += dt * 2;
        p.x += (p.vx + Math.sin(p.w) * 12) * dt; p.y += (p.vy + Math.cos(p.w * .7) * 8) * dt;
        p.vy += 6 * dt; p.vx += 4 * dt;
        var f = p.life / p.ttl; p.a = f < .15 ? f / .15 : 1 - (f - .15) / .85;
        ctx.fillStyle = 'rgba(' + chaffRGB + ',' + (p.a * .7).toFixed(2) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.fillStyle = '#D9A441';
      for (i = 0; i < kernels.length; i++) {
        p = kernels[i]; p.t += dt; if (p.t < p.delay) continue;
        if (!p.settled) {
          p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.vy > 0 && p.y >= p.ty) { p.y = p.ty; p.x += (p.tx - p.x) * .5; p.settled = true; }
        } else { p.x += (p.tx - p.x) * Math.min(1, dt * 6); }
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.4, p.r, -.15, 0, 6.283); ctx.fill();
      }
      // every ~14s, toss the kernels again
      if (kernels.length && kernels[7].t > 14) for (i = 0; i < 8; i++) kernels[i] = spawnKernel(i);
    }
    function frame(now) {
      if (!running) return;
      var dt = Math.min(.05, (now - last) / 1000 || 0); last = now;
      step(dt); raf = requestAnimationFrame(frame);
    }
    function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    readColor(); size(); reset();
    new ResizeObserver(function () { size(); reset(); }).observe(host);
    new IntersectionObserver(function (es) { es[0].isIntersecting && !d.hidden ? start() : stop(); }).observe(host);
    d.addEventListener('visibilitychange', function () { d.hidden ? stop() : start(); });
    new MutationObserver(readColor).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColor);
  });

  /* ---------- shared card template (mirrors src/ui/card.ts renderCardBody) ---------- */
  var VT = { read_now: ['Read now', 'GO', 'go'], skim: ['Skim', '~', 'skim'], save: ['Save', 'SAVE', 'save'], skip: ['Skip', 'SKIP', 'skip'] };
  var CT = { original_research: 'Original research', opinion: 'Opinion', news: 'News', tutorial: 'Tutorial', listicle: 'Listicle', rage_bait: 'Rage bait', advertorial: 'Advertorial', entertainment: 'Entertainment' };
  var PL = { intro: 'In the intro', middle: 'In the middle', end: 'At the end', evenly: 'Spread evenly' };
  var conf = function (c) { return c >= .8 ? 'high' : c >= .5 ? 'medium' : 'low'; };
  var pct = function (p) { return Math.round(p * 100) + '%'; };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cardHTML(m) {
    var low = m.confidence < .4, v = VT[m.verdict], bar = '';
    for (var i = 0; i < 10; i++) bar += '<i class="' + (i < m.density ? 'on' : '') + '"></i>';
    var pill = low ? '<span class="wi-pill wi-pill-low">?<small>low confidence</small></span>'
      : '<span class="wi-pill" style="--wi-verdict:var(--wi-' + v[2] + ')">' + v[0] + '<small>' + conf(m.confidence) + '</small></span>';
    var rows = [['Insight density', m.density + '/10 <span class="wi-bar" aria-hidden="true">' + bar + '</span>'], ['Content type', CT[m.type]],
      ['Already known', pct(m.known)], ['Claims supported', pct(m.claims)], ['Sales pitch', pct(m.pitch)], ['AI-written', pct(m.ai)], ['Payload', PL[m.payload]]];
    if (m.minutes) rows.push(['Length', m.minutes + ' min']);
    var reasons = (m.reasons || []).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('');
    return '<div class="wi-body"><div class="wi-head">' + pill + '</div><div class="wi-title">' + esc(m.title) + '</div><dl class="wi-grid">' +
      rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>' +
      (reasons ? '<ul class="wi-reasons">' + reasons + '</ul>' : '') +
      '<div class="wi-foot"><button type="button" tabindex="-1">Read</button><button type="button" tabindex="-1">Skip</button>' + (m.cached ? '<span class="wi-cache" title="from cache"></span>' : '') + '</div></div>';
  }

  /* ---------- feed mode, live ---------- */
  safe(function () {
    var list = $('#hn-list'), cap = $('#hn-caption'), reload = $('#hn-reload');
    // Fictional titles. Verdicts are hand-written examples, not Jev output.
    var items = [
      ['A 4 KB Forth that boots on a $2 microcontroller', 'hobbyhw.dev', '212 points · 87 comments', 'read_now', .91, 8, 'original_research', .18, .9, .02, .04, 'evenly', ['Insight density 8/10', 'Reads as original research (90%)', 'Serves your goals (77%)']],
      ['We cut our CI bill 70% by deleting tests nobody read', 'infra-notes.example', '148 points · 203 comments', 'skim', .62, 5, 'opinion', .46, .61, .05, .12, 'intro', ['Insight density 5/10', 'Reads as opinion (71%)']],
      ['Show HN: Mirrorwell, a self-hosted read-later app that scores articles', 'mirrorwell.example', '96 points · 41 comments', 'save', .74, 7, 'news', .22, .7, .34, .08, 'middle', ['Insight density 7/10', 'Reads as news (64%)', '~19 min read']],
      ['The one productivity hack that changed everything for me', 'medium.example', '31 points · 58 comments', 'skip', .93, 2, 'listicle', .88, .3, .21, .77, 'end', ['You likely know this already (88%)', 'Insight density 2/10', 'Reads as a listicle (85%)']],
      ['Notes on integer overflow in 40 years of C compilers', 'compilerlore.example', '304 points · 121 comments', 'save', .86, 9, 'original_research', .27, .93, .01, .03, 'evenly', ['Insight density 9/10', 'Reads as original research (95%)', 'Serves your goals (82%)', '~42 min read']],
      ['Why every startup should ditch Kubernetes (from the team at PaaSly)', 'paasly.example', '54 points · 97 comments', 'skip', .89, 4, 'advertorial', .52, .38, .84, .41, 'end', ['Reads as an advertorial (89%)', 'Likely a sales pitch (84%)']],
      ['Bitter Lake: a slow reading of the 1979 speeches', 'longform.example', '77 points · 22 comments', 'skim', .33, 6, 'opinion', .3, .55, .02, .06, 'middle', ['Insight density 6/10', 'Reads as opinion (52%)']],
      ['Rust 2.0 will not happen, and that is fine', 'ferrous-blog.example', '188 points · 240 comments', 'skim', .68, 6, 'opinion', .41, .66, .03, .09, 'intro', ['Insight density 6/10', 'Reads as opinion (80%)']],
      ['Tracing a single DNS TTL through a 40-hour outage', 'postmortems.example', '421 points · 156 comments', 'read_now', .88, 8, 'original_research', .2, .87, .01, .05, 'middle', ['Insight density 8/10', 'Reads as original research (86%)', 'Serves your goals (79%)', '~11 min read']],
      ['Ten frameworks you MUST learn before 2027', 'devlistz.example', '12 points · 44 comments', 'skip', .95, 1, 'listicle', .81, .2, .3, .88, 'evenly', ['You likely know this already (81%)', 'Insight density 1/10', 'Reads as a listicle (93%)']]
    ];
    var models = items.map(function (r) {
      return { title: r[0], domain: r[1], snippet: r[2], verdict: r[3], confidence: r[4], density: r[5], type: r[6], known: r[7], claims: r[8], pitch: r[9], ai: r[10], payload: r[11], reasons: r[12] };
    });
    list.innerHTML = models.map(function (m, i) {
      var low = m.confidence < .4, v = VT[m.verdict];
      var badge = low ? '?' : v[1];
      return '<li><div class="wi"><a class="t" href="#feed" onclick="return false">' + esc(m.title) + '</a> <span class="d">(' + m.domain + ')</span>' +
        '<span class="wi-badge-host" data-i="' + i + '"><button type="button" class="wi-badge" aria-expanded="false" aria-haspopup="true"' + (low ? '' : ' style="--wi-verdict:var(--wi-' + v[2] + ')"') +
        ' aria-label="' + (low ? 'low confidence' : v[0] + ', ' + conf(m.confidence) + ' confidence') + '">' + badge + '<span class="wi-dot wi-dot-' + conf(m.confidence) + '" aria-hidden="true"></span></button>' +
        '<div class="wi-pop" role="tooltip" hidden></div></span><span class="s">' + m.snippet + '</span></div></li>';
    }).join('');
    var hosts = $$('.wi-badge-host', list), timers = [], cached = false;
    function run(instant) {
      timers.forEach(clearTimeout); timers = [];
      hosts.forEach(function (h) { h.classList.remove('on'); });
      cap.textContent = instant ? '' : 'Judging 10 links · 1 Jev call';
      hosts.forEach(function (h, i) {
        var delay = instant ? 0 : 500 + i * 120;
        timers.push(setTimeout(function () {
          h.classList.add('on');
          if (i === hosts.length - 1) cap.textContent = instant ? '10 cache hits · 0 tokens' : '10 links judged · cached for 7 days';
        }, motionOK ? delay : 0));
      });
    }
    hosts.forEach(function (h) {
      var m = models[+h.getAttribute('data-i')], pop = $('.wi-pop', h), btn = $('.wi-badge', h), t;
      var show = function () { clearTimeout(t); if (!pop.innerHTML) pop.innerHTML = cardHTML(Object.assign({ cached: cached }, m)); pop.hidden = false; btn.setAttribute('aria-expanded', 'true'); };
      var hide = function () { clearTimeout(t); pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
      h.addEventListener('mouseenter', function () { clearTimeout(t); t = setTimeout(show, 150); });
      h.addEventListener('mouseleave', function () { clearTimeout(t); t = setTimeout(hide, 120); });
      h.addEventListener('focusin', show);
      h.addEventListener('focusout', function (e) { if (!h.contains(e.relatedTarget)) hide(); });
      h.addEventListener('keydown', function (e) { if (e.key === 'Escape') { hide(); btn.focus(); } });
      btn.addEventListener('click', function () { pop.hidden ? show() : hide(); });
    });
    reload.addEventListener('click', function () { cached = true; hosts.forEach(function (h) { $('.wi-pop', h).innerHTML = ''; }); run(true); });
    var fired = false;
    if ('IntersectionObserver' in window && motionOK) {
      new IntersectionObserver(function (es, io) { if (es[0].isIntersecting && !fired) { fired = true; run(false); io.disconnect(); } }, { threshold: .25 }).observe(list);
    } else run(true);
  });

  /* ---------- reader toggle demo ---------- */
  safe(function () {
    var ta = $('#goals'), ul = $('#arts'), btns = $$('.presets button');
    var presets = {
      ml: { goals: 'I build training and inference systems. I care about GPU kernels, memory bandwidth, distributed training, and profiling. I already know the basics of transformers and CUDA. Skip career advice and product launches.',
        v: [['read_now', .9], ['skip', .86], ['skim', .58]] },
      game: { goals: 'I make small indie games solo. I care about game feel, level design, procedural generation, and how other designers think about difficulty and economy. Skip anything about ML infrastructure or dev tooling.',
        v: [['skip', .88], ['read_now', .87], ['skim', .52]] }
    };
    var arts = [['Writing a fused attention kernel in CUDA, from scratch', 'tutorial · 18 min read'], ['How a roguelike card economy keeps a run tense', 'opinion · 9 min read'], ['Postmortem: the 40-hour outage caused by one DNS TTL', 'original research · 11 min read']];
    ul.innerHTML = arts.map(function (a) { return '<li><div>' + esc(a[0]) + '<small>' + a[1] + '</small></div><span class="pill"></span></li>'; }).join('');
    var pills = $$('.pill', ul);
    function apply(key) {
      var p = presets[key]; ta.value = p.goals;
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-preset') === key)); });
      pills.forEach(function (pill, i) {
        var v = p.v[i]; pill.className = 'pill ' + v[0] + (motionOK ? ' flip' : '');
        pill.innerHTML = VT[v[0]][0] + ' <small>' + conf(v[1]) + '</small>';
        setTimeout(function () { pill.classList.remove('flip'); }, 300);
      });
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-preset')); }); });
    apply('ml');
  });

  /* ---------- tunable sliders (subset of src/jev/verdict.ts rules) ---------- */
  safe(function () {
    var s = { density: 8, known: .35, goals: .84, minutes: 22 };
    var inD = $('#t-density'), inK = $('#t-known'), inM = $('#t-minutes');
    var pill = $('#t-pill'), rule = $('#t-rule');
    function verdict(t) {
      var long = s.minutes > t.minutes, goalFit = s.goals >= .6;
      if (s.known >= t.known) return ['skip', 'already_known'];
      if (s.density <= 3) return ['skip', 'low_density'];
      if (s.density >= t.density && s.known <= .5 && goalFit) return long ? ['save', 'read_now_long_save'] : ['read_now', 'read_now'];
      if (goalFit && s.density >= 5 && long) return ['save', 'skim_long_save'];
      return ['skim', 'default_skim'];
    }
    function update() {
      var t = { density: +inD.value, known: +inK.value, minutes: +inM.value };
      $('#o-density').value = t.density; $('#o-known').value = t.known.toFixed(2); $('#o-minutes').value = t.minutes;
      var v = verdict(t);
      pill.className = 'pill ' + v[0]; pill.innerHTML = VT[v[0]][0] + ' <small>high</small>'; rule.textContent = v[1];
    }
    [inD, inK, inM].forEach(function (i) { i.addEventListener('input', update); });
    update();
  });
})();
