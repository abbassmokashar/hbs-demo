(() => {
  'use strict';

  document.documentElement.classList.add('has-js');
  // Progressive-enhancement safety net: content and images must never remain
  // hidden if an observer is interrupted by a browser extension or a JS error.
  window.setTimeout(() => {
    document.querySelectorAll('.reveal, .steps article').forEach((el) => el.classList.add('is-visible'));
  }, 2600);

  const BASE = window.HBS_BASE || '';
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');

  const store = {
    get: (key) => { try { return sessionStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* ignore */ } },
  };

  /* ------------------------------------------------------------- Preloader */
  const preloader = document.querySelector('.preloader');
  const finishLoading = () => {
    body.classList.remove('is-loading');
    preloader?.classList.add('is-hidden');
  };

  if (reduceMotion || store.get('hbs-loader-seen') || !preloader) {
    finishLoading();
  } else {
    const MIN = 850;
    const MAX = 2400;
    const start = performance.now();
    let done = false;
    const release = () => {
      if (done) return;
      done = true;
      const wait = Math.max(0, MIN - (performance.now() - start));
      window.setTimeout(() => { store.set('hbs-loader-seen', 'true'); finishLoading(); }, wait);
    };
    const heroImg = document.querySelector('.hero__media img');
    const heroReady = heroImg?.decode ? heroImg.decode() : Promise.resolve();
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    Promise.all([heroReady, fontsReady]).catch(() => {}).then(release);
    window.setTimeout(release, MAX);
  }

  /* -------------------------------------------------- Scroll progress + header */
  let lastY = window.scrollY;
  const updateScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (header) {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 30);
      // Hide the header only while scrolling down, past the hero, and once the
      // solid scrolled state is active. Any upward scroll reveals it again.
      const goingDown = y > lastY + 4;
      const goingUp = y < lastY - 4;
      if (goingDown && y > 560) header.classList.add('is-hidden');
      if (goingUp || y <= 30) header.classList.remove('is-hidden');
      lastY = y;
    }
    document.querySelector('.to-top')?.classList.toggle('is-visible', window.scrollY > 900);
  };
  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });

  /* ----------------------------------------------------------- Mega menu */
  const navItems = [...document.querySelectorAll('[data-mega]')];
  let megaTimer = null;
  const closeMega = (except) => {
    navItems.forEach((item) => { if (item !== except) item.classList.remove('is-open'); });
  };
  navItems.forEach((item) => {
    const trigger = item.querySelector('.nav__trigger');
    const open = () => { window.clearTimeout(megaTimer); closeMega(item); item.classList.add('is-open'); };
    const close = () => { megaTimer = window.setTimeout(() => item.classList.remove('is-open'), 140); };
    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', close);
    trigger?.addEventListener('click', (event) => {
      event.preventDefault();
      item.classList.toggle('is-open');
      closeMega(item);
    });
    item.addEventListener('focusin', open);
    item.addEventListener('focusout', (event) => {
      if (!item.contains(event.relatedTarget)) item.classList.remove('is-open');
    });
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMega(); });

  /* -------------------------------------------------------- Off-canvas drawer */
  const drawer = document.querySelector('[data-drawer]');
  const scrim = document.querySelector('[data-scrim]');
  const menuBtn = document.querySelector('[data-menu-open]');
  const setDrawer = (open) => {
    drawer?.classList.toggle('is-open', open);
    scrim?.classList.toggle('is-open', open);
    menuBtn?.setAttribute('aria-expanded', String(open));
    body.classList.toggle('is-locked', open);
    if (drawer) drawer.setAttribute('aria-hidden', String(!open));
  };
  menuBtn?.addEventListener('click', () => setDrawer(true));
  document.querySelectorAll('[data-menu-close]').forEach((el) => el.addEventListener('click', () => setDrawer(false)));
  scrim?.addEventListener('click', () => setDrawer(false));
  drawer?.querySelectorAll('.drawer__group > button').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.closest('.drawer__group');
      const open = !group.classList.contains('is-open');
      group.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------------------------------------------------------------- Search */
  const overlay = document.querySelector('[data-search]');
  const input = overlay?.querySelector('input[type="search"]');
  const results = overlay?.querySelector('[data-search-results]');
  let index = null;
  let indexPromise = null;

  const openSearch = () => {
    overlay?.classList.add('is-open');
    body.classList.add('is-locked');
    window.setTimeout(() => input?.focus(), 120);
    loadIndex();
  };
  const closeSearch = () => {
    overlay?.classList.remove('is-open');
    body.classList.remove('is-locked');
  };

  // The index is loaded lazily as a plain script so search works even when the
  // prototype is opened directly from disk, where fetch() is blocked. If the
  // script is unavailable we fall back to the JSON endpoint.
  const loadIndex = () => {
    if (indexPromise) return indexPromise;
    if (Array.isArray(window.HBS_SEARCH_INDEX)) {
      index = window.HBS_SEARCH_INDEX;
      indexPromise = Promise.resolve(index);
      return indexPromise;
    }
    indexPromise = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `${BASE}assets/search-index.js`;
      script.onload = () => { index = Array.isArray(window.HBS_SEARCH_INDEX) ? window.HBS_SEARCH_INDEX : []; resolve(index); };
      script.onerror = () => {
        fetch(`${BASE}assets/search-index.json`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data) => { index = Array.isArray(data) ? data : []; resolve(index); })
          .catch(() => { index = []; resolve(index); });
      };
      document.head.appendChild(script);
    });
    return indexPromise;
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const runSearch = (query) => {
    if (!results) return;
    const term = query.trim().toLowerCase();
    if (!term) {
      results.innerHTML = '<p>Start typing to search programs, admissions, faculty and insights.</p>';
      return;
    }
    const words = term.split(/\s+/);
    const matches = (index || [])
      .map((item) => {
        const haystack = `${item.title} ${item.group} ${item.text}`.toLowerCase();
        let score = 0;
        words.forEach((word) => {
          if (item.title.toLowerCase().includes(word)) score += 6;
          if (haystack.includes(word)) score += 2;
        });
        return { item, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
    results.innerHTML = matches.length
      ? matches.map(({ item }) => `<a href="${BASE}${item.url}"><strong>${escapeHtml(item.title)}</strong><em>${escapeHtml(item.group)}</em><small>${escapeHtml(item.text)}</small></a>`).join('')
      : `<p>No results for “${escapeHtml(query)}”. Try “MBA”, “tuition”, “visa” or “faculty”.</p>`;
  };

  document.querySelectorAll('[data-search-open]').forEach((button) => {
    button.addEventListener('click', (event) => { event.preventDefault(); openSearch(); });
  });
  document.querySelectorAll('[data-search-close]').forEach((button) => button.addEventListener('click', closeSearch));
  overlay?.addEventListener('click', (event) => { if (event.target === overlay) closeSearch(); });
  input?.addEventListener('input', () => runSearch(input.value));
  overlay?.querySelectorAll('[data-search-hint]').forEach((button) => {
    button.addEventListener('click', () => { if (input) { input.value = button.dataset.searchHint; runSearch(input.value); } });
  });
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
    if (event.key === 'Escape') { closeSearch(); setDrawer(false); }
    if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) { event.preventDefault(); openSearch(); }
  });

  /* ------------------------------------- Search page (progressive enhancement) */
  const searchPageForm = document.querySelector('[data-search-page]');
  if (searchPageForm) {
    const pageInput = searchPageForm.querySelector('input');
    const pageResults = document.querySelector('[data-search-page-results]');
    const render = () => {
      const term = pageInput.value.trim().toLowerCase();
      if (!pageResults) return;
      if (!term) { pageResults.innerHTML = '<p class="lead">Search across programs, admissions, faculty, partnerships and insights.</p>'; return; }
      const found = (index || []).filter((item) => `${item.title} ${item.group} ${item.text}`.toLowerCase().includes(term)).slice(0, 30);
      pageResults.innerHTML = found.length
        ? found.map((item) => `<a href="${BASE}${item.url}"><em>${escapeHtml(item.group)}</em><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.text)}</small></a>`).join('')
        : `<p class="lead">No results for “${escapeHtml(pageInput.value)}”.</p>`;
    };
    loadIndex().then(render);
    searchPageForm.addEventListener('submit', (event) => { event.preventDefault(); runSearchPage(); });
    function runSearchPage() { render(); }
    pageInput.addEventListener('input', render);
    const preset = new URLSearchParams(location.search).get('q');
    if (preset) { pageInput.value = preset; loadIndex().then(render); }
  }

  /* --------------------------------------------------------------- Reveal */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.reveal, .steps article').forEach((el) => observer.observe(el));

  /* ------------------------------------------------------------ Accordions */
  document.querySelectorAll('[data-accordion] .acc__trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.acc');
      const container = trigger.closest('[data-accordion]');
      const open = !item.classList.contains('is-open');
      container.querySelectorAll('.acc').forEach((other) => {
        other.classList.remove('is-open');
        other.querySelector('.acc__trigger')?.setAttribute('aria-expanded', 'false');
      });
      item.classList.toggle('is-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
  });

  /* ------------------------------------------------------- In-page finders */
  document.querySelectorAll('[data-inner-search]').forEach((form) => {
    const target = form.dataset.innerSearch;
    const input = form.querySelector('input');
    const clear = form.querySelector('[data-search-clear]');
    const status = form.querySelector('.inner-search__status');
    const groups = [...document.querySelectorAll(`[data-filter-group="${target}"]`)];
    const items = groups.flatMap((group) => [...group.querySelectorAll('[data-filter-item]')]);
    const apply = () => {
      const query = input.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const match = !query || item.textContent.toLowerCase().includes(query);
        item.hidden = !match;
        if (match) visible += 1;
      });
      groups.forEach((group) => {
        const section = group.closest('.section');
        if (section) section.hidden = ![...group.querySelectorAll('[data-filter-item]')].some((item) => !item.hidden);
      });
      clear.classList.toggle('is-visible', Boolean(query));
      status.textContent = query ? `${visible} ${visible === 1 ? 'result' : 'results'} found` : `Showing all ${items.length} entries`;
    };
    input.addEventListener('input', apply);
    clear.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
    apply();
  });

  /* ------------------------------------------------------ Intake explorer */
  document.querySelectorAll('[data-intakes]').forEach((widget) => {
    const tabs = [...widget.querySelectorAll('[data-intake-tab]')];
    const panels = [...widget.querySelectorAll('.intake-panel')];
    const activate = (index, focus = false) => {
      tabs.forEach((tab, i) => {
        const active = i === index;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[i].hidden = !active;
        panels[i].classList.toggle('is-active', active);
      });
      if (focus) tabs[index].focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activate(i));
      tab.addEventListener('keydown', (event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        activate((i + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length, true);
      });
    });
  });

  /* --------------------------------------------------------- Deep links */
  const revealHashTarget = () => {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const target = document.getElementById(id);
    if (!target) return;
    const accordionItem = target.closest('.acc');
    if (accordionItem) {
      const container = accordionItem.closest('[data-accordion]');
      container?.querySelectorAll('.acc').forEach((item) => {
        const open = item === accordionItem;
        item.classList.toggle('is-open', open);
        item.querySelector('.acc__trigger')?.setAttribute('aria-expanded', String(open));
      });
    }
    window.setTimeout(() => target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }), 120);
  };
  window.addEventListener('hashchange', revealHashTarget);
  window.addEventListener('load', revealHashTarget);

  /* -------------------------------------------------------------- Counters */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const decimals = (el.dataset.count.split('.')[1] || '').length;
        if (reduceMotion) { el.textContent = target + suffix; countObserver.unobserve(el); return; }
        const duration = 1500;
        const startedAt = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * eased).toFixed(decimals) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countObserver.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countObserver.observe(el));
  }

  /* -------------------------------------------------------------- Parallax */
  const parallaxTargets = [...document.querySelectorAll('[data-parallax] img')];
  if (parallaxTargets.length && !reduceMotion) {
    let queued = false;
    const applyParallax = () => {
      parallaxTargets.forEach((img) => {
        const rect = img.closest('[data-parallax]').getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const offset = Math.max(-60, Math.min(60, (window.innerHeight / 2 - (rect.top + rect.height / 2)) * 0.08));
        img.style.setProperty('--parallax-y', `${offset}px`);
      });
      queued = false;
    };
    window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(applyParallax); } }, { passive: true });
  }

  /* --------------------------------------------------------- Route artwork */
  const routeBase = document.querySelector('.route__base');
  const routeWrap = document.querySelector('.route');
  if (routeBase && routeWrap) {
    const length = routeBase.getTotalLength();
    const dash = length * 0.17;
    routeWrap.style.setProperty('--rl', length);
    routeWrap.style.setProperty('--rd', dash);
    routeWrap.style.setProperty('--rg', length - dash);
  }

  /* ------------------------------------------------------------------ Misc */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  document.querySelector('.to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
})();
