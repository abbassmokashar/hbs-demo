// Browser-based layout audit.
//
// For every page and a set of viewport widths, this renders the page in headless
// Chrome with a small probe script injected, and reads back layout measurements.
// It reports horizontal overflow, elements escaping the viewport, images that
// failed or collapsed, truncated text and undersized tap targets.
//
// Usage: node prototype/visual-audit.mjs [--widths 1440,1024,390] [--filter programs]

import { execFileSync } from 'node:child_process';
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH
  || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const WIDTHS = arg('widths', '1440,1280,1024,768,390').split(',').map(Number);
const FILTER = arg('filter', '');

const PROBE = `<script>
(function () {
  var DECOR = /noise|orb|marquee|ticker|scrim|drawer|search-overlay|mega|skip-label|preloader|scroll-progress/;
  function selector(el) {
    var parts = [];
    var node = el;
    for (var i = 0; i < 4 && node && node.nodeType === 1 && node.tagName !== 'BODY'; i++) {
      var s = node.tagName.toLowerCase();
      if (node.id) s += '#' + node.id;
      else if (node.className && typeof node.className === 'string') {
        var c = node.className.trim().split(/\\s+/).slice(0, 2).join('.');
        if (c) s += '.' + c;
      }
      parts.unshift(s);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }
  // An element inside an ancestor that clips its overflow can never escape the
  // viewport visually, so transformed hero art is not a real overflow report.
  function clippedByAncestor(el) {
    var p = el.parentElement;
    while (p && p !== document.body) {
      var pcs = getComputedStyle(p);
      if (pcs.overflow === 'hidden' || pcs.overflow === 'clip' || pcs.overflowX === 'hidden' || pcs.overflowX === 'clip') return true;
      p = p.parentElement;
    }
    return false;
  }
  function measure() {
    var de = document.documentElement;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    // Neutralise the global horizontal clip so real overflow becomes measurable.
    var prevHtml = de.style.overflow;
    var prevBody = document.body.style.overflowX;
    de.style.overflow = 'visible';
    document.body.style.overflowX = 'visible';
    var docW = Math.max(de.scrollWidth, document.body.scrollWidth);
    var out = {
      w: vw,
      docW: docW,
      over: Math.max(0, docW - vw),
      escapees: [],
      brokenImg: [],
      flatImg: [],
      clipped: [],
      smallTap: []
    };
    var nodes = document.body.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      var cs = getComputedStyle(el);
      if (cs.position === 'fixed') continue;
      if (el.getAttribute('aria-hidden') === 'true') continue;
      if (DECOR.test(String(el.className || ''))) continue;
      if (el.closest && el.closest('.mega, .drawer, .search-overlay')) continue;
      if ((r.right > vw + 1.5 || r.left < -1.5) && !(el.closest && el.closest('[aria-hidden="true"]')) && !clippedByAncestor(el)) {
        out.escapees.push({
          s: selector(el),
          l: Math.round(r.left),
          r: Math.round(r.right),
          w: Math.round(r.width)
        });
      }
      // Measure real text overflow with a Range, so absolutely-positioned
      // decorations (button sweeps, footer rings) are not reported as clipping.
      if (cs.overflow === 'hidden' && r.height > 10) {
        var hasText = false;
        for (var n = 0; n < el.childNodes.length; n++) {
          if (el.childNodes[n].nodeType === 3 && el.childNodes[n].nodeValue.trim()) hasText = true;
        }
        if (hasText) {
          var range = document.createRange();
          range.selectNodeContents(el);
          var rr = range.getBoundingClientRect();
          if (rr.bottom > r.bottom + 3 || rr.top < r.top - 3 || rr.right > r.right + 3) {
            out.clipped.push({ s: selector(el), contentH: Math.round(rr.height), boxH: Math.round(r.height) });
          }
        }
      }
    }
    if (vw <= 480) {
      var taps = document.querySelectorAll('a, button, input, select');
      for (var t = 0; t < taps.length; t++) {
        var el2 = taps[t];
        var r2 = el2.getBoundingClientRect();
        if (r2.width === 0 || r2.height === 0) continue;
        if (el2.closest('.site-footer, .mega, .drawer')) continue;
        if (r2.height < 26) out.smallTap.push({ s: selector(el2), h: Math.round(r2.height) });
      }
    }
    var imgs = document.querySelectorAll('img');
    for (var k = 0; k < imgs.length; k++) {
      var im = imgs[k];
      var ir = im.getBoundingClientRect();
      if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) {
        out.brokenImg.push(im.getAttribute('src'));
      }
      if (ir.width > 20 && ir.height < 3) out.flatImg.push(im.getAttribute('src'));
    }
    de.style.overflow = prevHtml;
    document.body.style.overflowX = prevBody;
    out.escapees = out.escapees.slice(0, 6);
    out.clipped = out.clipped.slice(0, 4);
    out.smallTap = out.smallTap.slice(0, 6);
    document.title = encodeURIComponent(JSON.stringify(out));
  }
  function boot() {
    document.body.classList.remove('is-loading');
    var pl = document.querySelector('.preloader');
    if (pl) pl.classList.add('is-hidden');
    var rv = document.querySelectorAll('.reveal');
    for (var i = 0; i < rv.length; i++) rv[i].classList.add('is-visible');
    setTimeout(measure, 700);
  }
  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);
})();
</script>`;

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

