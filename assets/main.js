(() => {
  'use strict';

  document.documentElement.classList.add('has-js');
  // Progressive-enhancement safety net: content and images must never remain
  // hidden if an observer is interrupted by a browser extension or a JS error.
  window.setTimeout(() => {
    document.querySelectorAll('.reveal, .steps article').forEach((el) => el.classList.add('is-visible'));
  }, 2600);

  const BASE = window.HBS_BASE || '';
  const ASSET_QUERY = window.HBS_ASSET_VERSION
    ? `?v=${encodeURIComponent(window.HBS_ASSET_VERSION)}`
    : '';
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
      script.src = `${BASE}assets/search-index.js${ASSET_QUERY}`;
      script.onload = () => { index = Array.isArray(window.HBS_SEARCH_INDEX) ? window.HBS_SEARCH_INDEX : []; resolve(index); };
      script.onerror = () => {
        fetch(`${BASE}assets/search-index.json${ASSET_QUERY}`)
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

  /* ---------------------------------------------------------- Study tools */
  const toolRoot = document.querySelector('[data-hbs-tool]');
  if (toolRoot) {
    const base = toolRoot.dataset.base || window.HBS_BASE || '';
    const programs = [
      { id: 'bba', name: 'BBA Business Administration', short: 'HBS BBA', level: 'Bachelor', award: 'Bachelor of Business Administration', duration: '3 years', years: 3, credits: '135 CH · 180 ECTS', location: 'Switzerland', format: 'On campus', tuition: 9000, intake: 'September · January · April', route: 'programs/bba/', career: 'Broad business leadership, entrepreneurship and management', tags: ['school', 'business', 'switzerland', 'early'] },
      { id: 'dual-bba', name: 'BBA + B.Sc. International Management', short: 'Dual Bachelor', level: 'Bachelor', award: 'BBA + B.Sc.', duration: '3 years', years: 3, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 11000, intake: 'September · January · April', route: 'programs/dual-degrees/bba-international-management/', career: 'International management and cross-border business', tags: ['school', 'business', 'international', 'dual', 'early'] },
      { id: 'mba', name: 'MBA Business Administration', short: 'HBS MBA', level: 'Master', award: 'Master of Business Administration', duration: '2 years', years: 2, credits: '90 CH · 120 ECTS', location: 'Switzerland', format: 'On campus', tuition: 11000, intake: 'September · January · April', route: 'programs/mba/', career: 'Leadership, strategy and organisational management', tags: ['degree', 'business', 'leadership', 'switzerland'] },
      { id: 'dual-management', name: 'MBA + M.Sc. International Management', short: 'Dual International Management', level: 'Master', award: 'MBA + M.Sc.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/international-management/', career: 'Global strategy and international management', tags: ['degree', 'business', 'international', 'dual', 'leadership'] },
      { id: 'dual-marketing', name: 'MBA + M.A. Strategic Marketing Management', short: 'Dual Strategic Marketing', level: 'Master', award: 'MBA + M.A.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/strategic-marketing-management/', career: 'Brand strategy, market leadership and growth', tags: ['degree', 'marketing', 'international', 'dual'] },
      { id: 'dual-finance', name: 'MBA + M.Sc. Finance', short: 'Dual Finance', level: 'Master', award: 'MBA + M.Sc.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/finance/', career: 'Corporate finance, investment and financial strategy', tags: ['degree', 'finance', 'international', 'dual'] },
      { id: 'dual-data', name: 'MBA + M.Sc. Business Intelligence & Data Science', short: 'Dual Data Science', level: 'Master', award: 'MBA + M.Sc.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/business-intelligence-data-science/', career: 'Analytics, business intelligence and data-led strategy', tags: ['degree', 'data', 'international', 'dual'] },
      { id: 'dual-digital', name: 'MBA + M.A. Digital Marketing', short: 'Dual Digital Marketing', level: 'Master', award: 'MBA + M.A.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/digital-marketing/', career: 'Digital strategy, campaigns and customer growth', tags: ['degree', 'marketing', 'digital', 'dual'] },
      { id: 'dual-supply', name: 'MBA + M.Sc. International Logistics & Supply Chain', short: 'Dual Supply Chain', level: 'Master', award: 'MBA + M.Sc.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/international-logistics-supply-chain-management/', career: 'Global operations, logistics and supply networks', tags: ['degree', 'operations', 'international', 'dual'] },
      { id: 'dual-luxury', name: 'MBA + M.A. Luxury, Fashion & Sales Management', short: 'Dual Luxury Management', level: 'Master', award: 'MBA + M.A.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/luxury-fashion-sales-management/', career: 'Luxury brands, fashion business and sales leadership', tags: ['degree', 'marketing', 'luxury', 'dual'] },
      { id: 'dual-entrepreneurship', name: 'MBA + M.A. Entrepreneurship', short: 'Dual Entrepreneurship', level: 'Master', award: 'MBA + M.A.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/entrepreneurship/', career: 'Venture creation, innovation and business growth', tags: ['degree', 'business', 'entrepreneurship', 'dual'] },
      { id: 'dual-sport', name: 'MBA + M.A. Strategic Sports Management', short: 'Dual Sports Management', level: 'Master', award: 'MBA + M.A.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/strategic-sports-management/', career: 'Sports organisations, events and commercial strategy', tags: ['degree', 'sport', 'international', 'dual'] },
      { id: 'dual-psychology', name: 'MBA + M.Sc. Psychology & Management', short: 'Dual Psychology & Management', level: 'Master', award: 'MBA + M.Sc.', duration: '2.5 years', years: 2.5, credits: 'HBS + ISM curriculum', location: 'Switzerland + Germany', format: 'Dual-country campus journey', tuition: 13500, intake: 'September · January · April', route: 'programs/dual-degrees/psychology-management/', career: 'People strategy, organisational behaviour and leadership', tags: ['degree', 'people', 'leadership', 'dual'] },
      { id: 'cert-research', name: 'Market Research Certificate', short: 'Market Research', level: 'Executive', award: 'HBS + MRS certificate', duration: 'Flexible', years: .5, credits: '4 ECTS', location: 'Online', format: '100% online', tuition: 2499, intake: 'Start anytime', route: 'programs/executive-certificates/market-research/', career: 'Consumer insight and evidence-based decisions', tags: ['professional', 'data', 'marketing', 'flexible'] },
      { id: 'cert-consulting', name: 'Strategic Consultancy Certificate', short: 'Strategic Consultancy', level: 'Executive', award: 'Executive certificate', duration: '6 months', years: .5, credits: 'Certificate', location: 'Online', format: '100% online', tuition: 2100, intake: 'Scheduled cohort', route: 'programs/executive-certificates/strategic-consultancy/', career: 'Consulting, policy and private-sector development', tags: ['professional', 'business', 'leadership', 'flexible'] },
      { id: 'cert-project', name: 'Project Management Executive', short: 'Project Management', level: 'Executive', award: 'Executive certificate', duration: '8 weeks', years: .16, credits: 'Certificate', location: 'Online or blended', format: 'Online or blended', tuition: 2100, intake: 'Scheduled cohort', route: 'programs/executive-certificates/project-management/', career: 'Project delivery, risk and stakeholder management', tags: ['professional', 'operations', 'leadership', 'flexible'] },
      { id: 'cert-ai', name: 'AI for Executives', short: 'AI for Executives', level: 'Executive', award: 'Executive certificate', duration: '5 days', years: .04, credits: 'Certificate', location: 'Online or in class', format: 'Online or in class', tuition: 2100, intake: 'Scheduled cohort', route: 'programs/executive-certificates/ai-for-executives/', career: 'AI strategy and digital transformation', tags: ['professional', 'data', 'digital', 'leadership', 'flexible'] },
    ];
    const money = (value) => new Intl.NumberFormat('en-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(Math.round(value));
    const icon = (name) => ({ compass: '↗', lens: '◎', plan: '◇' }[name] || '→');
    const toolHeader = (eyebrow, title, text, step = '') => `<div class="tool-heading"><div><p class="eyebrow eyebrow--green">${eyebrow}</p><h2>${title}</h2></div><div class="tool-heading__aside">${step ? `<span>${step}</span>` : ''}<p>${text}</p></div></div>`;

    const initPathway = () => {
      const questions = [
        { key: 'stage', label: 'Where are you starting?', note: 'Choose the point that best reflects your current journey.', options: [['school', 'Finishing secondary school', 'I am preparing for my first degree.'], ['degree', 'I already have a degree', 'I want an advanced business qualification.'], ['professional', 'I am an experienced professional', 'I need focused, career-ready development.']] },
        { key: 'interest', label: 'What would you most like to shape?', note: 'This helps us understand the direction behind your decision.', options: [['business', 'Business & leadership', 'Strategy, organisations and management'], ['marketing', 'Markets & customers', 'Brand, digital, sales and insight'], ['finance', 'Finance & investment', 'Financial decisions and performance'], ['data', 'Data & technology', 'Analytics, AI and transformation'], ['operations', 'Projects & operations', 'Delivery, logistics and supply networks'], ['people', 'People & organisations', 'Psychology, culture and talent']] },
        { key: 'journey', label: 'What kind of journey feels right?', note: 'There is no wrong answer—you can revise it later.', options: [['switzerland', 'One focused Swiss experience', 'Study with HBS in La Tour-de-Peilz'], ['dual', 'Two countries and two degrees', 'Combine HBS in Switzerland with ISM in Germany'], ['flexible', 'Flexible professional study', 'Keep learning alongside your career']] },
        { key: 'priority', label: 'What matters most right now?', note: 'We use this as the final signal in your shortlist.', options: [['international', 'International exposure', 'Build a cross-border network'], ['leadership', 'Leadership progression', 'Prepare for broader responsibility'], ['entrepreneurship', 'Creating something new', 'Develop an entrepreneurial mindset'], ['digital', 'Future-ready capabilities', 'Build confidence with digital change']] },
      ];
      let step = 0;
      const answers = {};
      const draw = () => {
        const q = questions[step];
        toolRoot.innerHTML = `<div class="compass-shell">${toolHeader('Pathway Compass', q.label, q.note, `Question ${step + 1} of ${questions.length}`)}<div class="compass-progress" aria-label="Progress">${questions.map((_, i) => `<span class="${i <= step ? 'is-active' : ''}"></span>`).join('')}</div><div class="compass-options">${q.options.map(([value, title, text], i) => `<button type="button" data-answer="${value}"><span>0${i + 1}</span><strong>${title}</strong><small>${text}</small><i aria-hidden="true">${icon('compass')}</i></button>`).join('')}</div>${step ? '<button class="tool-back" type="button" data-tool-back>← Previous question</button>' : ''}</div>`;
        toolRoot.querySelectorAll('[data-answer]').forEach((button) => button.addEventListener('click', () => {
          answers[q.key] = button.dataset.answer;
          if (step < questions.length - 1) { step += 1; draw(); } else showResults();
        }));
        toolRoot.querySelector('[data-tool-back]')?.addEventListener('click', () => { step -= 1; draw(); });
      };
      const showResults = () => {
        const ranked = programs.map((program) => {
          let score = program.tags.filter((tag) => Object.values(answers).includes(tag)).length * 3;
          if (answers.stage === 'school' && program.level === 'Bachelor') score += 6;
          if (answers.stage === 'degree' && program.level === 'Master') score += 6;
          if (answers.stage === 'professional' && program.level === 'Executive') score += 7;
          if (answers.journey === 'dual' && program.tags.includes('dual')) score += 5;
          if (answers.journey === 'switzerland' && !program.tags.includes('dual') && program.level !== 'Executive') score += 4;
          return { ...program, score };
        }).sort((a, b) => b.score - a.score).slice(0, 3);
        toolRoot.innerHTML = `<div class="compass-result">${toolHeader('Your compass result', `Your strongest route is <em>${ranked[0].short}.</em>`, 'This is a guided starting point, not an admissions decision. Explore the matches and speak with HBS for personal advice.')}<div class="match-grid">${ranked.map((p, i) => `<article class="match-card ${i === 0 ? 'match-card--lead' : ''}"><span>${i === 0 ? 'Strongest match' : `Alternative 0${i + 1}`}</span><h3>${p.name}</h3><p>${p.career}</p><dl><div><dt>Duration</dt><dd>${p.duration}</dd></div><div><dt>Journey</dt><dd>${p.location}</dd></div></dl><a class="arrow-link" href="${base}${p.route}">Explore program <i aria-hidden="true">↗</i></a></article>`).join('')}</div><div class="tool-actions"><button class="btn btn--dark" type="button" data-tool-restart><span>Retake compass</span></button><a class="btn btn--apply" href="${base}tools/program-lens/"><span>Compare these routes</span><span class="btn__arrow">↗</span></a></div></div>`;
        toolRoot.querySelector('[data-tool-restart]').addEventListener('click', () => { step = 0; Object.keys(answers).forEach((key) => delete answers[key]); draw(); });
      };
      draw();
    };

    const initCompare = () => {
      let selected = ['bba', 'dual-bba'];
      const rows = [
        ['Award', 'award'], ['Study level', 'level'], ['Duration', 'duration'], ['Credits', 'credits'],
        ['Institution', 'institution'], ['Academic partner', 'partner'], ['Study location', 'location'],
        ['International mobility', 'mobility'], ['Delivery format', 'format'], ['Study pace', 'pace'],
        ['Teaching language', 'language'], ['Entry profile', 'entry'], ['Academic focus', 'focus'],
        ['Best suited to', 'bestFor'], ['Annual tuition', 'tuition'], ['Estimated tuition total', 'totalTuition'],
        ['Application fee', 'applicationFee'], ['Admission fee', 'admissionFee'], ['Available intakes', 'intake'],
        ['Career direction', 'career'], ['Next step', 'nextStep'],
      ];
      const aspect = (program, key) => {
        const dual = program.tags.includes('dual');
        const values = {
          institution: dual ? 'HBS + International School of Management' : 'Helvetic Business School',
          partner: dual ? 'International School of Management (ISM), Germany' : 'HBS academic network',
          mobility: dual ? 'Built-in Switzerland–Germany progression' : program.location === 'Online' ? 'No relocation required' : 'International campus community in Switzerland',
          pace: program.level === 'Executive' ? 'Short, professionally focused' : 'Full degree pathway',
          language: 'English',
          entry: program.level === 'Bachelor' ? 'Secondary-school graduates and equivalent applicants' : program.level === 'Master' ? 'Bachelor-degree holders and qualified applicants' : 'Working professionals and career changers',
          focus: program.career,
          bestFor: dual ? 'Students seeking two degrees and cross-border experience' : program.level === 'Executive' ? 'Professionals building a targeted capability' : `Students seeking a focused ${program.level.toLowerCase()} experience in Switzerland`,
          totalTuition: money(program.level === 'Executive' ? program.tuition : program.tuition * program.years),
          applicationFee: 'CHF 150', admissionFee: 'CHF 1,000',
          nextStep: program.level === 'Executive' ? 'Check cohort dates and speak with HBS' : 'Review entry requirements and prepare an application',
        };
        if (key === 'tuition') return program.level === 'Executive' ? `${money(program.tuition)} program fee` : `${money(program.tuition)} / year`;
        return values[key] || program[key];
      };
      const draw = () => {
        const chosen = selected.map((id) => programs.find((p) => p.id === id));
        toolRoot.innerHTML = `${toolHeader('Program Lens', 'Compare the complete picture. <em>Not just the headline.</em>', 'Choose up to three programs. Academic, practical, financial and progression differences are highlighted automatically.', `${selected.length} of 3 selected`)}<div class="lens-picker" aria-label="Choose programs">${programs.map((p) => `<button type="button" data-program="${p.id}" class="${selected.includes(p.id) ? 'is-selected' : ''}" aria-pressed="${selected.includes(p.id)}"><span>${p.level}</span><strong>${p.short}</strong><i>${selected.includes(p.id) ? '✓' : '+'}</i></button>`).join('')}</div>${chosen.length ? `<div class="lens-table-wrap"><table class="lens-table"><thead><tr><th>Compare</th>${chosen.map((p, i) => `<th><span>Choice 0${i + 1}</span>${p.name}<button type="button" data-remove="${p.id}" aria-label="Remove ${p.name}">×</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label, key]) => { const values = chosen.map((p) => aspect(p, key)); const differs = new Set(values).size > 1; return `<tr class="${differs ? 'is-different' : ''}"><th>${label}${differs ? '<small>Different</small>' : ''}</th>${values.map((value) => `<td>${value}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div><div class="tool-actions"><a class="btn btn--dark" href="${base}${chosen[0].route}"><span>Explore first choice</span><span class="btn__arrow">↗</span></a><a class="btn btn--apply" href="${base}tools/plan-your-investment/?program=${chosen[0].id}"><span>Plan the investment</span><span class="btn__arrow">↗</span></a></div>` : '<p class="tool-empty">Choose at least one program to begin your comparison.</p>'}`;
        toolRoot.querySelectorAll('[data-program]').forEach((button) => button.addEventListener('click', () => {
          const id = button.dataset.program;
          if (selected.includes(id)) selected = selected.filter((item) => item !== id);
          else if (selected.length < 3) selected.push(id);
          else { button.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 240 }); return; }
          draw();
        }));
        toolRoot.querySelectorAll('[data-remove]').forEach((button) => button.addEventListener('click', () => { selected = selected.filter((id) => id !== button.dataset.remove); draw(); }));
      };
      draw();
    };

    const initInvestment = () => {
      const queryProgram = new URLSearchParams(location.search).get('program');
      let lead = null;
      try { lead = JSON.parse(localStorage.getItem('hbsInvestmentLeadV1') || 'null'); } catch (_) { /* local storage may be unavailable */ }
      const degreeOptions = programs.map((p) => `<option value="${p.id}" ${p.id === queryProgram ? 'selected' : ''}>${p.name}</option>`).join('');
      const renderGate = () => {
        toolRoot.innerHTML = `<div class="investment-gate"><div class="investment-gate__story"><p class="eyebrow eyebrow--teal">Before the numbers</p><h2>Let us make your estimate <em>personal.</em></h2><p>Tell HBS what you are considering, then shape a realistic study-and-living scenario around your plans.</p><ol><li><span>01</span>Introduce your study interests</li><li><span>02</span>Build your personal cost scenario</li><li><span>03</span>Receive the finished estimate by email</li></ol><p class="privacy-note">HBS uses the details you provide to prepare your estimate and support your admissions enquiry. <a href="${base}about/policies/">Read our policies</a>.</p></div><div class="investment-gate__form"><form class="lead-form" data-investment-lead><div class="lead-form__intro"><span>Required details</span><h3>Start your investment plan</h3><p>All fields are required.</p></div><div class="lead-form__grid"><label>First name<input type="text" name="first-name" autocomplete="given-name" required></label><label>Last name<input type="text" name="last-name" autocomplete="family-name" required></label><label>Email<input type="email" name="email" autocomplete="email" required></label><label>Phone<input type="tel" name="phone" autocomplete="tel" required></label><label>Country<input type="text" name="country" autocomplete="country-name" required></label><label>Degree of interest<select name="degree-of-interest" required><option value="">Choose a degree level</option><option>Bachelor</option><option>Master</option><option>Executive education</option></select></label><label class="lead-form__wide">Program of interest<select name="program-of-interest" required><option value="">Choose a program</option>${degreeOptions}</select></label><label class="lead-form__wide">Preferred intake<select name="preferred-intake" required><option value="">Choose an intake</option><option>September</option><option>January</option><option>April</option><option>Not sure yet</option></select></label></div><button class="btn btn--apply btn--block" type="submit"><span>Open my planner</span><span class="btn__arrow" aria-hidden="true">↗</span></button></form></div></div>`;
        toolRoot.querySelector('[data-investment-lead]').addEventListener('submit', (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          lead = {
            firstName: data.get('first-name'), lastName: data.get('last-name'), email: data.get('email'), phone: data.get('phone'),
            country: data.get('country'), degree: data.get('degree-of-interest'), program: data.get('program-of-interest'), intake: data.get('preferred-intake'),
            createdAt: new Date().toISOString(),
          };
          try { localStorage.setItem('hbsInvestmentLeadV1', JSON.stringify(lead)); } catch (_) { /* planner still works without persistence */ }
          renderPlanner();
        });
      };
      const renderPlanner = () => {
        const degreePrograms = programs;
        const chosenId = lead?.program || queryProgram;
        const selected = degreePrograms.find((p) => p.id === chosenId) || degreePrograms[0];
        let latestEstimate = null;
        toolRoot.innerHTML = `${toolHeader('Plan Your Investment', 'Shape a scenario around <em>your life.</em>', 'Move the choices and figures. Your estimate updates instantly and stays private in your browser.')}<div class="investment-layout"><form class="investment-controls" data-investment-form><fieldset><legend><span>01</span>Study plan</legend><label>Program<select name="program">${degreePrograms.map((p) => `<option value="${p.id}" ${p.id === selected.id ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label><label>Preferred intake<select name="intake"><option ${lead?.intake === 'September' ? 'selected' : ''}>September</option><option ${lead?.intake === 'January' ? 'selected' : ''}>January</option><option ${lead?.intake === 'April' ? 'selected' : ''}>April</option></select></label><label>Planning period<select name="months"><option value="10">10 months per study year</option><option value="12" selected>12 months per study year</option></select></label></fieldset><fieldset><legend><span>02</span>Living scenario</legend><label>Accommodation<select name="housing"><option value="750">Shared / student housing — from CHF 750</option><option value="1200">Private studio — estimate CHF 1,200</option><option value="0">Living with family / commuting</option></select></label><div class="range-field"><label for="food">Food &amp; essentials <output data-out="food">CHF 450</output></label><input id="food" name="food" type="range" min="250" max="900" step="25" value="450"></div><div class="range-field"><label for="transport">Local transport <output data-out="transport">CHF 60</output></label><input id="transport" name="transport" type="range" min="0" max="300" step="10" value="60"></div><div class="range-field"><label for="personal">Personal budget <output data-out="personal">CHF 250</output></label><input id="personal" name="personal" type="range" min="100" max="800" step="25" value="250"></div></fieldset><fieldset><legend><span>03</span>Arrival</legend><label>Student status<select name="visa"><option value="0">EU / EFTA</option><option value="250">Non-EU / EFTA — indicative permit allowance</option></select></label><label class="check-line"><input type="checkbox" name="insurance" checked><span>Include indicative health insurance (CHF 1,300/year)</span></label><label class="check-line"><input type="checkbox" name="books" checked><span>Include books and materials (CHF 300/year)</span></label></fieldset></form><aside class="investment-result"><p class="eyebrow eyebrow--teal">Your working estimate</p><h3 data-result-program></h3><div class="investment-total"><span>Full program estimate</span><strong data-result-total></strong><small>Tuition + selected living scenario</small></div><div class="investment-bars" data-result-bars></div><dl><div><dt>First study year</dt><dd data-result-first></dd></div><div><dt>Average per month</dt><dd data-result-month></dd></div><div><dt>Program length</dt><dd data-result-duration></dd></div></dl><p class="estimate-note">Indicative planning estimate only. Fees and personal costs can change; HBS admissions will confirm current charges and payment arrangements.</p><div class="estimate-delivery" data-estimate-delivery aria-live="polite"></div><div class="tool-actions"><button class="btn btn--cream" type="button" data-print-estimate><span>Print estimate</span></button><button class="btn btn--apply" type="button" data-receive-estimate><span>Receive my estimate</span><span class="btn__arrow">↗</span></button></div></aside></div>`;
        const form = toolRoot.querySelector('[data-investment-form]');
        const update = () => {
          const data = new FormData(form); const program = degreePrograms.find((p) => p.id === data.get('program')) || degreePrograms[0];
          const months = Number(data.get('months')); const livingMonthly = ['housing', 'food', 'transport', 'personal'].reduce((sum, key) => sum + Number(data.get(key) || 0), 0);
          const annualExtras = (data.get('insurance') ? 1300 : 0) + (data.get('books') ? 300 : 0);
          const executive = program.level === 'Executive';
          const oneTime = executive ? 0 : 150 + 1000 + Number(data.get('visa') || 0);
          const tuitionTotal = executive ? program.tuition : program.tuition * program.years;
          const livingTotal = executive ? (livingMonthly * 12 + annualExtras) * program.years : (livingMonthly * months + annualExtras) * program.years;
          const total = tuitionTotal + livingTotal + oneTime; const first = executive ? total : program.tuition + livingMonthly * months + annualExtras + oneTime;
          toolRoot.querySelector('[data-result-program]').textContent = program.name;
          toolRoot.querySelector('[data-result-total]').textContent = money(total);
          toolRoot.querySelector('[data-result-first]').textContent = money(first);
          toolRoot.querySelector('[data-result-month]').textContent = money(total / Math.max(1, program.years * (executive ? 12 : months)));
          toolRoot.querySelector('[data-result-duration]').textContent = program.duration;
          toolRoot.querySelector('[data-result-bars]').innerHTML = [['Tuition', tuitionTotal], ['Living', livingTotal], ['One-time', oneTime]].map(([label, value]) => `<div><span><b>${label}</b><em>${money(value)}</em></span><i style="--share:${Math.max(4, value / total * 100)}%"></i></div>`).join('');
          ['food', 'transport', 'personal'].forEach((key) => { toolRoot.querySelector(`[data-out="${key}"]`).textContent = money(Number(data.get(key))); });
          latestEstimate = { program: program.name, intake: data.get('intake'), total: money(total), firstYear: money(first), monthly: money(total / Math.max(1, program.years * (executive ? 12 : months))), duration: program.duration, recipient: lead?.email, updatedAt: new Date().toISOString() };
        };
        form.addEventListener('input', update); form.addEventListener('change', update); toolRoot.querySelector('[data-print-estimate]').addEventListener('click', () => window.print());
        toolRoot.querySelector('[data-receive-estimate]').addEventListener('click', () => {
          try { localStorage.setItem('hbsPendingEstimateV1', JSON.stringify({ lead, estimate: latestEstimate })); } catch (_) {}
          const delivery = toolRoot.querySelector('[data-estimate-delivery]');
          delivery.innerHTML = `<strong>Estimate prepared</strong><span>Your estimate is ready for <b></b>. You can continue adjusting the figures or print a copy now.</span>`;
          delivery.querySelector('b').textContent = lead?.email || 'your email';
          delivery.classList.add('is-visible');
        });
        update();
      };
      if (lead?.email) renderPlanner(); else renderGate();
    };

    if (toolRoot.dataset.hbsTool === 'pathway') initPathway();
    if (toolRoot.dataset.hbsTool === 'compare') initCompare();
    if (toolRoot.dataset.hbsTool === 'investment') initInvestment();
  }

  /* ------------------------------------------------------------------ Misc */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  document.querySelector('.to-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
})();
