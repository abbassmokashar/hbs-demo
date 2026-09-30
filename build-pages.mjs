import { mkdir, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE, LOGO, HERO, gallery } from './data/site.mjs';
import { FACULTY } from './data/faculty.mjs';
import { HOME } from './data/home.mjs';
import { ABOUT_PAGES } from './data/about.mjs';
import { ADMISSION_PAGES } from './data/admissions.mjs';
import { OTHER_PAGES, NOT_FOUND } from './data/pages.mjs';
import { PROGRAMS_HUB, BBA_PAGE, MBA_PAGE } from './data/program-pages.mjs';
import { DUAL_HUB, DUAL_BBA, DUAL_MASTER_PAGES } from './data/dual.mjs';
import { CERT_HUB, CERT_PAGES } from './data/certificates.mjs';
import { TOOL_PAGES } from './data/tools.mjs';
import {
  esc, prefixFor, href, absolute, header, footer, searchOverlay,
  renderBlocks, renderHero, renderTrail, img, slugify,
} from './lib/render.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
// Where the built site is served from, for example '/hbs-demo/'. Only the 404
// page needs it: the host answers a missing URL with that file at whatever path
// was requested, so its relative links would otherwise resolve against the wrong
// directory.
const SITE_ROOT = new URL(SITE.url).pathname.replace(/\/?$/, '/');
// Change this whenever shared front-end assets change so static hosts and
// browsers cannot keep serving an older stylesheet or script after a deploy.
const ASSET_VERSION = '20260930c';
const stripTags = (value) => String(value).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------------ Pages */
const PAGES = [
  HOME,
  PROGRAMS_HUB,
  BBA_PAGE,
  MBA_PAGE,
  DUAL_HUB,
  DUAL_BBA,
  ...DUAL_MASTER_PAGES,
  CERT_HUB,
  ...CERT_PAGES,
  ...ADMISSION_PAGES,
  ...ABOUT_PAGES,
  ...OTHER_PAGES,
  ...TOOL_PAGES,
];

/* -------------------------------------------------------------------- SEO head */
const ORG_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'CollegeOrUniversity',
  name: SITE.name,
  alternateName: SITE.short,
  url: `${SITE.url}/`,
  email: SITE.email,
  telephone: SITE.phoneDisplay,
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.street,
    postalCode: '1814',
    addressLocality: 'La Tour-de-Peilz',
    addressCountry: 'CH',
  },
  logo: `${SITE.url}/assets/images/brand/hbs-ink.webp`,
  sameAs: ['https://hbs.swiss'],
};

function breadcrumbSchema(page) {
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` }];
  let position = 2;
  (page.breadcrumb || []).forEach(([label, route]) => {
    if (route) {
      items.push({ '@type': 'ListItem', position: position++, name: stripTags(label), item: absolute(route) });
    } else {
      items.push({ '@type': 'ListItem', position: position++, name: stripTags(label), item: absolute(page.route) });
    }
  });
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

function faqSchema(page) {
  const accordion = (page.blocks || []).find((b) => b.type === 'accordion');
  if (!accordion) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: accordion.items.map(([q, a]) => ({
      '@type': 'Question',
      name: stripTags(q),
      acceptedAnswer: { '@type': 'Answer', text: stripTags(Array.isArray(a) ? a.join(' ') : a) },
    })),
  };
}

function courseSchema(page) {
  if (!page.route.startsWith('programs/')) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: stripTags(page.title),
    description: page.seoDescription || page.intro,
    url: absolute(page.route),
    inLanguage: 'en',
    provider: { '@type': 'CollegeOrUniversity', name: SITE.name, sameAs: `${SITE.url}/` },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'full-time',
      location: { '@type': 'Place', name: 'La Tour-de-Peilz, Switzerland' },
    },
  };
}

function head(page, prefix) {
  const title = page.seoTitle || stripTags(page.title);
  const description = page.seoDescription || page.intro;
  const canonical = absolute(page.route);
  const schema = [ORG_SCHEMA, breadcrumbSchema(page), courseSchema(page), faqSchema(page)].filter(Boolean);
  const heroAbs = `${SITE.url}/${page.heroImage}`;
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="${page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}">
  <meta name="theme-color" content="#002c27">
  <meta name="author" content="${esc(SITE.name)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(SITE.name)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${heroAbs}">
  <meta property="og:locale" content="en_CH">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${heroAbs}">
  <link rel="icon" href="${prefix}${LOGO.favicon}?v=${ASSET_VERSION}" type="image/webp">
  <link rel="apple-touch-icon" href="${prefix}${LOGO.favicon}?v=${ASSET_VERSION}">
  <link rel="sitemap" type="application/xml" href="${prefix}sitemap.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&amp;family=Roboto:wght@400;500;600;700&amp;display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&amp;family=Roboto:wght@400;500;600;700&amp;display=swap"></noscript>
  <link rel="preload" as="image" href="${prefix}${page.heroImage}" fetchpriority="high">
  <link rel="stylesheet" href="${prefix}assets/styles.css?v=${ASSET_VERSION}">
  <link rel="stylesheet" href="${prefix}assets/pages.css?v=${ASSET_VERSION}">
  ${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ')}`;
}

