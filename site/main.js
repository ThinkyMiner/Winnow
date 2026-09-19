/* Winnow site — six small interactions, no dependencies. */
(function () {
  'use strict';
  var motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  var setPill = function (pill, d, c) {
    pill.className = 'pill pill--' + d;
    pill.innerHTML = d.toUpperCase() + '<span class="pill__conf">· ' + c + '%</span>';
  };
  var setList = function (ul, items) {
    ul.innerHTML = '';
    items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  };

  /* 1. Section reveal: whole blocks, once. */
  var reveals = document.querySelectorAll('.reveal');
  if (motion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* 2. Hero card: cycles four verdict shapes every 3.5s with an Evaluating… beat. */
  var card = document.getElementById('hero-card');
  if (card) {
    var ex = [
      { title: 'Deep dive into KV caching for LLMs', source: 'youtube.com · 41:05', d: 'read', c: 92,
        r: ['High insight density', 'Mostly new to you', 'Not clickbait', 'Best part: 04:32 → 08:10'] },
      { title: 'Building RAG from scratch', source: 'youtube.com · 24:18', d: 'skim', c: 88,
        r: ['Good explanation, but only 7 minutes are useful', 'Partly familiar to you', 'Best part: 09:20 → 14:00'] },
      { title: 'Why AI changes EVERYTHING', source: 'youtube.com · 18:42', d: 'skip', c: 95,
        r: ['Low new-information density', 'Likely engagement bait', 'Mostly repeats topics you already know'] },
      { title: 'A field guide to distributed consensus', source: 'arxiv.org · 48 min read', d: 'save', c: 81,
        r: ['High insight density', 'Long: 48 minutes', 'Serves your goals', 'Good, just not for right now'] }
    ];
    var h = {}, i = 0;
    ['title', 'source', 'pill', 'reasons'].forEach(function (k) { h[k] = card.querySelector('[data-hero="' + k + '"]'); });
    var show = function (e) {
      h.title.textContent = e.title; h.source.textContent = e.source;
      setPill(h.pill, e.d, e.c); setList(h.reasons, e.r);
    };
    if (motion) {
      setInterval(function () {
        card.classList.add('is-eval');
        setTimeout(function () { i = (i + 1) % ex.length; show(ex[i]); card.classList.remove('is-eval'); }, 700);
      }, 3500);
    }
  }

  /* 3. Noise → signal (Fig. 01) and 4. segment map (Fig. 03) are CSS on .is-in; JS only replays, and drives the tooltips. */
  var jump = document.getElementById('jump'), fig3 = document.getElementById('fig3');
  if (jump && fig3) {
    jump.addEventListener('click', function (ev) {
      ev.preventDefault();
      if (!motion) return;
      fig3.classList.remove('is-in');
      void fig3.offsetWidth; // restart the transitions and keyframes
      fig3.classList.add('is-in');
    });
    var map = fig3.querySelector('.segmap'), tipline = document.getElementById('seg-tipline');
    var showLine = function (seg) { tipline.textContent = Array.prototype.map.call(seg.querySelectorAll('.seg__tip > span'), function (s) { return s.textContent; }).join(' · '); };
    map.querySelectorAll('.seg').forEach(function (seg) {
      seg.addEventListener('click', function () { showLine(seg); });
      seg.addEventListener('focus', function () { map.classList.remove('is-hush'); showLine(seg); });
    });
    map.addEventListener('mouseleave', function () { map.classList.remove('is-hush'); });
    map.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      map.classList.add('is-hush');
      if (document.activeElement && document.activeElement.classList.contains('seg')) document.activeElement.blur();
    });
  }

  /* 5. Reader toggle (Fig. 04): same video, two readers. */
  var rc = document.getElementById('reader-card');
  if (rc) {
    var states = {
      new: { d: 'skim', c: 67, r: ['General signal quality', 'No goals set yet', 'Nothing in your history on this topic'] },
      later: { d: 'skip', c: 94, r: ['You already know most of this', 'Overlaps with what you read this month', 'Nothing new for your goals'] }
    };
    var btns = document.querySelectorAll('[data-reader]');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-pressed') === 'true') return;
        btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        var s = states[b.dataset.reader], apply = function () {
          setPill(rc.querySelector('[data-reader-pill]'), s.d, s.c);
          setList(rc.querySelector('[data-reader-reasons]'), s.r);
          rc.classList.remove('is-swap');
        };
        if (motion) { rc.classList.add('is-swap'); setTimeout(apply, 220); } else apply();
      });
    });
  }

  /* 6. Tabs (Fig. 02): click, arrow keys, Home/End. */
  var list = document.querySelector('[role="tablist"]');
  if (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var select = function (t) {
      tabs.forEach(function (o) {
        var on = o === t;
        o.setAttribute('aria-selected', on ? 'true' : 'false');
        o.tabIndex = on ? 0 : -1;
        document.getElementById(o.getAttribute('aria-controls')).hidden = !on;
      });
      t.focus();
    };
    tabs.forEach(function (t, n) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) {
        var k = e.key, m = n;
        if (k === 'ArrowRight') m = (n + 1) % tabs.length;
        else if (k === 'ArrowLeft') m = (n - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') m = 0;
        else if (k === 'End') m = tabs.length - 1;
        else return;
        e.preventDefault(); select(tabs[m]);
      });
    });
  }

  /* 8. Footer tagline alternates between the two lines. */
  var ftag = document.getElementById('footer-tag');
  if (ftag && matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    var lines = ['Less noise. More signal.', "Your attention is expensive. The internet acts like it isn't."];
    var at = 0, timer = null;
    var swap = function () {
      ftag.classList.add('is-out');
      setTimeout(function () {
        at = (at + 1) % lines.length;
        ftag.textContent = lines[at];
        ftag.classList.remove('is-out');
      }, 320);
    };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !timer) timer = setInterval(swap, 4200);
        else if (!e.isIntersecting && timer) { clearInterval(timer); timer = null; }
      });
    }, { threshold: 0.2 });
    io.observe(ftag);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && timer) { clearInterval(timer); timer = null; }
    });
  }
})();
