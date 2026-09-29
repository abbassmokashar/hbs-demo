// Static audit for the HBS prototype.
// Verifies internal links resolve, referenced assets exist, no retired imagery
// is used, and no superseded Vevey copy has leaked back into the pages.

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SITE } from './data/site.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

// The 404 page is served at whatever path the visitor asked for, so its links
// are rooted at the deployed site ('/hbs-demo/assets/…'). Map those back onto
// this folder before resolving them on disk.
const siteRoot = new URL(SITE.url).pathname.replace(/\/?$/, '/');
const withoutQuery = (ref) => ref.split('?')[0];
const onDisk = (dir, ref) => {
  const cleanRef = withoutQuery(ref);
  return cleanRef.startsWith(siteRoot) ? path.join(root, cleanRef.slice(siteRoot.length)) : path.resolve(dir, cleanRef);
};

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'data' || entry.name === 'lib') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else found.push(full);
  }
  return found;
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };
const isFile = async (p) => { try { return (await stat(p)).isFile(); } catch { return false; } };

const problems = [];
const retired = /assets\/images\/(approved|official|source)\//;
let assetRefs = 0;
let linkRefs = 0;

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const dir = path.dirname(file);
  const rel = path.relative(root, file).split(path.sep).join('/');

  // Assets
  for (const src of [...html.matchAll(/(?:src|href)="([^"#]+?\.(?:svg|jpg|jpeg|png|webp|css|js|xml|json|txt)(?:\?[^"#]*)?)"/g)].map((m) => m[1])) {
    if (/^https?:|^mailto:|^tel:|^data:/.test(src)) continue;
    assetRefs += 1;
    if (retired.test(src)) problems.push(`${rel}: retired asset referenced → ${src}`);
    if (!await exists(onDisk(dir, src))) problems.push(`${rel}: missing asset → ${src}`);
  }

  // Internal page links (fragments are resolved and then verified)
  for (const raw of [...html.matchAll(/href="([^"#:+][^"]*)"/g)].map((m) => m[1])) {
    if (/\.(svg|jpg|jpeg|png|webp|css|js|xml|json|txt)(?:\?[^#]*)?$/.test(raw)) continue;
    if (/^(mailto:|tel:|https?:|#)/.test(raw)) continue;
    linkRefs += 1;
    const [target, fragment] = raw.split('#');
    const resolved = onDisk(dir, target || '');
    const candidates = [path.join(resolved, 'index.html'), `${resolved}.html`, resolved];
    let file = null;
    for (const c of candidates) if (await isFile(c)) { file = c; break; }
    if (!file) { problems.push(`${rel}: broken link → ${raw}`); continue; }
    if (fragment) {
      const targetHtml = await readFile(file, 'utf8');
      if (!targetHtml.includes(`id="${fragment}"`)) problems.push(`${rel}: broken anchor → ${raw} (no id="${fragment}")`);
    }
  }

  // Location hygiene
  const vevey = [...html.matchAll(/.{40}Vevey.{40}/g)].map((m) => m[0]);
  vevey.filter((ctx) => !/Nestl[eé] Vevey/i.test(ctx)).forEach((ctx) => {
    problems.push(`${rel}: unapproved "Vevey" reference → …${ctx}…`);
  });
  if (!html.includes('Chemin du Levant 5')) problems.push(`${rel}: footer address missing`);
  if (!html.includes('data-search')) problems.push(`${rel}: search overlay not wired up`);
}

const searchIndex = JSON.parse(await readFile(path.join(root, 'assets', 'search-index.json'), 'utf8'));

console.log(`Audited ${htmlFiles.length} pages · ${assetRefs} asset references · ${linkRefs} internal links`);
console.log(`Search index entries: ${searchIndex.length}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.slice(0, 40).forEach((p) => console.log(`  • ${p}`));
  process.exitCode = 1;
} else {
  console.log('\nNo problems found: every link and asset resolves, footer address present, no retired imagery.');
}
