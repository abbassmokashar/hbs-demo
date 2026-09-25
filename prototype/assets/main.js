(() => {
  const body = document.body;
  const preloader = document.querySelector('.preloader');
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // sessionStorage can throw in locked-down browsing modes; never let it break the page.
  const store = {
    get: (key) => { try { return sessionStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* ignore */ } },
  };

  const finishLoading = () => {
    body.classList.remove('is-loading');
    preloader?.classList.add('is-hidden');
  };

  // Reveal once the hero image and fonts are ready instead of waiting for window.load,
  // which does not fire until every image on the page has downloaded.
  const MIN_VISIBLE_MS = 900;
  const MAX_VISIBLE_MS = 2600;

  if (reduceMotion || store.get('hbs-preloader-seen')) {
    finishLoading();
  } else {
    const startedAt = performance.now();
    let revealed = false;

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      // Let the logo animation finish, but never hold the page longer than the cap.
      const remaining = Math.max(0, MIN_VISIBLE_MS - (performance.now() - startedAt));
      window.setTimeout(() => {
        store.set('hbs-preloader-seen', 'true');
        finishLoading();
      }, remaining);
    };

    const heroImage = document.querySelector('.hero__image img');
    const heroReady = heroImage?.decode ? heroImage.decode() : Promise.resolve();
    const fontsReady = document.fonts?.ready ?? Promise.resolve();

    Promise.all([heroReady, fontsReady]).catch(() => {}).then(reveal);
    window.setTimeout(reveal, MAX_VISIBLE_MS);
  }

  const updateScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.transform = `scaleX(${ratio})`;
    header.classList.toggle('is-scrolled', window.scrollY > 28);
  };

  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });

  const closeMenu = () => {
    menuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.classList.remove('is-open');
    body.style.overflow = '';
  };

  menuButton?.addEventListener('click', () => {
    const opening = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(opening));
    mobileMenu.setAttribute('aria-hidden', String(!opening));
    mobileMenu.classList.toggle('is-open', opening);
    body.style.overflow = opening ? 'hidden' : '';
  });

  mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  document.querySelectorAll('[data-principle] button').forEach((button) => {
    button.addEventListener('click', () => {
      const current = button.closest('[data-principle]');
      document.querySelectorAll('[data-principle]').forEach((item) => {
        const active = item === current;
        item.classList.toggle('is-active', active);
        item.querySelector('button').setAttribute('aria-expanded', String(active));
      });
    });
  });

  const tabs = [...document.querySelectorAll('[data-program-tab]')];
  const panels = [...document.querySelectorAll('[data-program-panel]')];
  const panelsWrap = document.querySelector('.program-panels');
  const PANEL_FADE_MS = 200;
  let panelSwapTimer = null;

  // Swap panels with no transition.
  const showPanel = (key) => {
    tabs.forEach((item) => {
      const active = item.dataset.programTab === key;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.programPanel === key;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  };

  // Dissolve the panel area while swapping so the change reads as a cross-fade.
  const activateTab = (tab) => {
    const key = tab.dataset.programTab;
    if (reduceMotion || !panelsWrap) {
      showPanel(key);
      return;
    }
    panelsWrap.classList.add('is-switching');
    window.clearTimeout(panelSwapTimer);
    panelSwapTimer = window.setTimeout(() => {
      showPanel(key);
      // A short timed pause lets the swapped panel paint before fading back in.
      // A timer rather than requestAnimationFrame, which can stall and would
      // leave the panel area stuck at zero opacity.
      panelSwapTimer = window.setTimeout(() => panelsWrap.classList.remove('is-switching'), 40);
    }, PANEL_FADE_MS);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const direction = event.key === 'ArrowRight' ? 1 : -1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      activateTab(next);
      next.focus();
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });

  document.querySelectorAll('.reveal, [data-reveal-group]').forEach((element) => observer.observe(element));
  document.querySelector('[data-year]').textContent = new Date().getFullYear();

  // Measure the dual-degree flight path so its dash animations loop seamlessly
  // instead of guessing a length that may not match the curve.
  const routeBase = document.querySelector('.dual-degree__route-base');
  const dualVisual = document.querySelector('.dual-degree__visual');
  if (routeBase && dualVisual) {
    const length = routeBase.getTotalLength();
    const dash = length * 0.16;
    dualVisual.style.setProperty('--route-len', length);
    dualVisual.style.setProperty('--route-dash', dash);
    dualVisual.style.setProperty('--route-gap', length - dash);
  }
})();
