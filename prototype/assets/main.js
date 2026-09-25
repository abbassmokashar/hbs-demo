(() => {
  const body = document.body;
  const preloader = document.querySelector('.preloader');
  const header = document.querySelector('[data-header]');
  const progress = document.querySelector('.scroll-progress span');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-menu');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finishLoading = () => {
    body.classList.remove('is-loading');
    preloader?.classList.add('is-hidden');
  };

  if (reduceMotion || sessionStorage.getItem('hbs-preloader-seen')) {
    finishLoading();
  } else {
    window.addEventListener('load', () => {
      window.setTimeout(() => {
        sessionStorage.setItem('hbs-preloader-seen', 'true');
        finishLoading();
      }, 950);
    });
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
  const activateTab = (tab) => {
    const key = tab.dataset.programTab;
    tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    });
    panels.forEach((panel) => {
      const active = panel.dataset.programPanel === key;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
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

  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
  document.querySelector('[data-year]').textContent = new Date().getFullYear();
})();
