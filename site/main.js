/* Winnow landing — vanilla, no libraries. Motion gated on prefers-reduced-motion. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var motion = matchMedia('(prefers-reduced-motion: no-preference)').matches;
  var CLASS = { READ: 'badge-read', SKIM: 'badge-skim', SAVE: 'badge-save', SKIP: 'badge-skip' };

  /* Header scroll state + scroll cue */
  var header = $('#header'), cue = $('#scroll-cue');
  function onScroll() {
    header.classList.toggle('is-scrolled', scrollY > 8);
    if (cue && scrollY > 40) cue.classList.add('is-hidden');
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Section reveals */
  if (motion && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Hero card cycle — §7. Illustrative content; confidences are examples, not measurements. */
  var examples = [
    { title: 'Deep dive into KV caching for LLMs', source: 'youtube.com', decision: 'READ', confidence: 92,
      reasons: ['High insight density', 'Mostly new to you', 'Not clickbait', 'Best part: 04:32 → 08:10'] },
    { title: 'Building RAG from scratch', source: 'youtube.com · 24:18', decision: 'SKIM', confidence: 88,
      reasons: ['Good explanation, but only 7 minutes are useful', 'Partly familiar to you', 'Best part: 09:20 → 16:14'] },
    { title: 'Why AI changes EVERYTHING', source: 'youtube.com · 18:42', decision: 'SKIP', confidence: 95,
      reasons: ['Low new-information density', 'Likely engagement bait', 'Mostly repeats topics you already know'] },
    { title: 'A field guide to distributed consensus', source: 'arxiv.org · 48 min read', decision: 'SAVE', confidence: 84,
      reasons: ['High insight density', 'Long: 48 minutes', 'Serves your goals', 'Good, just not for right now'] }
  ];
  var hero = $('#hero-card');
  if (hero && motion) {
    var h = {};
    $$('[data-hero]', hero).forEach(function (el) { h[el.dataset.hero] = el; });
    var i = 0;
    function show(ex) {
      h.title.textContent = ex.title;
      h.source.textContent = ex.source;
      h.badge.className = 'badge ' + CLASS[ex.decision];
      h.badge.innerHTML = '';
      h.badge.appendChild(document.createTextNode(ex.decision));
      var conf = document.createElement('span');
      conf.className = 'badge__conf';
      conf.textContent = ' · ' + ex.confidence + '%';
      h.badge.appendChild(conf);
      h.reasons.innerHTML = '';
      ex.reasons.forEach(function (r) { var li = document.createElement('li'); li.textContent = r; h.reasons.appendChild(li); });
    }
    function step() {
      if (document.hidden) return;
      i = (i + 1) % examples.length;
      hero.classList.add('is-evaluating');
      setTimeout(function () {
        show(examples[i]);
        hero.classList.remove('is-evaluating');
      }, 800);
    }
    setInterval(step, 3500);
  }

  /* Noise → signal — §10 */
  var noise = $('#noise');
  if (noise) {
    if (motion && 'IntersectionObserver' in window) {
      var nio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { setTimeout(function () { noise.classList.add('is-filtered'); }, 500); nio.disconnect(); }
      }, { threshold: 0.4 });
      nio.observe(noise);
    } else {
      noise.classList.add('is-filtered');
    }
  }

  /* Tabs helper (feed demo + personalization) — keyboard per WAI-ARIA */
  function tabs(list, onSelect) {
    var items = $$('[role="tab"]', list);
    function select(idx, focus) {
      items.forEach(function (t, k) {
        var on = k === idx;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      if (focus) items[idx].focus();
      if (onSelect) onSelect(idx);
    }
    items.forEach(function (t, k) {
      t.addEventListener('click', function () { select(k, false); });
      t.addEventListener('keydown', function (e) {
        var n = { ArrowRight: k + 1, ArrowDown: k + 1, ArrowLeft: k - 1, ArrowUp: k - 1, Home: 0, End: items.length - 1 }[e.key];
        if (n === undefined) return;
        e.preventDefault();
        select((n + items.length) % items.length, true);
      });
    });
    return { select: select, length: items.length };
  }

  /* Feed demo — sticky, scroll-driven on desktop (§30), plain tabs otherwise */
  var track = $('#feed-track'), feedList = $('#feed-tabs');
  if (feedList) {
    var sticky = matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
    var current = 0, fromScroll = false;
    var feedTabs = tabs(feedList, function (idx) {
      current = idx;
      if (sticky.matches && !fromScroll) {
        var range = track.offsetHeight - innerHeight;
        scrollTo({ top: track.offsetTop + range * ((idx + 0.5) / feedTabs.length), behavior: 'smooth' });
      }
    });
    function onFeedScroll() {
      if (!sticky.matches) return;
      var range = track.offsetHeight - innerHeight;
      var p = (scrollY - track.offsetTop) / range;
      var idx = Math.min(feedTabs.length - 1, Math.max(0, Math.floor(p * feedTabs.length)));
      if (idx !== current) { fromScroll = true; feedTabs.select(idx, false); fromScroll = false; }
    }
    addEventListener('scroll', onFeedScroll, { passive: true });
  }

  /* Article demo — click the pill (§16) */
  var artBadge = $('#art-badge');
  if (artBadge) artBadge.addEventListener('click', function () {
    var open = artBadge.getAttribute('aria-expanded') === 'true';
    artBadge.setAttribute('aria-expanded', String(!open));
    $('#art-detail').hidden = open;
  });

  /* Video payoff — §18 */
  var timeline = $('#timeline');
  if (timeline) {
    if (motion && 'IntersectionObserver' in window) {
      var vio = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { timeline.classList.add('is-live'); vio.disconnect(); }
      }, { threshold: 0.5 });
      vio.observe(timeline);
    } else {
      timeline.classList.add('is-live');
    }
    $('#jump').addEventListener('click', function () {
      if (!motion) return;
      timeline.classList.remove('is-live');
      timeline.classList.add('is-reset');   // snap back without transitions
      void timeline.offsetWidth;
      timeline.classList.remove('is-reset');
      timeline.classList.add('is-live');
    });
  }

  /* Personalization toggle — §20 */
  var who = $('#who-tabs');
  if (who) tabs(who);

  /* Explainability — §22 */
  var why = $('#why');
  if (why) why.addEventListener('click', function () {
    var open = why.getAttribute('aria-expanded') === 'true';
    why.setAttribute('aria-expanded', String(!open));
    $('#why-more').hidden = open;
    why.textContent = open ? 'Why?' : 'Less';
  });
})();
