// Link and button inventory.
//
// Walks every generated page, records the page itself plus every link, button,
// form field and group label on it, works out where each element lives from the
// heading (or nav/footer group label) directly above it, and renders the whole
// lot to a print-ready PDF with headless Chrome.
//
// Usage: node prototype/link-inventory.mjs [--out planning/link-audit.pdf]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { SITE } from './data/site.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const OUT = path.resolve(root, arg('out', '../planning/link-audit.pdf'));
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// The 404 page links root-relative to the deployed site, for example
// '/hbs-demo/programs/'. Strip that prefix before resolving anything.
const siteRoot = new URL(SITE.url).pathname.replace(/\/?$/, '/');
const deployBase = 'https://prototype.invalid';

const decode = (value) => String(value)
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const text = (fragment) => decode(String(fragment).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const clip = (value, max = 52) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value);
const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (value) => esc(String(value ?? '').replace(/\s+/g, ' ').trim());
const code = (value) => (value ? `<code>${esc(value)}</code>` : '');
const muted = '<span class="muted">(icon only)</span>';
const attr = (attributes, name) => {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(attributes || '');
  return match ? decode(match[1]) : '';
};
// Cells are built with cell()/code() already escaped; anything else must be too.
const table = (headers, rows) => `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
  rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const more = (hidden) => (hidden > 0 ? ` <span class="muted">(+${hidden} more)</span>` : '');

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('__') || entry.name === 'data' || entry.name === 'lib') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else if (entry.name.endsWith('.html')) found.push(full);
  }
  return found;
}

function routeOf(file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  return `/${rel.replace(/index\.html$/, '')}`;
}

/* ------------------------------------------------------------------ Regions */

const between = (html, from, to) => {
  const start = html.indexOf(from);
  if (start < 0) return '';
  let end = to ? html.indexOf(to, start + from.length) : -1;
  if (end < 0) end = undefined;
  return html.slice(start, end);
};

// The document template always emits these blocks in this order, so slicing on
// their markers is enough to separate shared chrome from page content.
function regions(html) {
  const body = between(html, '<body', '</body>');
  const drawerAt = body.indexOf('<aside class="drawer"');
  const mainAt = body.indexOf('<main id="main-content">');
  return {
    utility: between(body, '<a class="skip-link"', '<div class="preloader"'),
    header: body.slice(body.indexOf('<header'), drawerAt > -1 ? drawerAt : mainAt),
    drawer: drawerAt > -1 ? between(body, '<aside class="drawer"', '</aside>') : '',
    main: between(body, '<main id="main-content">', '</main>'),
    footer: between(body, '<footer class="site-footer">', '<div class="search-overlay"'),
    overlay: between(body, '<div class="search-overlay"', '<button class="to-top"'),
    toTop: between(body, '<button class="to-top"', '<script'),
  };
}

/* ------------------------------------------------------------------- Scrape */

// Generated labels carry decoration — a numbering index, the accordion toggle
// glyph, the ↗/⌕ icons — which is stripped so a label reads the same way in
// every table.
const cleanLabel = (value) => {
  const raw = text(value);
  return raw.replace(/^\d+\s+/, '').replace(/\s*(?:[+−▶▾▴→←↑↓✕×⌕↗↘↖↙»]+)\s*$/u, '').trim() || raw;
};

// Headings and group labels both act as the "location" of the elements beneath
// them. A reset mark closes a container so the last mega-menu column cannot leak
// into the header actions, or the last footer column into the legal bar.
function landmarks(chunk, { startAt = 1, labels = [], resets = [] } = {}) {
  const found = [];
  for (const match of chunk.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const level = Number(match[1]);
    if (level >= startAt) found.push({ at: match.index, level, name: cleanLabel(match[2]) });
  }
  for (const label of labels) {
    for (const match of chunk.matchAll(label.re)) {
      const name = cleanLabel(match[label.group ?? 1]);
      if (name) found.push({ at: match.index, level: label.level, name });
    }
  }
  for (const reset of resets) {
    for (const match of chunk.matchAll(reset.re)) found.push({ at: match.index, resetTo: reset.name });
  }
  return found.sort((a, b) => a.at - b.at);
}

function scrape(chunk, marks, region) {
  const elements = [];
  const push = (at, element) => elements.push({ at, ...element });

  // Icon-only controls have no readable text, so their aria-label is the name.
  const nameFor = (attributes, visible) => {
    const label = attr(attributes, 'aria-label');
    const useLabel = Boolean(label) && (!visible || visible.length <= 2);
    return { name: useLabel ? label : visible || label, nameIsLabel: useLabel || !visible };
  };

  for (const match of chunk.matchAll(/<a\s([^>]*)>([\s\S]*?)<\/a>/g)) {
    const attributes = match[1];
    push(match.index, {
      kind: 'Link', href: attr(attributes, 'href'), attributes,
      ...nameFor(attributes, text(match[2])),
    });
  }
  for (const match of chunk.matchAll(/<button\s([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attributes = match[1];
    push(match.index, {
      kind: 'Button', href: '', attributes,
      ...nameFor(attributes, text(match[2])),
    });
  }
  for (const match of chunk.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)) {
    push(match.index, { kind: 'Disclosure', name: text(match[1]), href: '', attributes: '' });
  }
  for (const match of chunk.matchAll(/<(input|select|textarea)\s([^>]*?)\/?>/g)) {
    const tag = match[1];
    const attributes = match[2] || '';
    const name = attr(attributes, 'aria-label') || attr(attributes, 'placeholder') || attr(attributes, 'name') || tag;
    push(match.index, { kind: 'Field', name, field: tag, href: '', nameIsLabel: true, attributes });
  }
  for (const match of chunk.matchAll(/<form\s([^>]*)>/g)) {
    push(match.index, { kind: 'Form', name: attr(match[1], 'role') ? 'Search form' : 'Form', href: '', nameIsLabel: true, attributes: match[1] });
  }

  elements.sort((a, b) => a.at - b.at);

  // Walk the chunk in order, tracking the heading trail above each element.
  const trail = [];
  const output = [];
  let cursor = 0;
  for (const element of elements) {
    while (cursor < marks.length && marks[cursor].at < element.at) {
      const mark = marks[cursor];
      if (mark.resetTo !== undefined) {
        trail.length = 0;
        if (mark.resetTo) trail.push({ level: 1, name: mark.resetTo });
      } else {
        for (let i = trail.length - 1; i >= 0; i -= 1) if (trail[i].level >= mark.level) trail.splice(i, 1);
        trail.push({ level: mark.level, name: mark.name });
      }
      cursor += 1;
    }
    const where = trail.length ? `${region} › ${trail.map((t) => clip(t.name)).join(' › ')}` : region;
    output.push({ ...element, location: where });
  }
  return output;
}

/* ------------------------------------------------------------- Destinations */

function destination(pageRoute, href, pages) {
  const raw = String(href || '').trim();
  if (!raw) return { target: '', type: 'no target', notes: '' };
  if (raw.startsWith('#')) return { target: raw, type: 'anchor on this page', notes: '' };
  if (/^mailto:/i.test(raw)) return { target: raw.replace(/^mailto:/i, ''), type: 'email', notes: '' };
  if (/^tel:/i.test(raw)) return { target: raw.replace(/^tel:/i, ''), type: 'phone', notes: '' };
  if (/^https?:/i.test(raw)) {
    const url = new URL(raw);
    const form = /hsforms/.test(url.hostname);
    return { target: raw, type: form ? 'external form' : 'external site', notes: form ? 'HBS application form' : '' };
  }

  const rooted = raw.startsWith(siteRoot) ? `/${raw.slice(siteRoot.length)}` : raw;
  const resolved = new URL(rooted, `${deployBase}${pageRoute}`).pathname;
  const cleaned = resolved.replace(/index\.html$/, '') || '/';

  if (/\.(css|js|json|xml|txt|webp|jpg|jpeg|png|svg|pdf|ico)$/i.test(cleaned)) return { target: cleaned, type: 'file', notes: '' };
  if (/\.html$/.test(cleaned)) return { target: cleaned, type: 'page (.html link)', notes: '' };

  // Extensionless paths are directory routes, which the host serves with a
  // trailing slash, so '/programs' and '/programs/' are the same page.
  const route = cleaned.endsWith('/') ? cleaned : `${cleaned}/`;
  const known = pages.find((p) => p.route === route);
  return { target: route, type: known ? 'page' : 'page (not in this build)', notes: known && route !== '/' ? clip(known.h1, 40) : '' };
}

// Generated labels carry decoration — a numbering index, the accordion toggle
// glyph, the ↗/⌕ icons — which is stripped so one element reads the same way in
// every table. An element named only by a glyph falls back to aria-label above.
function displayName(element) {
  const original = element.name || '';
  const cleaned = original
    .replace(/^\d+\s+/, '')
    .replace(/\s*(?:[+−▶▾▴→←↑↓✕×⌕↗↘↖↙»]+)\s*$/u, '')
    .trim();
  return cleaned || original;
}

function buttonAction(element) {
  const a = element.attributes || '';
  if (/\bdata-search-open\b/.test(a)) return 'opens the search overlay';
  if (/\bdata-search-close\b/.test(a)) return 'closes the search overlay';
  const hint = attr(a, 'data-search-hint');
  if (hint) return `runs a search for “${hint}”`;
  if (/\bdata-menu-open\b/.test(a)) return 'opens the off-canvas drawer';
  if (/\bdata-menu-close\b/.test(a)) return 'closes the off-canvas drawer';
  if (/back to top/i.test(attr(a, 'aria-label'))) return 'scrolls the page back to the top';
  if (attr(a, 'aria-expanded')) return 'expands or collapses a section';
  if (attr(a, 'aria-controls')) return 'toggles a panel';
  if (attr(a, 'type') === 'submit') return 'submits the form';
  return 'no action in the markup';
}

function notesFor(element, { omitRaw = false } = {}) {
  const notes = [];
  const a = element.attributes || '';
  if (element.nameIsLabel) notes.push('named by aria-label');
  if (attr(a, 'target') === '_blank') notes.push('new tab');
  if (attr(a, 'aria-controls')) notes.push(`controls ${code(attr(a, 'aria-controls'))}`);
  if (attr(a, 'aria-expanded')) notes.push(`starts ${attr(a, 'aria-expanded') === 'true' ? 'expanded' : 'collapsed'}`);
  if (element.field) notes.push(`input type ${code(attr(a, 'type') || 'text')}`);
  // Shared chrome links are written relative to each page's depth, so the raw
  // href of one page would misrepresent the others.
  if (!omitRaw && element.href && element.target && element.href !== element.target) notes.push(`written as ${code(element.href)}`);
  return notes.join(', ');
}

/* ------------------------------------------------------------------ Collect */

const files = (await walk(root)).sort();
const pages = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const blocks = regions(html);
  const route = routeOf(file);
  const h1 = text((/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(blocks.main) || [, ''])[1]);
  const title = text((/<title>([\s\S]*?)<\/title>/.exec(html) || [, ''])[1]).replace(/\s*—\s*Helvetic Business School.*$/, '');

  const content = scrape(blocks.main, landmarks(blocks.main, { startAt: 2 }), 'Page content');

  const chrome = [
    { group: 'Utility bar', chunk: blocks.utility, region: 'Utility bar' },
    {
      group: 'Header', region: 'Header', chunk: blocks.header,
      labels: [
        { re: /<button class="nav__trigger"[^>]*>([\s\S]*?)<\/button>/g, level: 2 },
        { re: /<div class="mega__col">\s*<span>([^<]*)<\/span>/g, level: 3 },
      ],
      resets: [
        // Each nav item closes the previous mega panel, otherwise its columns
        // would label the next trigger.
        { re: /<li class="nav__item"/g, name: '' },
        { re: /<\/nav>/g, name: 'header actions' },
      ],
    },
    // The group toggles in the drawer label the panel of links below them.
    {
      group: 'Drawer', region: 'Off-canvas drawer', chunk: blocks.drawer,
      labels: [{ re: /<button[^>]*aria-expanded[^>]*>([\s\S]*?)<\/button>/g, level: 3 }],
      resets: [
        { re: /<div class="drawer__group">/g, name: '' },
        { re: /<a class="drawer__direct"/g, name: 'direct links' },
        { re: /<div class="drawer__foot">/g, name: 'drawer footer' },
      ],
    },
    { group: 'Search overlay', region: 'Search overlay', chunk: blocks.overlay },
    {
      group: 'Footer', region: 'Footer', chunk: blocks.footer,
      labels: [{ re: /<div class="footer__col">\s*<span>([^<]*)<\/span>/g, level: 3 }],
      resets: [{ re: /<div class="shell footer__bottom">/g, name: 'legal bar' }],
    },
    { group: 'Utility bar', region: 'Utility bar', chunk: blocks.toTop },
  ];

  for (const block of chrome) {
    const marks = landmarks(block.chunk, { startAt: 2, labels: block.labels || [], resets: block.resets || [] });
    for (const element of scrape(block.chunk, marks, block.region)) {
      element.group = block.group;
      element.page = route;
      content.push({ ...element, group: block.group, chrome: true });
    }
  }

  pages.push({
    file, route,
    rel: path.relative(root, file).split(path.sep).join('/'),
    title: title || h1,
    h1,
    content,
    own: content.filter((e) => !e.chrome),
  });
}

/* ------------------------------------------------------------------- Report */

// Everything outside <main> comes from the shared header/footer functions, so
// identical elements are documented once, keyed by where they point rather than
// by the raw href (which differs with each page's directory depth).
const shared = new Map();
for (const page of pages) {
  for (const element of page.content) {
    if (!element.chrome) continue;
    const resolved = element.kind === 'Link' ? destination(page.route, element.href, pages) : { target: '', type: '' };
    const key = [element.group, element.kind, element.name, element.location, resolved.target, buttonAction(element)].join('|');
    const entry = shared.get(key) || { ...element, target: resolved.target, type: resolved.type, count: 0 };
    entry.count += 1;
    shared.set(key, entry);
  }
}
const sharedList = [...shared.values()].sort((a, b) => a.group.localeCompare(b.group) || a.location.localeCompare(b.location) || a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));

// Two buttons with the same label and action are the same control, except in the
// chrome, where the header trigger and the drawer toggle are separate controls
// that happen to be labelled alike.
const allButtons = [
  ...sharedList.filter((e) => e.kind === 'Button').map((e) => ({ ...e, where: `${e.location} (every page)`, scope: e.location, instances: e.count })),
  ...pages.flatMap((page) => page.own.filter((e) => e.kind === 'Button').map((e) => ({ ...e, where: `${page.route} › ${e.location}`, scope: '', instances: 1 }))),
];
const buttonIndex = new Map();
for (const button of allButtons) {
  const action = buttonAction(button);
  const name = displayName(button);
  const key = `${name}|${action}|${button.scope}`;
  const entry = buttonIndex.get(key) || { name, action, count: 0, where: new Set() };
  entry.count += button.instances;
  entry.where.add(button.where);
  buttonIndex.set(key, entry);
}

const outbound = new Map();
for (const page of pages) {
  for (const element of page.content) {
    if (!element.href || !/^(https?|mailto|tel):/i.test(element.href)) continue;
    const entry = outbound.get(element.href) || { href: element.href, type: destination(page.route, element.href, pages).type, where: new Set() };
    entry.where.add(element.chrome ? `${element.location} (every page)` : `page content of ${page.route}`);
    outbound.set(element.href, entry);
  }
}

const stamp = new Date().toISOString().slice(0, 10);
const ownLinks = pages.reduce((n, p) => n + p.own.filter((e) => e.kind === 'Link').length, 0);
const ownButtons = pages.reduce((n, p) => n + p.own.filter((e) => e.kind === 'Button').length, 0);
const fields = pages.reduce((n, p) => n + p.own.filter((e) => e.kind === 'Field' || e.kind === 'Form').length, 0);

const STYLES = `
:root { --ink:#002c27; --green:#005e53; --teal:#439c9b; --paper:#f5f4ef; --line:#dcdad2; }
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { margin:0; font: 9pt/1.45 "Segoe UI", Roboto, system-ui, sans-serif; color:#16302b; }
h1 { font-size: 22pt; margin: 2px 0 4px; color: var(--ink); }
h2 { font-size: 14pt; margin: 22px 0 6px; color: var(--ink); border-bottom: 2px solid var(--green); padding-bottom: 3px; }
h3 { font-size: 10.5pt; margin: 14px 0 4px; color: var(--green); }
p { margin: 4px 0; }
code { font-family: Consolas, "Courier New", monospace; font-size: .9em; background: var(--paper); padding: 0 3px; }
.muted { color: #7d8a86; }
.kicker { text-transform: uppercase; letter-spacing: .12em; font-size: 7.5pt; color: var(--teal); margin: 0; }
.meta { color: #4c5b57; font-size: 8.5pt; }
.counts { background: var(--paper); border-left: 4px solid var(--teal); padding: 6px 9px; font-size: 8.5pt; }
.toc { margin: 8px 0 4px; font-size: 8.5pt; }
.toc a { margin-right: 14px; color: var(--green); text-decoration: none; }
.notes { margin: 6px 0 0; padding-left: 16px; font-size: 8.2pt; color: #3c4a46; }
.notes li { margin: 1px 0; }
table { width: 100%; border-collapse: collapse; margin: 4px 0 10px; font-size: 7.4pt; }
thead { display: table-header-group; }
th { background: var(--ink); color: #fff; text-align: left; padding: 3px 5px; }
td { border-bottom: .5pt solid var(--line); padding: 2.6px 5px; vertical-align: top; }
tr { break-inside: avoid; }
tbody tr:nth-child(even) { background: #fbfbf9; }
th:first-child, td:first-child { width: 2.5%; }
a { color: var(--green); }
.cover { border-bottom: 2px solid var(--green); padding-bottom: 10px; }
.sheet { break-before: page; }
`;

const pagesTable = table(['#', 'Page', 'Route', 'File', 'Main heading', 'Links', 'Buttons'], pages.map((page, i) => [
  String(i + 1),
  `<a href="#page-${i + 1}">${cell(page.title)}</a>`,
  code(page.route),
  code(page.rel),
  cell(clip(page.h1, 90)),
  String(page.own.filter((e) => e.kind === 'Link').length),
  String(page.own.filter((e) => e.kind === 'Button').length),
]));

const buttonsTable = table(['Button', 'What it does', 'Where', 'Count'], [...buttonIndex.values()]
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  .map((b) => {
    const where = [...b.where];
    return [
      cell(displayName(b)) || muted,
      cell(b.action),
      cell(clip(where.slice(0, 3).join('; '), 115)) + more(where.length - 3),
      String(b.count),
    ];
  }));

const chromeSections = ['Utility bar', 'Header', 'Drawer', 'Search overlay', 'Footer'].flatMap((group) => {
  const rows = sharedList.filter((e) => e.group === group);
  if (!rows.length) return [];
  const body = table(['Name', 'Element', 'Location', 'Link or action', 'Pages', 'Notes'], rows.map((e) => [
    cell(displayName(e)) || muted,
    cell(e.kind),
    cell(e.location),
    e.kind === 'Button' ? cell(buttonAction(e)) : e.kind === 'Link' ? code(e.target) : '<span class="muted">—</span>',
    `${e.count}/${pages.length}`,
    cell(notesFor(e, { omitRaw: true })) || '<span class="muted">—</span>',
  ]));
  return [`<h3>${esc(group === 'Utility bar' ? 'Utility bar and skip link' : group)}</h3>`, body];
});

const pageSections = pages.map((page, i) => {
  const body = page.own.length
    ? table(['#', 'Name', 'Element', 'Location', 'Target or action', 'Type', 'Notes'], page.own.map((e, n) => {
      const dest = e.kind === 'Link' ? destination(page.route, e.href, pages) : { target: '', type: '' };
      const isData = e.kind === 'Field' || e.kind === 'Form';
      return [
        String(n + 1),
        cell(displayName(e)) || muted,
        cell(e.kind),
        cell(e.location),
        e.kind === 'Button' ? cell(buttonAction(e)) : isData ? '<span class="muted">—</span>' : code(dest.target),
        e.kind === 'Button' ? 'action' : isData ? e.kind.toLowerCase() : cell(dest.type),
        cell(notesFor({ ...e, target: dest.target })) || '<span class="muted">—</span>',
      ];
    }))
    : '<p class="muted">No links or buttons of its own: everything interactive on this page comes from the shared chrome.</p>';
  return `<section class="sheet" id="page-${i + 1}">
  <h3>Page ${i + 1}: ${cell(page.title)}</h3>
  <p class="meta">${code(page.route)} · file ${code(page.rel)} · main heading “${cell(page.h1)}”</p>
  ${body}
</section>`;
}).join('\n');

const outboundTable = table(['Target', 'Type', 'Where'], [...outbound.values()]
  .sort((a, b) => a.href.localeCompare(b.href))
  .map((o) => {
    const where = [...o.where];
    return [code(o.href), cell(o.type), cell(clip(where.slice(0, 4).join('; '), 130)) + more(where.length - 4)];
  }));

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Prototype link and button audit — Helvetic Business School</title>
  <style>${STYLES}</style>
</head>
<body>
  <header class="cover">
    <p class="kicker">Helvetic Business School · static prototype</p>
    <h1>Link and button audit</h1>
    <p class="meta">Every page, link, button and form field in the prototype. Generated from the HTML in <code>prototype/</code> by <code>node prototype/link-inventory.mjs</code> on ${stamp} — do not edit by hand.</p>
    <p class="counts">${pages.length} pages · ${ownLinks} links and ${ownButtons} buttons in page content · ${fields} form fields · ${sharedList.length} shared chrome elements · ${outbound.size} outbound targets</p>
    <nav class="toc"><strong>Contents</strong><a href="#pages">Pages</a><a href="#buttons">Buttons by function</a><a href="#chrome">Shared chrome</a><a href="#detail">Page by page</a><a href="#outbound">Outbound links</a></nav>
    <ul class="notes">
      <li><strong>Pages</strong> — every built page with its route, file, main heading and element counts.</li>
      <li><strong>Buttons by function</strong> — every button on the site, grouped by what it does.</li>
      <li><strong>Shared chrome</strong> — the header, drawer, search overlay and footer come from one set of functions and are identical on every page, so each element is listed once; the “Pages” column says how many of the ${pages.length} pages it appears on.</li>
      <li><strong>Page by page</strong> — the elements inside each page’s <code>&lt;main&gt;</code>, in document order, one sheet each.</li>
      <li><strong>Location</strong> is the region plus the heading, nav group or footer column directly above the element. Chrome links are written relative to each page’s depth, so the resolved route is shown rather than the raw <code>href</code>.</li>
    </ul>
  </header>

  <h2 id="pages">Pages</h2>
  ${pagesTable}

  <h2 id="buttons">Buttons by function</h2>
  <p class="meta">All ${allButtons.length} buttons on the site, grouped by what they do.</p>
  ${buttonsTable}

  <h2 id="chrome">Shared chrome</h2>
  <p class="meta">Rendered by the shared <code>header()</code>, <code>footer()</code> and <code>searchOverlay()</code> functions, so these elements appear on every page unless the count says otherwise.</p>
  ${chromeSections.join('\n')}

  <h2 id="detail">Page by page</h2>
  <p class="meta">One section per page, each starting on a new sheet.</p>
  ${pageSections}

  <h2 id="outbound">Outbound links</h2>
  <p class="meta">Every link that leaves the prototype: external sites, external forms, email and phone.</p>
  ${outboundTable}
</body>
</html>
`;

/* Render the report to PDF with the same headless Chrome the visual audit uses. */
const workdir = mkdtempSync(path.join(tmpdir(), 'hbs-link-audit-'));
const htmlPath = path.join(workdir, 'link-audit.html');
try {
  await writeFile(htmlPath, html, 'utf8');
  if (!existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}. Point CHROME_PATH at Chrome or Edge.`);
    process.exit(1);
  }
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer',
    `--print-to-pdf=${OUT}`, '--virtual-time-budget=10000', pathToFileURL(htmlPath).href,
  ], { stdio: ['ignore', 'ignore', 'inherit'] });
} finally {
  rmSync(workdir, { recursive: true, force: true });
}

if (!existsSync(OUT)) {
  console.error('Chrome did not produce a PDF.');
  process.exit(1);
}
console.log(`Wrote ${path.relative(process.cwd(), OUT).split(path.sep).join('/')} (${(statSync(OUT).size / 1024).toFixed(0)} KB)`);
console.log(`${pages.length} pages · ${ownLinks} content links · ${ownButtons} content buttons · ${sharedList.length} shared chrome elements · ${outbound.size} outbound targets`);