function documentFor(page) {
  const prefix = page.output === '404.html' ? SITE_ROOT : prefixFor(page.route);
  const blocks = (page.blocks || []).map((b) => (b.type === 'homeHero'
    ? { ...b, title: page.title, heroImage: page.heroImage }
    : b));
  const isHome = page.kind === 'home';
  return `<!doctype html>
<html lang="en">
<head>
  ${head(page, prefix)}
</head>
<body class="is-loading${isHome ? '' : ' page-template'}">
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <div class="preloader" aria-hidden="true">
    <div class="preloader__logo"><img src="${prefix}${LOGO.hbsWhite}" alt=""></div>
    <div class="preloader__line"><span></span></div>
    <p class="preloader__tag">Helvetic Business School</p>
  </div>
  <div class="scroll-progress" aria-hidden="true"><span></span></div>
  <div class="noise" aria-hidden="true"></div>
  ${header(prefix)}
  <main id="main-content">
    ${isHome ? '' : renderHero(page, prefix)}
    ${!isHome && page.breadcrumb?.length ? renderTrail(page, prefix) : ''}
    ${renderBlocks(blocks, { prefix, page })}
  </main>
  ${footer(prefix)}
  ${searchOverlay(prefix)}
  <button class="to-top" type="button" aria-label="Back to top">↑</button>
  <script>window.HBS_BASE = ${JSON.stringify(prefix)}; window.HBS_ASSET_VERSION = ${JSON.stringify(ASSET_VERSION)};</script>
  <script defer src="${prefix}assets/main.js?v=${ASSET_VERSION}"></script>
</body>
</html>
`;
}

/* --------------------------------------------------------------- Search index */
function buildSearchIndex() {
  const entries = [];
  const seen = new Set();
  const add = (title, group, url, text) => {
    const key = `${url}::${title}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ title: stripTags(title), group, url, text: stripTags(text).slice(0, 220) });
  };

  PAGES.forEach((page) => {
    const pageUrl = page.route ? `${page.route}/` : '';
    add(stripTags(page.title), page.group, pageUrl, page.seoDescription || page.intro);
    (page.blocks || []).forEach((block) => {
      const anchor = block.id || block.anchor || slugify(block.title || block.eyebrow || '');
      const blockUrl = `${pageUrl}${anchor ? `#${anchor}` : ''}`;
      if (block.title || block.eyebrow) add(block.title || block.eyebrow, page.group, blockUrl, `${block.lead || ''} ${block.eyebrow || ''}`);
      if (block.type === 'facts') block.items.forEach(([label, value]) => add(`${label}: ${value}`, page.group, blockUrl, stripTags(page.intro)));
      if (block.type === 'cards') block.items.forEach(([kicker, title, text, route]) => {
        if (route && !route.startsWith('http')) add(title, page.group, `${route}/`, text || '');
      });
      if (block.type === 'tiles') block.items.forEach((item) => add(item.title, page.group, `${item.route}/`, item.text || ''));
      if (block.type === 'accordion') block.items.forEach(([q, a]) => add(q, page.group, `${pageUrl}#faq-${slugify(q)}`, Array.isArray(a) ? a.join(' ') : a));
      if (block.type === 'policyList') block.items.forEach(([name, scope, slug]) => add(name, page.group, `${pageUrl}#policy-${slug}`, scope));
      if (block.type === 'table' || block.type === 'intakes') block.rows.forEach((row) => add(row[0], page.group, blockUrl, row.join(' · ')));
    });
  });

  // Faculty biographies all live on one page, so every faculty entry points there.
  FACULTY.forEach((f) => add(f.name, 'Faculty', 'about/faculty/#'.concat(f.slug), `${f.role}. ${f.expertise} ${f.bio.join(' ')}`));
  return entries;
}

/* ------------------------------------------------------------------- Sitemap */
function sitemapXml() {
  const urls = PAGES
    .filter((p) => !p.noindex)
    .map((p) => `  <url>\n    <loc>${absolute(p.route)}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>${p.route === '' ? '1.0' : p.route.startsWith('programs') ? '0.9' : '0.7'}</priority>\n  </url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/* ---------------------------------------------------------------------- Write */
const outputOf = (page) => page.output || path.join(...page.route.split('/').filter(Boolean), 'index.html');
const cleanHtml = (html) => html.replace(/[ \t]+$/gm, '');
const generated = new Set();
let written = 0;

for (const page of PAGES) {
  const output = outputOf(page);
  const target = path.join(root, output);
  generated.add(path.resolve(target));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, cleanHtml(documentFor(page)), 'utf8');
  written += 1;
}

const notFoundTarget = path.join(root, '404.html');
generated.add(path.resolve(notFoundTarget));
await writeFile(notFoundTarget, cleanHtml(documentFor(NOT_FOUND)), 'utf8');
written += 1;

/* Keep the build idempotent: remove pages left behind by an earlier run so a
   route that has been renamed or retired cannot linger on disk. */
const staleFiles = [];
async function sweep(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'data' || entry.name === 'lib' || entry.name === 'assets') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await sweep(full);
    else if (entry.name === 'index.html' && !generated.has(path.resolve(full))) staleFiles.push(full);
  }
}
await sweep(root);
for (const file of staleFiles) {
  await rm(file);
  // Prune the directory if it is now empty.
  await rmdir(path.dirname(file)).catch(() => {});
}
if (staleFiles.length) console.log(`Removed ${staleFiles.length} stale page(s).`);

await writeFile(path.join(root, 'sitemap.xml'), sitemapXml(), 'utf8');
await writeFile(path.join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`, 'utf8');
const searchIndex = buildSearchIndex();
// Two forms of the same index: JSON for fetch-based loads, and a script global so
// search still works when the prototype is opened straight from the filesystem.
await writeFile(path.join(root, 'assets', 'search-index.json'), JSON.stringify(searchIndex), 'utf8');
await writeFile(
  path.join(root, 'assets', 'search-index.js'),
  `window.HBS_SEARCH_INDEX = ${JSON.stringify(searchIndex)};\n`,
  'utf8',
);

console.log(`Generated ${written} pages, sitemap.xml, robots.txt and a ${searchIndex.length}-entry search index.`);
