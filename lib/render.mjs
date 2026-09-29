// Shared rendering library: document chrome (header, footer, search, drawer)
// and the section block renderers used by every generated page.

import { SITE, LOGO, gallery, dimsOf } from '../data/site.mjs';

// Campus pin used by the contact map block and every "Campus" link.
export const MAP_EMBED = SITE.mapEmbed;
export const MAP_LINK = SITE.mapUrl;

export const esc = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

export const slugify = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;|&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Rewrite root-relative hrefs (but never absolute, mailto, tel or anchors) so that
// authored HTML snippets work at any directory depth.
export const localise = (html, prefix) => String(html)
  .replace(/href="(?!https?:|mailto:|tel:|#|\/\/)/g, `href="${prefix}`);

export const prefixFor = (route) => '../'.repeat(route.split('/').filter(Boolean).length);
export const href = (prefix, route) => `${prefix}${route ? `${route}/` : 'index.html'}`;
export const absolute = (route) => `${SITE.url}/${route ? `${route}/` : ''}`;

export function img(prefix, src, alt, { eager = false, cls = '' } = {}) {
  const [w, h] = dimsOf(src);
  const attrs = [
    `src="${esc(prefix + src)}"`,
    `alt="${esc(alt)}"`,
    `width="${w}"`,
    `height="${h}"`,
    `decoding="async"`,
    eager ? 'fetchpriority="high"' : '',
    cls ? `class="${cls}"` : '',
  ].filter(Boolean).join(' ');
  return `<img ${attrs}>`;
}

/* ==========================================================================
   Navigation model — one source of truth for the mega menu and the drawer.
   ========================================================================== */

export const NAV = [
  {
    label: 'Programs',
    mega: [
      {
        title: 'Bachelor',
        links: [
          ['BBA — Business Administration', 'programs/bba', '3 years'],
          ['BBA + B.Sc. International Management', 'programs/dual-degrees/bba-international-management', 'HBS × ISM'],
        ],
      },
      {
        title: 'Master',
        links: [
          ['MBA — Business Administration', 'programs/mba', '2 years'],
          ['Dual Degrees — 10 ISM pathways', 'programs/dual-degrees', 'HBS × ISM'],
        ],
      },
      {
        title: 'Executive',
        links: [
          ['All Executive Certificates', 'programs/executive-certificates', '4 programs'],
          ['Market Research Certificate', 'programs/executive-certificates/market-research', 'MRS'],
          ['Strategic Consultancy', 'programs/executive-certificates/strategic-consultancy', 'MSM'],
          ['Project Management Executive', 'programs/executive-certificates/project-management', 'MSM'],
          ['AI for Executives', 'programs/executive-certificates/ai-for-executives', 'MSM'],
        ],
      },
    ],
    feature: {
      eyebrow: 'HBS × ISM',
      title: 'Two countries. Two degrees.',
      text: 'Study in Switzerland, transfer to Germany, and graduate with two internationally recognised degrees.',
      href: 'programs/dual-degrees',
      cta: 'Explore dual degrees',
    },
  },
  {
    label: 'Admissions',
    mega: [
      {
        title: 'Process',
        links: [
          ['How to Apply', 'admissions', 'Step by step'],
          ['Entry Requirements', 'admissions/requirements', 'Documents'],
          ['Tuition & Fees', 'admissions/tuition', 'Costs'],
        ],
      },
      {
        title: 'Support',
        links: [
          ['Visa, Arrival & Insurance', 'admissions/visa', 'International students'],
          ['Frequently Asked Questions', 'about/faq', 'Answers'],
          ['Contact Admissions', 'contact', 'Talk to us'],
        ],
      },
    ],
    feature: {
      eyebrow: 'Rolling admissions',
      title: 'Apply at least 10 weeks ahead.',
      text: 'Submit your application, transcripts and fees early so there is time for review, visa processing and arrival.',
      href: 'admissions',
      cta: 'How to apply',
    },
  },
  {
    label: 'About',
    mega: [
      {
        title: 'Institution',
        links: [
          ['About HBS', 'about', 'Our story'],
          ['Accreditation', 'about/accreditations', 'ACBSP'],
          ['Academic Partnerships', 'about/partnerships', 'Global network'],
          ['Policies', 'about/policies', 'Governance'],
        ],
      },
      {
        title: 'Community',
        links: [
          ['Faculty', 'about/faculty', 'Meet the team'],
          ['International School of Management', 'about/ism', 'Germany'],
          ['Student Life in Switzerland', 'student-life', 'Campus & culture'],
          ['Contact', 'contact', 'Find us'],
        ],
      },
    ],
    feature: {
      eyebrow: 'La Tour-de-Peilz',
      title: 'On the Swiss Riviera.',
      text: 'HBS is based at Chemin du Levant 5, minutes from Lake Geneva, between Lausanne and Montreux.',
      href: 'student-life',
      cta: 'Discover the campus',
    },
  },
  { label: 'Student Life', href: 'student-life' },
  { label: 'Insights', href: 'insights' },
];

/* ==========================================================================
   Header, drawer, search, footer
   ========================================================================== */

const lockup = (prefix, footer = false) => {
  const hbs = footer ? LOGO.hbsWhite : LOGO.hbs;
  return `<a class="brand${footer ? '' : ' brand--header'}" href="${prefix}index.html" aria-label="Helvetic Business School home">
    <img class="brand__hbs" src="${prefix}${hbs}" alt="Helvetic Business School" width="120" height="48">
  </a>`;
};

export function header(prefix) {
  const items = NAV.map((item) => {
    if (!item.mega) {
      return `<li class="nav__item"><a class="nav__trigger" href="${href(prefix, item.href)}">${esc(item.label)}</a></li>`;
    }
    const cols = item.mega.map((col) => `<div class="mega__col">
      <span>${esc(col.title)}</span>
      ${col.links.map(([label, route, meta]) => `<a href="${href(prefix, route)}">${esc(label)}${meta ? `<b>${esc(meta)}</b>` : ''}</a>`).join('')}
    </div>`).join('');
    const feature = item.feature ? `<div class="mega__feature">
      <span>${esc(item.feature.eyebrow)}</span>
      <h4>${esc(item.feature.title)}</h4>
      <p>${esc(item.feature.text)}</p>
      <a class="arrow-link" href="${href(prefix, item.feature.href)}">${esc(item.feature.cta)} <i aria-hidden="true">↗</i></a>
    </div>` : '';
    const cols3 = feature ? 'mega__grid' : 'mega__grid mega__grid--2';
    return `<li class="nav__item" data-mega>
      <button class="nav__trigger" type="button" aria-expanded="false">${esc(item.label)} <i aria-hidden="true">▾</i></button>
      <div class="mega"><div class="${cols3}">${cols}${feature}</div></div>
    </li>`;
  }).join('');

  const drawerGroups = NAV.map((item) => {
    if (!item.mega) {
      return `<a class="drawer__direct" href="${href(prefix, item.href)}">${esc(item.label)}</a>`;
    }
    const links = item.mega.flatMap((col) => col.links);
    return `<div class="drawer__group">
      <button type="button" aria-expanded="false">${esc(item.label)} <i aria-hidden="true">+</i></button>
      <div class="drawer__panel"><div>${links.map(([label, route]) => `<a href="${href(prefix, route)}">${esc(label)}</a>`).join('')}</div></div>
    </div>`;
  }).join('');

  return `<header class="site-header" data-header>
    <div class="site-header__inner">
      ${lockup(prefix)}
      <nav class="nav" aria-label="Primary"><ul>${items}</ul></nav>
      <div class="header-tools">
        <button class="icon-btn" type="button" data-search-open aria-label="Search the website">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </button>
        <a class="btn btn--sm btn--apply" href="${SITE.applyUrl}" target="_blank" rel="noopener">Apply now</a>
        <!-- Off-canvas trigger retained for tablet/mobile; hidden on desktop in CSS. -->
        <button class="icon-btn" type="button" data-menu-open aria-expanded="false" aria-controls="hbs-drawer" aria-label="Open menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
  </header>

  <div class="scrim" data-scrim aria-hidden="true"></div>
  <aside class="drawer" id="hbs-drawer" data-drawer aria-hidden="true" aria-label="Site menu">
    <div class="drawer__head">
      <img src="${prefix}${LOGO.hbsWhite}" alt="Helvetic Business School" width="140" height="46">
      <button class="drawer__close" type="button" data-menu-close aria-label="Close menu">✕</button>
    </div>
    ${drawerGroups}
    <div class="drawer__foot">
      <button class="btn btn--outline-light btn--block" type="button" data-search-open><span>Search the website</span><span class="btn__arrow" aria-hidden="true">⌕</span></button>
      <a class="btn btn--apply btn--block" href="${SITE.applyUrl}" target="_blank" rel="noopener"><span>Apply now</span><span class="btn__arrow" aria-hidden="true">↗</span></a>
      <a href="mailto:${SITE.email}">${SITE.email}</a>
      <a href="tel:${SITE.phoneHref}">${SITE.phoneDisplay}</a>
      <p>${SITE.address.street}<br>${SITE.address.city}, ${SITE.address.country}</p>
    </div>
  </aside>`;
}

export function searchOverlay(prefix) {
  return `<div class="search-overlay" data-search role="dialog" aria-modal="true" aria-label="Search">
    <button class="search-close" type="button" data-search-close aria-label="Close search">✕</button>
    <div class="search-box">
      <div class="search-box__field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" placeholder="Search programs, admissions, faculty…" aria-label="Search query" autocomplete="off">
      </div>
      <div class="search-box__hint">
        <button type="button" data-search-hint="MBA">MBA</button>
        <button type="button" data-search-hint="tuition">Tuition</button>
        <button type="button" data-search-hint="visa">Visa</button>
        <button type="button" data-search-hint="requirements">Requirements</button>
        <button type="button" data-search-hint="faculty">Faculty</button>
        <button type="button" data-search-hint="dual degree">Dual degrees</button>
      </div>
      <div class="search-results" data-search-results>
        <p>Start typing to search across programs, admissions, faculty and insights.</p>
      </div>
      <p style="margin-top:22px;font-size:.72rem;color:rgba(255,255,255,.45)">Tip: press <strong>/</strong> or <strong>Ctrl K</strong> anywhere to search. <a href="${prefix}search/" style="text-decoration:underline">Open the full search page</a>.</p>
    </div>
  </div>`;
}

export function footer(prefix) {
  return `<footer class="site-footer">
    <div class="shell footer__grid">
      <div class="footer__brand">
        <img src="${prefix}${LOGO.hbsWhite}" alt="Helvetic Business School" width="180" height="60">
        <p>${esc(SITE.tagline)} Innovative education, practical skills development and ethical leadership in La Tour-de-Peilz, Switzerland.</p>
        <div class="footer__social" style="margin-top:24px">
          <a href="https://www.instagram.com/helveticbusinessschool/" target="_blank" rel="noopener" aria-label="HBS on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="social-dot"/></svg></a>
          <a href="https://www.facebook.com/HelveticSchoolOfBusiness" target="_blank" rel="noopener" aria-label="HBS on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v8h4v-8h3.4l.6-4h-4V9c0-.7.3-1 1-1Z"/></svg></a>
          <a href="https://www.linkedin.com/company/helvetic-business-school/" target="_blank" rel="noopener" aria-label="HBS on LinkedIn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5H1.8V22H5V8.5ZM3.4 2A2.1 2.1 0 1 0 3.4 6.2 2.1 2.1 0 0 0 3.4 2ZM22 14.2c0-4-2.1-5.9-4.9-5.9-2.3 0-3.3 1.2-3.9 2.1V8.5H10V22h3.2v-6.7c0-1.8.3-3.5 2.6-3.5 2.2 0 2.3 2.1 2.3 3.7V22H22v-7.8Z"/></svg></a>
        </div>
      </div>
      <div class="footer__col">
        <span>Get in touch</span>
        <a class="footer__contact-lines" href="mailto:${SITE.email}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 6l9 7 9-7"/></svg><span>${SITE.email}</span></a>
        <a class="footer__contact-lines" href="tel:${SITE.phoneHref}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 2.8 9.4 7l-2 2.1c1.1 2.3 2.9 4.1 5.2 5.2l2.1-2 4.2 2.8-.8 3.6c-.2.8-.9 1.3-1.7 1.3C9.5 19.5 4.5 14.5 4 7.6c0-.8.5-1.5 1.3-1.7l1.3-3.1Z"/></svg><span>${SITE.phoneDisplay}</span></a>
        <address class="footer__contact-lines"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z"/><circle cx="12" cy="9" r="2.3"/></svg><span>${esc(SITE.address.street)}<br>${esc(SITE.address.city)}<br>${esc(SITE.address.country)}</span></address>
      </div>
      <div class="footer__col">
        <span>Explore</span>
        <a href="${href(prefix, 'programs')}">Programs</a>
        <a href="${href(prefix, 'programs/dual-degrees')}">Dual Degrees</a>
        <a href="${href(prefix, 'admissions')}">Admissions</a>
        <a href="${href(prefix, 'about')}">About HBS</a>
        <a href="${href(prefix, 'about/faculty')}">Faculty</a>
        <a href="${href(prefix, 'student-life')}">Student Life</a>
      </div>
      <div class="footer__col">
        <span>Support</span>
        <a href="${href(prefix, 'about/faq')}">FAQ</a>
        <a href="${href(prefix, 'admissions/visa')}">Visa &amp; Arrival</a>
        <a href="${href(prefix, 'admissions/tuition')}">Tuition &amp; Fees</a>
        <a href="${href(prefix, 'about/policies')}">Policies</a>
        <a href="${href(prefix, 'contact')}">Contact</a>
        <a href="${href(prefix, 'search')}">Search</a>
      </div>
    </div>
    <div class="shell footer__bottom">
      <p>© <span data-year></span> ${esc(SITE.name)} · La Tour-de-Peilz, Switzerland</p>
      <div class="footer__legal">
        <a href="${href(prefix, 'about/policies')}">Policies</a>
        <a href="${href(prefix, 'about/faq')}">FAQ</a>
        <a href="${href(prefix, 'about/accreditations')}">Accreditation</a>
      </div>
    </div>
  </footer>`;
}

/* ==========================================================================
   Block renderers
   ========================================================================== */

const head = (block, modifier = '') => {
  if (!block.eyebrow && !block.title) return '';
  return `<div class="section__head${modifier} reveal">
    <div>${block.eyebrow ? `<p class="eyebrow eyebrow--green">${esc(block.eyebrow)}</p>` : ''}${block.title ? `<h2>${block.title}</h2>` : ''}</div>
    ${block.lead ? `<p class="lead">${esc(block.lead)}</p>` : ''}
  </div>`;
};

const sectionId = (block) => block.id || block.anchor || slugify(block.title || block.eyebrow || '');
const section = (block, inner) => `<section class="section ${block.tone || 'section--paper'}"${sectionId(block) ? ` id="${sectionId(block)}"` : ''}>
  <div class="shell">${head(block)}${inner}</div>
</section>`;

const blocks = {
  homeHero: (b) => `<section class="hero" aria-labelledby="hero-title">
    <div class="hero__media" aria-hidden="true">${img(b.prefix, b.heroImage, '', { eager: true })}</div>
    <span class="hero__orb hero__orb--a" aria-hidden="true"></span>
    <span class="hero__orb hero__orb--b" aria-hidden="true"></span>
    <div class="hero__content">
      <p class="eyebrow reveal">Helvetic Business School <span style="opacity:.6">Switzerland</span></p>
      <h1 id="hero-title" class="reveal reveal--d1">${b.title}</h1>
      <p class="hero__intro reveal reveal--d2">Innovative education, practical skills development and ethical leadership in a personal learning environment on the Swiss Riviera.</p>
      <div class="hero__actions reveal reveal--d3">
        <a class="btn btn--cream" href="${b.prefix}programs/"><span>Explore programs</span><span class="btn__arrow" aria-hidden="true">↗</span></a>
        <a class="btn btn--outline-light" href="${SITE.requestUrl}" target="_blank" rel="noopener"><span>Request information</span></a>
        <a class="btn btn--outline-light" href="${b.prefix}search/" data-search-open><span>Search</span><span class="btn__arrow" aria-hidden="true">⌕</span></a>
      </div>
      <div class="hero__stats reveal reveal--d4">
        <div class="hero__stat"><strong data-count="135">0</strong><span>CH · 180 ECTS in the BBA</span></div>
        <div class="hero__stat"><strong data-count="10">0</strong><span>Dual master’s pathways</span></div>
        <div class="hero__stat"><strong data-count="1" data-suffix=":7">0</strong><span>Faculty-student ratio</span></div>
        <div class="hero__stat"><strong data-count="3">0</strong><span>Academic terms per year</span></div>
      </div>
    </div>
    <span class="hero__badge" aria-hidden="true">La Tour-de-Peilz<br>46.45° N</span>
    <a class="hero__scroll" href="#main-content"><span aria-hidden="true"></span>Scroll to discover</a>
  </section>`,

  prose: (b) => section(b, `<div class="rich reveal">${b.paras.map((p) => `<p>${p}</p>`).join('')}</div>`),

  cards: (b) => section(b, `<div class="cards cards--${b.cols || 3} stagger">${b.items.map((it) => {
    const [kicker, title, text, route, cta] = it;
    // An empty route means the site root, so a "Home" card still gets a link
    // instead of rendering as an unclickable card.
    const external = /^(https?:|mailto:|tel:)/.test(route || '');
    const link = external ? route : `${b.prefix}${route || 'index.html'}`;
    return `<article class="card reveal">
      ${kicker ? `<span class="card__kicker">${esc(kicker)}</span>` : ''}
      <h3>${esc(title)}</h3>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${route || cta ? `<a class="card__foot" href="${link}"${/^(https?:)/.test(route || '') ? ' target="_blank" rel="noopener"' : ''}><span>${esc(cta || 'Read more')}</span><span aria-hidden="true">↗</span></a>` : ''}
    </article>`;
  }).join('')}</div>`),

  tiles: (b) => section(b, `<div class="card-media stagger">${b.items.map((it) => `<article class="tile reveal">
    <div class="tile__media">${it.tag ? `<span class="tile__tag">${esc(it.tag)}</span>` : ''}${img(b.prefix, it.image, it.alt || it.title)}</div>
    <div class="tile__body">
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.text)}</p>
      <a class="card__foot" href="${/^https?:/.test(it.route) ? it.route : b.prefix + it.route}"${/^https?:/.test(it.route) ? ' target="_blank" rel="noopener"' : ''}><span>${esc(it.cta || 'Discover program')}</span><span aria-hidden="true">↗</span></a>
    </div>
  </article>`).join('')}</div>`),

  facts: (b) => section(b, `<dl class="facts reveal">${b.items.map(([label, value, link]) => `<div><dt>${esc(label)}</dt><dd>${link ? `<a href="${esc(link)}"${/^https?:/.test(link) ? ' target="_blank" rel="noopener"' : ''}>${esc(value)}<i aria-hidden="true">↗</i></a>` : esc(value)}</dd></div>`).join('')}</dl>`),

  bullets: (b) => section(b, `<ul class="bullets reveal${b.two ? ' bullets--2' : ''}">${b.items.map((i) => `<li>${i}</li>`).join('')}</ul>`),

  outcomes: (b) => section(b, `<ol class="outcomes">${b.items.map((item, i) => `<li class="reveal"><span>${String(i + 1).padStart(2, '0')}</span><p>${esc(item)}</p></li>`).join('')}</ol>`),

  steps: (b) => section(b, `<div class="steps">${b.items.map(([kicker, title, text]) => `<article class="reveal"><span>${esc(kicker)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></article>`).join('')}</div>`),

  // Each policy is a real link: an anchor to its own entry, plus a one-click
  // request for the official document from the HBS registry.
  policyList: (b) => section(b, `<div class="policy-list" data-filter-group="policies">${b.items.map(([name, scope, slug], i) => `<article class="policy" id="policy-${slug}" data-filter-item>
    <span class="policy__num">${String(i + 1).padStart(2, '0')}</span>
    <div class="policy__body">
      <h3><a class="policy__link" href="#policy-${slug}">${esc(name)}</a></h3>
      <p>${esc(scope)}</p>
    </div>
    <a class="policy__request" href="mailto:${SITE.email}?subject=${encodeURIComponent(`Request: ${name}`)}">Request the document <i aria-hidden="true">↗</i></a>
  </article>`).join('')}</div>`),

  accordion: (b) => section(b, `<div class="accordion" data-accordion data-filter-group="faq">${b.items.map(([q, a], i) => `<article class="acc${i === 0 ? ' is-open' : ''}" id="faq-${slugify(q)}" data-filter-item>
    <button class="acc__trigger" type="button" aria-expanded="${i === 0}"><span class="acc__num">${String(i + 1).padStart(2, '0')}</span><span class="acc__title">${esc(q)}</span><span class="acc__icon" aria-hidden="true">+</span></button>
    <div class="acc__panel"><div>${Array.isArray(a) ? a.map((p) => `<p>${p}</p>`).join('') : `<p>${a}</p>`}</div></div>
  </article>`).join('')}</div>`),

  stats: (b) => `<section class="section ${b.tone || 'section--dark'}"${sectionId(b) ? ` id="${sectionId(b)}"` : ''}><div class="shell"><div class="stats stagger">${b.items.map(([value, label, suffix]) => `<div class="stat reveal"><strong data-count="${value}"${suffix ? ` data-suffix="${suffix}"` : ''}>0</strong><span>${esc(label)}</span></div>`).join('')}</div></div></section>`,

  logos: (b) => section(b, `<div class="logos${b.featured ? ' logos--featured' : ''} reveal">${b.items.map(([file, label, url]) => {
    const logoClass = /aus-primary/i.test(file) ? ' logo--aus' : /ism-primary/i.test(file) ? ' logo--ism' : /hit\.webp$/i.test(file) ? ' logo--hit' : '';
    return `<figure class="logo${logoClass}">${url ? `<a href="${url}" target="_blank" rel="noopener">` : '<span>'}${img(b.prefix, file, label)}${url ? '</a>' : '</span>'}<figcaption>${esc(label)}</figcaption></figure>`;
  }).join('')}</div>`),

  acbspMembership: (b) => `<section class="section section--membership" id="${sectionId(b) || 'acbsp-membership'}"><div class="shell membership-card reveal">
    <div class="membership-card__mark"><span class="membership-card__orbit" aria-hidden="true"></span>${img(b.prefix, 'assets/images/brand/acbsp-member.webp', 'ACBSP member')}</div>
    <div class="membership-card__copy"><p class="eyebrow eyebrow--teal">Professional membership</p><h2>HBS is a member of <em>ACBSP.</em></h2><p>Our membership connects HBS with a global community focused on teaching excellence, continuous improvement and quality in business education.</p><a class="arrow-link" href="${href(b.prefix, 'about/accreditations')}">Explore accreditation &amp; memberships <i aria-hidden="true">↗</i></a></div>
  </div></section>`,

  logoWall: (b) => section(b, `<div class="logo-wall reveal">${b.items.map(([file, label]) => img(b.prefix, file, label)).join('')}</div>`),

  gallery: (b) => `<section class="section ${b.tone || 'section--paper'}"${sectionId(b) ? ` id="${sectionId(b)}"` : ''}><div class="shell">${b.eyebrow || b.title ? head(b) : ''}<div class="gallery">${b.items.map(([id, alt, size, caption]) => {
    const src = gallery(id);
    return `<figure class="reveal ${size || ''}">${img(b.prefix, src, alt)}${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
  }).join('')}</div></div></section>`,

  split: (b) => `<section class="section ${b.tone || 'section--paper'}${b.scrollStory ? ' section--scrollstory' : ''}"${sectionId(b) ? ` id="${sectionId(b)}"` : ''}><div class="shell media-split${b.reverse ? ' media-split--flip' : ''}${b.scrollStory ? ' media-split--scrollstory' : ''}">
    <div class="media-split__media${b.tall ? ' media-split__media--tall' : ''} reveal" data-reveal="mask">${img(b.prefix, b.image, b.alt || '')}${b.badge ? `<span class="media-split__badge">${esc(b.badge)}</span>` : ''}</div>
    <div class="media-split__body reveal">${b.eyebrow ? `<p class="eyebrow eyebrow--green">${esc(b.eyebrow)}</p>` : ''}<h2>${b.title}</h2><div class="lead" style="margin-bottom:24px">${b.paras.map((p) => `<p style="margin:0 0 14px">${p}</p>`).join('')}</div>${b.actions ? `<div class="section__action">${localise(b.actions, b.prefix)}</div>` : ''}</div>
  </div></section>`,

  table: (b) => section(b, `<div class="reveal" style="overflow-x:auto"><table class="table"><caption>${esc(b.caption || '')}</caption><thead><tr>${b.head.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`),

  intakes: (b) => section(b, `<div class="intakes reveal" data-intakes>
    <div class="intakes__tabs" role="tablist" aria-label="Academic intakes">${b.rows.map((row, i) => `<button type="button" role="tab" aria-selected="${i === 0}" aria-controls="intake-panel-${i}" id="intake-tab-${i}" data-intake-tab="${i}"><span>0${i + 1}</span>${esc(row[0])}</button>`).join('')}</div>
    <div class="intakes__panels">${b.rows.map((row, i) => `<article class="intake-panel${i === 0 ? ' is-active' : ''}" role="tabpanel" id="intake-panel-${i}" aria-labelledby="intake-tab-${i}"${i === 0 ? '' : ' hidden'}>
      <div class="intake-panel__date"><span>Term begins</span><strong>${esc(row[1])}</strong></div>
      <div class="intake-panel__deadline"><span>Non-EU / EFTA deadline</span><strong>${esc(row[2])}</strong><small>Allow extra time for visa processing</small></div>
      <div class="intake-panel__deadline"><span>EU / EFTA deadline</span><strong>${esc(row[3])}</strong><small>Submit a complete application by this date</small></div>
      <a class="btn btn--apply intake-panel__apply" href="${SITE.applyUrl}" target="_blank" rel="noopener"><span>Apply for ${esc(row[0])}</span><span class="btn__arrow" aria-hidden="true">↗</span></a>
    </article>`).join('')}</div>
  </div>`),

  filterSearch: (b) => `<section class="section section--finder ${b.tone || 'section--paper'}" id="${sectionId(b)}"><div class="shell"><form class="inner-search reveal" data-inner-search="${esc(b.target)}" role="search" onsubmit="return false">
    <label for="inner-search-${esc(b.target)}">${esc(b.title || 'Search')}</label>
    <div class="inner-search__field"><span aria-hidden="true">⌕</span><input id="inner-search-${esc(b.target)}" type="search" placeholder="${esc(b.placeholder || 'Search…')}" autocomplete="off"><button type="button" data-search-clear aria-label="Clear search">×</button></div>
    <p class="inner-search__status" aria-live="polite">Showing all entries</p>
  </form></div></section>`,

  timeline: (b) => section(b, `<ol class="timeline reveal">${b.items.map(([when, title, text]) => `<li><span>${esc(when)}</span><h3>${esc(title)}</h3><p>${esc(text)}</p></li>`).join('')}</ol>`),

  note: (b) => section(b, `<p class="note reveal">${b.text}</p>`),

  searchPage: (b) => `<section class="section section--paper"><div class="shell">
    <form class="search-page-form reveal" data-search-page role="search" onsubmit="return false">
      <label class="sr-only" for="search-page-input">Search the HBS website</label>
      <input id="search-page-input" type="search" placeholder="Search programs, admissions, faculty…" autocomplete="off">
      <button class="btn btn--dark" type="submit"><span>Search</span><span class="btn__arrow" aria-hidden="true">⌕</span></button>
    </form>
    <div class="search-page-results" data-search-page-results><p class="lead">Search across programs, admissions, faculty, partnerships and insights.</p></div>
  </div></section>`,

  marquee: (b) => `<div class="marquee" aria-hidden="true"><div class="marquee__track">${[0, 1, 2].map(() => b.words.map((w, i) => `<span class="${i % 2 ? 'is-outline' : ''}">${esc(w)}</span><i>✳</i>`).join('')).join('')}</div></div>`,

  ticker: (b) => `<div class="ticker" aria-hidden="true"><div class="ticker__track">${[0, 1, 2].map(() => b.words.map((w) => `<span>${esc(w)} <i>✳</i></span>`).join('')).join('')}</div></div>`,

  route: () => `<section class="section section--paper"><div class="shell"><div class="route" data-reveal="scale">
    <svg class="route__art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="route__base" d="M34 68 C 32 44 48 24 66 30" vector-effect="non-scaling-stroke"/><path class="route__pulse" d="M34 68 C 32 44 48 24 66 30" vector-effect="non-scaling-stroke"/></svg>
    <span class="route__node route__node--a" aria-hidden="true"></span><span class="route__node route__node--b" aria-hidden="true"></span>
    <div class="route__country route__country--a"><span>CH</span><strong>Switzerland · La Tour-de-Peilz</strong></div>
    <div class="route__country route__country--b"><span>DE</span><strong>Germany · ISM campus</strong></div>
  </div></div></section>`,

  cta: (b = {}) => `<section class="cta"><div class="shell cta__inner">
    <div class="reveal"><p class="eyebrow">${esc(b.eyebrow || 'Admissions')}</p><h2>${b.title || 'Start your application to <em>HBS.</em>'}</h2></div>
    <div class="cta__actions reveal">
      <a class="btn btn--apply btn--block" href="${SITE.applyUrl}" target="_blank" rel="noopener"><span>Apply now</span><span class="btn__arrow" aria-hidden="true">↗</span></a>
      <a class="btn btn--outline-light btn--block" href="${SITE.requestUrl}" target="_blank" rel="noopener"><span>Request program overview</span></a>
      <a class="btn btn--outline-light btn--block" href="${SITE.bookUrl}" target="_blank" rel="noopener"><span>Book a call</span></a>
    </div>
  </div></section>`,

  // Faculty are presented as biographies in one place — no separate profile pages.
  // `compact` renders a short roster (used on the homepage and insights) that links
  // to the single faculty page instead of repeating every biography.
  facultyCompact: (b) => section(b, `<div class="faculty-grid stagger">${b.items.map((f) => {
    const initials = f.name.replace(/^(Dr\.?|Prof\.?|Mrs\.?|Mr\.?)\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
    const media = f.image
      ? `<div class="faculty-card__media">${img(b.prefix, `assets/images/faculty/${f.image}`, `${f.name}, ${f.role} at Helvetic Business School`)}<span>${esc(f.role)}</span></div>`
      : `<div class="faculty-card__media faculty-card__media--initials" aria-hidden="true">${esc(initials)}</div>`;
    return `<article class="faculty-card reveal">${media}<h3><a href="${b.prefix}about/faculty/#${f.slug}">${esc(f.name)}</a></h3><p>${esc(f.expertise)}</p></article>`;
  }).join('')}</div>`),

  faculty: (b) => section(b, `<div class="faculty-list">${b.items.map((f) => {
    const initials = f.name.replace(/^(Dr\.?|Prof\.?|Mrs\.?|Mr\.?)\s+/i, '').split(' ').map((w) => w[0]).slice(0, 2).join('');
    const portrait = f.image
      ? `<div class="faculty-entry__media">${img(b.prefix, `assets/images/faculty/${f.image}`, `${f.name}, ${f.role} at Helvetic Business School`)}</div>`
      : `<div class="faculty-entry__media faculty-entry__media--initials" aria-hidden="true">${esc(initials)}</div>`;
    return `<article class="faculty-entry reveal" id="${f.slug}">
      ${portrait}
      <div class="faculty-entry__body">
        <p class="faculty-entry__role">${esc(f.role)}</p>
        <h3>${esc(f.name)}</h3>
        <p class="faculty-entry__expertise">${esc(f.expertise)}</p>
        <div class="faculty-entry__bio">${f.bio.map((p) => `<p>${esc(p)}</p>`).join('')}</div>
      </div>
    </article>`;
  }).join('')}</div>`),

  contact: () => `<section class="section section--dark"><div class="shell">
    <div class="section__head reveal"><div><p class="eyebrow eyebrow--teal">Contact</p><h2>Talk to <em>HBS.</em></h2></div><p class="lead">Our admissions team guides applicants through the application, interview, offer, enrollment and visa steps.</p></div>
    <div class="contact-grid reveal">
      <a href="mailto:${SITE.email}"><span>Email</span><strong>${SITE.email}</strong><em aria-hidden="true">↗</em></a>
      <a href="tel:${SITE.phoneHref}"><span>Phone</span><strong>${SITE.phoneDisplay}</strong><em aria-hidden="true">↗</em></a>
      <a href="${MAP_LINK}" target="_blank" rel="noopener"><span>Campus</span><strong>${esc(SITE.address.street)}, ${esc(SITE.address.city)}</strong><em aria-hidden="true">↗</em></a>
    </div>
    <div class="section__action reveal">
      <a class="btn btn--apply" href="${SITE.applyUrl}" target="_blank" rel="noopener"><span>Apply now</span><span class="btn__arrow" aria-hidden="true">↗</span></a>
      <a class="btn btn--outline-light" href="${SITE.bookUrl}" target="_blank" rel="noopener"><span>Book a call</span></a>
      <a class="btn btn--outline-light" href="${SITE.requestUrl}" target="_blank" rel="noopener"><span>Request information</span></a>
    </div>
  </div></section>`,

  map: (b) => `<section class="section ${b.tone || 'section--mist'}"><div class="shell">
    ${b.eyebrow || b.title ? `<div class="section__head reveal"><div>${b.eyebrow ? `<p class="eyebrow eyebrow--green">${esc(b.eyebrow)}</p>` : ''}<h2>${b.title}</h2></div><p class="lead">${esc(b.lead || '')}</p></div>` : ''}
    <div class="map reveal">
      <iframe title="Map showing ${esc(SITE.name)} at ${esc(SITE.address.street)}, ${esc(SITE.address.city)}" src="${MAP_EMBED}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
      <div class="map__card">
        <p class="eyebrow eyebrow--green">Campus</p>
        <h3>${esc(SITE.address.street)}</h3>
        <address>${esc(SITE.address.street)}<br>${esc(SITE.address.city)}<br>${esc(SITE.address.country)}</address>
        <a class="arrow-link" href="${MAP_LINK}" target="_blank" rel="noopener">Open in maps <i aria-hidden="true">↗</i></a>
      </div>
    </div>
  </div></section>`,
};

export function renderBlocks(list, ctx) {
  return list.map((b) => {
    const renderer = blocks[b.type];
    if (!renderer) throw new Error(`Unknown block type: ${b.type}`);
    return renderer({ ...b, prefix: ctx.prefix });
  }).join('');
}

// Slim breadcrumb trail that sits in its own bar under the hero, so it never
// competes with the headline.
export function renderTrail(page, prefix) {
  const items = [`<a href="${prefix}index.html">Home</a>`].concat((page.breadcrumb || []).map(([label, route]) => route
    ? `<a href="${href(prefix, route)}">${esc(label)}</a>`
    : `<span aria-current="page">${esc(label)}</span>`));
  return `<nav class="trail" aria-label="Breadcrumb"><div class="shell trail__inner">${items.join('<span class="trail__sep" aria-hidden="true">/</span>')}</div></nav>`;
}

export function renderHero(page, prefix) {
  const image = img(prefix, page.heroImage, '', { eager: true });
  const meta = (page.meta || []).map((m) => Array.isArray(m)
    ? `<a href="${esc(m[1])}"${/^https?:/.test(m[1]) ? ' target="_blank" rel="noopener"' : ''}>${esc(m[0])}</a>`
    : `<span>${esc(m)}</span>`).join('');
  return `<section class="page-hero" aria-labelledby="page-title">
    <div class="page-hero__media" data-parallax aria-hidden="true">${image}</div>
    <div class="page-hero__ring" aria-hidden="true"></div>
    <div class="page-hero__content">
      <h1 id="page-title" class="reveal reveal--d1">${page.title}</h1>
      <p class="page-hero__intro reveal reveal--d2">${esc(page.intro)}</p>
      <div class="page-hero__actions reveal reveal--d3">
        <a class="btn btn--apply" href="${SITE.applyUrl}" target="_blank" rel="noopener"><span>Apply now</span><span class="btn__arrow" aria-hidden="true">↗</span></a>
        <a class="btn btn--outline-light" href="${SITE.requestUrl}" target="_blank" rel="noopener"><span>Request program overview</span></a>
      </div>
      ${meta ? `<div class="page-hero__meta reveal reveal--d4">${meta}</div>` : ''}
    </div>
  </section>`;
}
