// Website content export.
//
// Reads the generated pages, walks the content of each <main> in document order
// and writes every heading, paragraph, list, definition list, table and FAQ
// answer into a structured Word document (OOXML), zipped with no dependencies.
//
// Usage: node prototype/export-content.mjs [--out planning/website-content.docx]

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const OUT = path.resolve(root, arg('out', '../planning/website-content.docx'));

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use', 'img', 'source', 'iframe', 'template', 'form', 'input', 'select', 'video', 'audio']);
const VOID_TAGS = new Set(['img', 'br', 'input', 'meta', 'link', 'hr', 'source', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use', 'area', 'col', 'embed', 'track', 'wbr']);
const BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'figure', 'table', 'dl', 'blockquote', 'section', 'article', 'header', 'footer', 'aside']);

const decode = (value) => String(value)
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&#x27;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&mdash;/g, '—')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

/* ------------------------------------------------------ A very small HTML parser */

function parseHtml(html) {
  const root = { tag: '#root', attrs: '', children: [] };
  const stack = [root];
  const token = /<!--[\s\S]*?-->|<[!?][^>]*>|<\/?([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)\/?>|[^<]+/g;
  let match;
  while ((match = token.exec(html))) {
    const text = match[0];
    const node = stack[stack.length - 1];
    if (text.startsWith('<!--') || text.startsWith('<!') || text.startsWith('<?')) continue;
    if (text[0] !== '<') {
      node.children.push({ text: decode(text) });
      continue;
    }
    const tag = (match[1] || '').toLowerCase();
    if (!tag) continue;
    if (text.startsWith('</')) {
      for (let i = stack.length - 1; i > 0; i -= 1) {
        if (stack[i].tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const element = { tag, attrs: match[2] || '', children: [] };
    node.children.push(element);
    if (!VOID_TAGS.has(tag) && !/\/>$/.test(text)) stack.push(element);
  }
  return root;
}

const attrOf = (node, name) => {
  const match = new RegExp(`\\b${name}="([^"]*)"`).exec(node.attrs || '');
  return match ? match[1] : '';
};
const hidden = (node) => attrOf(node, 'aria-hidden') === 'true';

function findDescendant(node, predicate) {
  for (const child of node.children || []) {
    if (child.text !== undefined) continue;
    if (predicate(child)) return child;
    const found = findDescendant(child, predicate);
    if (found) return found;
  }
  return null;
}

const textOf = (node) => {
  let out = '';
  for (const child of node.children || []) {
    if (child.text !== undefined) out += child.text;
    else if (!hidden(child) && !SKIP_TAGS.has(child.tag)) out += ` ${textOf(child)}`;
  }
  return out.replace(/\s+/g, ' ');
};

/* ------------------------------------------------------------- Inline runs */

// A run is { text, bold, italic } or { break: true }. Only the emphasis a reader
// needs is carried over; styling classes are irrelevant to the document.
function inlineRuns(node, style = {}) {
  const runs = [];
  for (const child of node.children || []) {
    if (child.text !== undefined) {
      if (child.text) runs.push({ ...style, text: child.text.replace(/\s+/g, ' ') });
      continue;
    }
    if (hidden(child) || SKIP_TAGS.has(child.tag)) continue;
    switch (child.tag) {
      case 'br': runs.push({ break: true }); break;
      case 'strong': case 'b': runs.push(...inlineRuns(child, { ...style, bold: true })); break;
      case 'em': case 'i': case 'cite': runs.push(...inlineRuns(child, { ...style, italic: true })); break;
      case 'hr': break;
      default: runs.push(...inlineRuns(child, style));
    }
  }
  // Trim the outer whitespace of the whole run sequence.
  const cleaned = runs.map((run) => ({ ...run }));
  const first = cleaned.find((r) => r.text !== undefined);
  const last = [...cleaned].reverse().find((r) => r.text !== undefined);
  if (first) first.text = first.text.replace(/^\s+/, '');
  if (last) last.text = last.text.replace(/\s+$/, '');
  return cleaned.filter((r) => r.break || r.text);
}

/* ------------------------------------------------------------ Block walk */

function blocksOf(node, list = { level: 0, kind: '' }) {
  const out = [];
  const emit = (block) => { if (block) out.push(block); };

  for (const child of node.children || []) {
    if (child.text !== undefined) continue;
    if (hidden(child) || SKIP_TAGS.has(child.tag)) continue;
    const tag = child.tag;

    if (/^h[1-4]$/.test(tag)) { emit({ type: 'heading', level: Number(tag[1]), runs: inlineRuns(child) }); continue; }
    if (tag === 'p') { emit({ type: 'text', runs: inlineRuns(child) }); continue; }
    if (tag === 'button') {
      // An accordion trigger carries content (the FAQ question); every other
      // button is interface chrome and is not part of the copy.
      if (!attrOf(child, 'aria-expanded')) continue;
      const label = findDescendant(child, (n) => /__title|-title|\.title/.test(attrOf(n, 'class')) || /title/.test(attrOf(n, 'class')));
      emit({ type: 'question', runs: inlineRuns(label || child) });
      continue;
    }
    if (tag === 'figure') {
      for (const inner of child.children || []) {
        if (inner.text !== undefined) continue;
        if (inner.tag === 'figcaption') emit({ type: 'caption', runs: inlineRuns(inner) });
        else out.push(...blocksOf({ children: [inner] }));
      }
      continue;
    }
    if (tag === 'figcaption') { emit({ type: 'caption', runs: inlineRuns(child) }); continue; }
    if (tag === 'blockquote') { emit({ type: 'quote', runs: inlineRuns(child) }); continue; }
    if (tag === 'ul' || tag === 'ol') {
      const next = { level: list.level + 1, kind: tag === 'ol' ? 'number' : 'bullet' };
      for (const li of child.children || []) {
        if (li.text !== undefined || li.tag !== 'li') continue;
        // A list item can carry a label, then its own blocks (the timeline steps
        // are <span>label</span><h3>title</h3><p>body</p>), so the nested blocks
        // become indented paragraphs rather than being flattened into the bullet.
        const nested = [];
        const blocks = [];
        const inline = { tag: 'li', children: [] };
        for (const item of li.children || []) {
          if (item.text !== undefined) { inline.children.push(item); continue; }
          if (item.tag === 'ul' || item.tag === 'ol') { nested.push(item); continue; }
          if (BLOCK_TAGS.has(item.tag)) { blocks.push(item); continue; }
          inline.children.push(item);
        }
        const runs = inlineRuns(inline);
        if (runs.length) emit({ type: 'item', level: next.level, kind: next.kind, runs });
        for (const block of blocks) {
          for (const inner of blocksOf({ children: [block] }, list)) out.push({ ...inner, indent: (inner.indent || 0) + 1 });
        }
        for (const child2 of nested) out.push(...blocksOf({ children: [child2] }, next));
      }
      continue;
    }
    if (tag === 'dl') {
      for (const item of child.children || []) {
        if (item.text !== undefined) continue;
        if (item.tag === 'dt') emit({ type: 'text', runs: inlineRuns(item, { bold: true }) });
        else if (item.tag === 'dd') emit({ type: 'text', runs: inlineRuns(item) });
        else out.push(...blocksOf({ children: [item] }, list));
      }
      continue;
    }
    if (tag === 'table') { emit({ type: 'table', ...tableOf(child) }); continue; }
    if (tag === 'a' || tag === 'span' || tag === 'div' || tag === 'section' || tag === 'article' || tag === 'header'
      || tag === 'footer' || tag === 'aside' || tag === 'main' || tag === 'nav' || tag === 'body' || tag === 'li') {
      // Containers pass through, and any copy that sits directly in them without
      // a block around it is kept as its own paragraph rather than dropped.
      const inner = blocksOf(child, list);
      if (inner.length) out.push(...inner);
      else {
        const runs = inlineRuns(child);
        if (runs.some((run) => run.text && run.text.trim().length > 2)) emit({ type: 'text', runs });
      }
      continue;
    }
    out.push(...blocksOf(child, list));
  }
  return out;
}

function tableOf(table) {
  const rows = [];
  let caption = '';
  for (const child of table.children || []) {
    if (child.text !== undefined) continue;
    if (child.tag === 'caption') { caption = textOf(child).trim(); continue; }
    if (child.tag === 'tr') rows.push(cellsOf(child, false));
    else if (child.tag === 'thead' || child.tag === 'tbody' || child.tag === 'tfoot') {
      for (const row of child.children || []) if (row.tag === 'tr') rows.push(cellsOf(row, child.tag === 'thead'));
    }
  }
  return { rows, caption };
}

function cellsOf(row, header) {
  const cells = [];
  for (const cell of row.children || []) {
    if (cell.text !== undefined) continue;
    if (cell.tag !== 'td' && cell.tag !== 'th') continue;
    const paragraphs = blocksOf(cell).map((block) => block.runs || []);
    cells.push({ header: header || cell.tag === 'th', paragraphs: paragraphs.length ? paragraphs : [[]] });
  }
  return cells;
}

/* --------------------------------------------------------------- OOXML */

const xml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const runXml = (run) => {
  if (run.break) return '<w:r><w:br/></w:r>';
  if (run.tab) return '<w:r><w:tab/></w:r>';
  const props = [
    run.bold ? '<w:b/>' : '',
    run.italic ? '<w:i/>' : '',
    run.color ? `<w:color w:val="${run.color}"/>` : '',
    run.size ? `<w:sz w:val="${run.size}"/><w:szCs w:val="${run.size}"/>` : '',
  ].filter(Boolean).join('');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(run.text)}</w:t></w:r>`;
};

// An internal link only needs an anchor, which names a bookmark in this document,
// so no relationship entry is required.
const hyperlinkXml = (anchor, runs) => `<w:hyperlink w:anchor="${xml(anchor)}" w:history="1">${runs.map(runXml).join('')}</w:hyperlink>`;

const paragraphXml = ({ style, runs = [], numbering, pageBreak, indent, content }) => {
  // Element order matters in pPr: pStyle, pageBreakBefore, numPr, spacing, ind.
  const props = [
    style ? `<w:pStyle w:val="${style}"/>` : '',
    pageBreak ? '<w:pageBreakBefore/>' : '',
    numbering ? `<w:numPr><w:ilvl w:val="${numbering.level - 1}"/><w:numId w:val="${numbering.kind === 'number' ? 2 : 1}"/></w:numPr>` : '',
    style === 'ListParagraph' ? '<w:spacing w:after="40"/>' : '',
    indent ? `<w:ind w:left="${indent * 420}"/>` : '',
  ].filter(Boolean).join('');
  const inner = content !== undefined ? content : runs.map(runXml).join('');
  return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${inner}</w:p>`;
};

const CX = 9070; // A4 width minus the margins, in twips
function tableXml(rows, caption) {
  const columns = Math.max(...rows.map((row) => row.cells ? row.cells.length : row.length), 1);
  const width = Math.floor(CX / columns);
  const grid = Array.from({ length: columns }, () => `<w:gridCol w:w="${width}"/>`).join('');
  const body = rows.map((row) => {
    const cells = row.cells || row;
    return `<w:tr>${cells.map((cell) => {
      const shaded = cell.header ? '<w:shd w:val="clear" w:fill="EDEFEC"/>' : '';
      const paragraphs = (cell.paragraphs || [[]]).map((runs) => paragraphXml({
        runs: cell.header ? runs.map((run) => ({ ...run, bold: true })) : runs,
      })).join('');
      return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${shaded}</w:tcPr>${paragraphs || '<w:p/>'}</w:tc>`;
    }).join('')}</w:tr>`;
  }).join('');
  const captionXml = caption ? paragraphXml({ style: 'Caption', runs: [{ text: caption }] }) : '';
  return `${captionXml}<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${CX}" w:type="dxa"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>${paragraphXml({ runs: [] })}`;
}

function blockXml(block) {
  const indent = block.indent;
  switch (block.type) {
    case 'heading': return paragraphXml({ style: `Heading${Math.min(block.level, 4)}`, runs: block.runs, indent });
    case 'text': return paragraphXml({ runs: block.runs, indent });
    case 'item': return paragraphXml({ style: 'ListParagraph', runs: block.runs, numbering: { level: block.level, kind: block.kind }, indent });
    case 'question': return paragraphXml({ style: 'Question', runs: block.runs, indent });
    case 'caption': return paragraphXml({ style: 'Caption', runs: block.runs, indent });
    case 'quote': return paragraphXml({ style: 'Quote', runs: block.runs, indent });
    case 'filler': return paragraphXml({ runs: [{ text: block.text }], indent });
    case 'table': return tableXml(block.rows, block.caption);
    default: return '';
  }
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="21"/><w:szCs w:val="21"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="52"/><w:color w:val="002C27"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="200"/></w:pPr><w:rPr><w:sz w:val="26"/><w:color w:val="439C9B"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="140"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="002C27"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="100"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="005E53"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="260" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="005E53"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading4"><w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="60"/><w:outlineLvl w:val="3"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="439C9B"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Question"><w:name w:val="Question"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="220" w:after="60"/></w:pPr><w:rPr><w:b/><w:color w:val="002C27"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="40"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/><w:pPr><w:tabs><w:tab w:val="right" w:leader="dot" w:pos="9070"/></w:tabs><w:spacing w:after="40"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:i/><w:sz w:val="18"/><w:color w:val="6B7A76"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="480"/></w:pPr><w:rPr><w:i/><w:color w:val="3C4A46"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:color="C9CFC9"/><w:left w:val="single" w:sz="4" w:color="C9CFC9"/>
      <w:bottom w:val="single" w:sz="4" w:color="C9CFC9"/><w:right w:val="single" w:sz="4" w:color="C9CFC9"/>
      <w:insideH w:val="single" w:sz="4" w:color="C9CFC9"/><w:insideV w:val="single" w:sz="4" w:color="C9CFC9"/>
    </w:tblBorders>
    <w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>
  </w:tblPr></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="420" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Symbol" w:hAnsi="Symbol" w:hint="default"/></w:rPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="840" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:hint="default"/></w:rPr></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="▪"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1260" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="420" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="840" w:hanging="360"/></w:pPr></w:lvl>
    <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1260" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

// Telling Word to update fields on open means the Contents page comes up with
// real page numbers; the cached entries below keep the list usable before that.
const SETTINGS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
  <w:updateFields w:val="true"/>
  <w:compat/>
</w:settings>`;

/* --------------------------------------------------------------- Collect */

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

const routeOf = (file) => {
  const rel = path.relative(root, file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  return `/${rel.replace(/index\.html$/, '')}`;
};

const words = (blocks) => {
  let count = 0;
  const add = (runs) => { for (const run of runs || []) if (run.text) count += run.text.split(/\s+/).filter(Boolean).length; };
  for (const block of blocks) {
    add(block.runs);
    if (block.rows) for (const row of block.rows) for (const cell of row) for (const para of cell.paragraphs) add(para);
    if (block.text) count += block.text.split(/\s+/).filter(Boolean).length;
  }
  return count;
};

const files = (await walk(root)).sort();
const pages = [];

for (const file of files) {
  const html = await readFile(file, 'utf8');
  const main = /<main id="main-content">([\s\S]*?)<\/main>/.exec(html);
  if (!main) continue;
  const blocks = blocksOf(parseHtml(main[1]));
  const titleIndex = blocks.findIndex((block) => block.type === 'heading' && block.level === 1);
  const title = titleIndex > -1 ? blocks[titleIndex].runs.map((r) => r.text).join('').trim() : routeOf(file);
  const body = blocks.filter((_, i) => i !== titleIndex);
  pages.push({ file, route: routeOf(file), rel: path.relative(root, file).split(path.sep).join('/'), title, body, words: words(body) });
}

/* ------------------------------------------------------------ Document */

const totalWords = pages.reduce((n, page) => n + page.words, 0);
const stamp = new Date().toISOString().slice(0, 10);

const indexRows = pages.map((page, i) => ([
  { paragraphs: [[{ text: String(i + 1) }]] },
  { paragraphs: [[{ text: page.title }]] },
  { paragraphs: [[{ text: page.route }]] },
  { paragraphs: [[{ text: String(page.words) }]] },
]));
indexRows.unshift([
  { header: true, paragraphs: [[{ text: '#' }]] },
  { header: true, paragraphs: [[{ text: 'Page' }]] },
  { header: true, paragraphs: [[{ text: 'Route' }]] },
  { header: true, paragraphs: [[{ text: 'Words' }]] },
]);

const tableCount = pages.reduce((n, page) => n + page.body.filter((block) => block.type === 'table').length, 0);

/* ------------------------------------------------------------ Contents */

// Every page gets a bookmark on its Heading 1 so the Contents entries have
// somewhere to point. The list below is cached field output: Word replaces it
// with its own generated TOC (page numbers included) as soon as it updates the
// field, and it stays clickable in readers that never update fields.
const bookmarks = pages.map((page, i) => ({ id: 1000 + i, name: `_Hbs_Toc_${i + 1}` }));

const tocEntryXml = (page, i) => {
  const open = i === 0
    ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
      + '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-1" \\h \\z </w:instrText></w:r>'
      + '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    : '';
  const close = i === pages.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : '';
  const runs = [
    { text: `${i + 1}. ${page.title}` },
    { tab: true },
    { text: page.route, color: '6B7A76', size: 18 },
  ];
  return paragraphXml({ style: 'TOC1', content: `${open}${hyperlinkXml(bookmarks[i].name, runs)}${close}` });
};

const contents = pages.map((page, i) => tocEntryXml(page, i)).join('');

const body = [
  paragraphXml({ style: 'Title', runs: [{ text: 'Helvetic Business School' }] }),
  paragraphXml({ style: 'Subtitle', runs: [{ text: 'Website content' }] }),
  paragraphXml({ runs: [{ text: `Every page of the static prototype, exported from the generated HTML in prototype/ on ${stamp}.` }] }),
  paragraphXml({ runs: [{ text: `${pages.length} pages · ${totalWords.toLocaleString('en-CH')} words · ${pages.reduce((n, p) => n + p.body.filter((b) => b.type === 'table').length, 0)} tables.` }] }),
  paragraphXml({ style: 'Heading1', runs: [{ text: 'Contents' }], pageBreak: true }),
  paragraphXml({ style: 'Caption', runs: [{ text: 'Click an entry to jump to that page. Word fills in the page numbers when it updates the field, on open or with Ctrl+A then F9.' }] }),
  contents,
  paragraphXml({ style: 'Heading2', runs: [{ text: 'About this document' }], pageBreak: true }),
  paragraphXml({ style: 'ListParagraph', runs: [{ text: 'Headings follow the site structure, so Word’s navigation pane mirrors the page outline (Heading 1 = page, then the page’s own levels).' }], numbering: { level: 1, kind: 'bullet' } }),
  paragraphXml({ style: 'ListParagraph', runs: [{ text: 'Body copy, lists, definition lists, data tables and figure captions inside each page’s <main> are included; emphasis is kept as bold and italic.' }], numbering: { level: 1, kind: 'bullet' } }),
  paragraphXml({ style: 'ListParagraph', runs: [{ text: 'FAQ accordions are exported as the question followed by its answer, so no answer depends on opening a panel.' }], numbering: { level: 1, kind: 'bullet' } }),
  paragraphXml({ style: 'ListParagraph', runs: [{ text: 'The Contents page links to every page; the Page index below lists the same pages with their routes and word counts.' }], numbering: { level: 1, kind: 'bullet' } }),
  paragraphXml({ style: 'ListParagraph', runs: [{ text: 'The shared header, mega menu, off-canvas drawer, search overlay and footer are omitted: they repeat on every page and are documented in planning/link-audit.pdf.' }], numbering: { level: 1, kind: 'bullet' } }),
  paragraphXml({ style: 'ListParagraph', runs: [{ text: 'Images are referenced by their captions and alt text only; no image files are embedded.' }], numbering: { level: 1, kind: 'bullet' } }),
  paragraphXml({ style: 'Heading2', runs: [{ text: 'Page index' }] }),
  tableXml(indexRows, ''),
  ...pages.flatMap((page, i) => [
    `<w:bookmarkStart w:id="${bookmarks[i].id}" w:name="${bookmarks[i].name}"/>`,
    paragraphXml({ style: 'Heading1', runs: [{ text: `${i + 1}. ${page.title}` }], pageBreak: true }),
    `<w:bookmarkEnd w:id="${bookmarks[i].id}"/>`,
    paragraphXml({ style: 'Caption', runs: [{ text: `${page.route} · exported from ${page.rel} · ${page.words} words` }] }),
    ...page.body.map(blockXml),
  ]),
];

const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body>
</w:document>`;

const CORE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Helvetic Business School — website content</dc:title>
  <dc:subject>Static prototype content export</dc:subject>
  <dc:creator>prototype/export-content.mjs</dc:creator>
  <cp:lastModifiedBy>prototype/export-content.mjs</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created>
</cp:coreProperties>`;

const APP = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>prototype/export-content.mjs</Application>
  <Pages>${pages.length + 2}</Pages>
</Properties>`;

const TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
</Relationships>`;

/* --------------------------------------------------------------- ZIP */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

function zip(files) {
  const parts = [];
  const entries = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = Buffer.from(file.data, 'utf8');
    const crc = crc32(data);
    const deflated = deflateRawSync(data, { level: 9 });
    const useDeflate = deflated.length < data.length;
    const payload = useDeflate ? deflated : data;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(33, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    parts.push(local, name, payload);
    entries.push({ name, crc, method, compressed: payload.length, size: data.length, offset });
    offset += local.length + name.length + payload.length;
  }

  const centralStart = offset;
  for (const entry of entries) {
    const head = Buffer.alloc(46);
    head.writeUInt32LE(0x02014b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(20, 6);
    head.writeUInt16LE(0, 8);
    head.writeUInt16LE(entry.method, 10);
    head.writeUInt16LE(0, 12);
    head.writeUInt16LE(33, 14);
    head.writeUInt32LE(entry.crc, 16);
    head.writeUInt32LE(entry.compressed, 20);
    head.writeUInt32LE(entry.size, 24);
    head.writeUInt16LE(entry.name.length, 28);
    head.writeUInt16LE(0, 30);
    head.writeUInt16LE(0, 32);
    head.writeUInt16LE(0, 34);
    head.writeUInt16LE(0, 36);
    head.writeUInt32LE(0, 38);
    head.writeUInt32LE(entry.offset, 42);
    parts.push(head, entry.name);
    offset += head.length + entry.name.length;
  }

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(offset - centralStart, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20);
  parts.push(end);

  return Buffer.concat(parts);
}

const archive = zip([
  { name: '[Content_Types].xml', data: TYPES },
  { name: '_rels/.rels', data: RELS },
  { name: 'docProps/core.xml', data: CORE },
  { name: 'docProps/app.xml', data: APP },
  { name: 'word/_rels/document.xml.rels', data: DOC_RELS },
  { name: 'word/document.xml', data: document },
  { name: 'word/styles.xml', data: STYLES },
  { name: 'word/settings.xml', data: SETTINGS },
  { name: 'word/numbering.xml', data: NUMBERING },
]);

await writeFile(OUT, archive);

const relative = path.relative(process.cwd(), OUT).split(path.sep).join('/');
console.log(`Wrote ${relative} (${(archive.length / 1024).toFixed(0)} KB)`);
console.log(`${pages.length} pages · ${totalWords.toLocaleString('en-CH')} words · ${tableCount} tables`);