// 404.html is rooted at the deployed site so that it survives being served from
// an arbitrary path, which file:// cannot reproduce. audit.mjs still checks its
// links and assets.
const pages = (await walk(root))
  .filter((f) => !/404\.html$/.test(f))
  .filter((f) => !FILTER || f.includes(FILTER));
const results = [];

for (const page of pages) {
  const html = await readFile(page, 'utf8');
  const probe = html.replace('</body>', `${PROBE}</body>`);
  // The probe must live beside the original page, otherwise every relative
  // asset path resolves against the wrong directory and nothing loads.
  const probePath = path.join(path.dirname(page), '__visual-probe.html');
  await writeFile(probePath, probe, 'utf8');
  const url = pathToFileURL(probePath).href;
  const rel = path.relative(root, page).split(path.sep).join('/');
  for (const width of WIDTHS) {
    let dom = '';
    try {
      dom = execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
        `--window-size=${width},900`, '--virtual-time-budget=4500', '--dump-dom', url,
      ], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      results.push({ rel, width, error: 'chrome failed' });
      continue;
    }
    const match = /<title>([^<]*)<\/title>/.exec(dom);
    if (!match) { results.push({ rel, width, error: 'no measurement' }); continue; }
    try {
      results.push({ rel, width, ...JSON.parse(decodeURIComponent(match[1])) });
    } catch {
      results.push({ rel, width, error: 'unreadable measurement' });
    }
  }
  await unlink(probePath).catch(() => {});
}

/* ------------------------------------------------------------------- Report */
const issues = [];
for (const r of results) {
  const tag = `${r.rel} @${r.width}px`;
  if (r.error) { issues.push(`${tag}: ${r.error}`); continue; }
  if (r.over > 2) issues.push(`${tag}: HORIZONTAL OVERFLOW of ${r.over}px (doc ${r.docW} vs viewport ${r.w}) → ${r.escapees.map((e) => `${e.s}[${e.w}px]`).join(', ')}`);
  else if (r.escapees.length) issues.push(`${tag}: ${r.escapees.length} element(s) past the viewport edge (clipped by body overflow) → ${r.escapees.map((e) => `${e.s} left:${e.l} right:${e.r}`).join(', ')}`);
  if (r.brokenImg.length) issues.push(`${tag}: broken image(s) → ${r.brokenImg.join(', ')}`);
  if (r.flatImg.length) issues.push(`${tag}: collapsed image(s) → ${r.flatImg.join(', ')}`);
  if (r.clipped.length) issues.push(`${tag}: truncated text → ${r.clipped.map((c) => `${c.s} (content ${c.contentH}px in ${c.boxH}px box)`).join(', ')}`);
  if (r.smallTap.length) issues.push(`${tag}: tap target under 26px → ${r.smallTap.map((t) => `${t.s}[${t.h}px]`).join(', ')}`);
}

console.log(`Rendered ${pages.length} pages × ${WIDTHS.length} widths = ${results.length} measurements`);
if (issues.length) {
  console.log(`\n${issues.length} issue(s):\n`);
  issues.forEach((i) => console.log(`  • ${i}`));
  process.exitCode = 1;
} else {
  console.log('\nNo layout issues found at any tested width.');
}
