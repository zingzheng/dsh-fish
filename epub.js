/**
 * Minimal, dependency-free EPUB reader for the host side.
 *
 * It intentionally supports the plain reading path only: ZIP (stored/deflate),
 * container.xml, OPF spine, NCX/EPUB3 navigation, and XHTML text. Images, CSS,
 * scripts, footnotes and DRM are not presented.
 */

import { inflateRawSync } from 'node:zlib';
import { isGutenbergText, splitChapters, stripGutenbergText } from './book.js';

const MAX_ENTRIES = 5000;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_CHAPTERS = 5000;

export class EpubError extends Error {
  constructor(message, code = 'epub-invalid') {
    super(message);
    this.name = 'EpubError';
    this.code = code;
  }
}

function u16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function u32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function asBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  throw new TypeError('expected a Buffer, Uint8Array or ArrayBuffer');
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePath(value) {
  const raw = String(value ?? '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = [];
  for (const piece of raw.split('/')) {
    if (piece === '' || piece === '.') continue;
    if (piece === '..') {
      if (parts.length === 0) throw new EpubError('EPUB 条目路径越界', 'epub-path');
      parts.pop();
      continue;
    }
    parts.push(piece);
  }
  return parts.join('/');
}

function dirOf(value) {
  const path = normalizePath(value);
  const index = path.lastIndexOf('/');
  return index < 0 ? '' : path.slice(0, index);
}

function resolveHref(baseDir, href) {
  const raw = String(href ?? '').trim();
  if (raw === '') return '';
  const withoutQuery = raw.split('#')[0].split('?')[0];
  if (withoutQuery === '') return '';
  const decoded = safeDecode(withoutQuery);
  if (decoded.startsWith('/')) return normalizePath(decoded);
  return normalizePath(`${baseDir}/${decoded}`);
}

function stripFragment(value) {
  return String(value ?? '').split('#')[0].split('?')[0];
}

/** Locate the End Of Central Directory record. */
function findEocd(buffer) {
  const minimum = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function readZipEntries(input) {
  const buffer = asBuffer(input);
  const eocd = findEocd(buffer);
  if (eocd < 0) throw new EpubError('不是有效的 EPUB（缺少 ZIP 目录）', 'epub-zip');
  const count = u16(buffer, eocd + 10);
  const centralOffset = u32(buffer, eocd + 16);
  if (count === 0xffff || centralOffset === 0xffffffff) {
    throw new EpubError('暂不支持 ZIP64 EPUB', 'epub-zip64');
  }
  if (count > MAX_ENTRIES) throw new EpubError('EPUB 条目过多', 'epub-too-many');

  const entries = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > buffer.length || u32(buffer, cursor) !== 0x02014b50) {
      throw new EpubError('EPUB 中央目录损坏', 'epub-zip');
    }
    const flags = u16(buffer, cursor + 8);
    const method = u16(buffer, cursor + 10);
    const compressedSize = u32(buffer, cursor + 20);
    const uncompressedSize = u32(buffer, cursor + 24);
    const nameLength = u16(buffer, cursor + 28);
    const extraLength = u16(buffer, cursor + 30);
    const commentLength = u16(buffer, cursor + 32);
    const localOffset = u32(buffer, cursor + 42);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) throw new EpubError('EPUB 文件名损坏', 'epub-zip');
    const rawName = buffer.subarray(nameStart, nameEnd);
    const name = normalizePath(rawName.toString('utf8'));
    if (name === '') continue;
    const entry = {
      name,
      method,
      compressedSize,
      uncompressedSize,
      localOffset,
    };
    entries.set(name, entry);
    const decodedName = normalizePath(safeDecode(name));
    if (decodedName !== name && !entries.has(decodedName)) entries.set(decodedName, entry);
    cursor = nameEnd + extraLength + commentLength;
  }
  return entries;
}

function findEntry(entries, path) {
  const wanted = normalizePath(path);
  if (entries.has(wanted)) return entries.get(wanted);
  const lower = wanted.toLowerCase();
  for (const entry of entries.values()) {
    if (entry.name.toLowerCase() === lower) return entry;
  }
  return undefined;
}

function readZipFile(entries, path, budget) {
  const entry = findEntry(entries, path);
  if (entry === undefined) throw new EpubError(`EPUB 缺少文件：${path}`, 'epub-missing');
  if (entry.uncompressedSize > MAX_ENTRY_BYTES) {
    throw new EpubError(`EPUB 单个条目过大：${entry.name}`, 'epub-too-large');
  }
  const buffer = budget.buffer;
  if (entry.localOffset + 30 > buffer.length || u32(buffer, entry.localOffset) !== 0x04034b50) {
    throw new EpubError(`EPUB 条目损坏：${entry.name}`, 'epub-zip');
  }
  const nameLength = u16(buffer, entry.localOffset + 26);
  const extraLength = u16(buffer, entry.localOffset + 28);
  const dataStart = entry.localOffset + 30 + nameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new EpubError(`EPUB 条目截断：${entry.name}`, 'epub-zip');
  const data = buffer.subarray(dataStart, dataEnd);
  let result;
  if (entry.method === 0) {
    result = Buffer.from(data);
  } else if (entry.method === 8) {
    try {
      result = inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES });
    } catch (error) {
      throw new EpubError(`EPUB 解压失败：${entry.name}`, 'epub-deflate');
    }
  } else {
    throw new EpubError(`EPUB 使用了不支持的压缩方式：${entry.method}`, 'epub-compression');
  }
  budget.total += result.length;
  if (budget.total > MAX_TOTAL_BYTES) throw new EpubError('EPUB 解压后体积过大', 'epub-too-large');
  return result;
}

function decodeXmlBuffer(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(buffer.subarray(3));
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(buffer.subarray(2));
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const body = buffer.subarray(2, 2 + ((buffer.length - 2) - ((buffer.length - 2) % 2)));
    const swapped = Buffer.allocUnsafe(body.length);
    for (let index = 0; index < body.length; index += 2) {
      swapped[index] = body[index + 1];
      swapped[index + 1] = body[index];
    }
    return new TextDecoder('utf-16le').decode(swapped);
  }
  const head = buffer.subarray(0, Math.min(buffer.length, 400)).toString('latin1');
  const declared = /encoding\s*=\s*["']([^"']+)["']/i.exec(head);
  const rawLabel = declared ? declared[1].trim().toLowerCase() : 'utf-8';
  const label = rawLabel === 'gbk' || rawLabel === 'gb2312' || rawLabel === 'gb18030' ? 'gb18030' : rawLabel;
  try {
    return new TextDecoder(label).decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00a0',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  middot: '·',
  copy: '©',
});

function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}

function stripTags(value) {
  return String(value ?? '').replace(/<[^>]*>/g, '');
}

function cleanInline(value) {
  return decodeEntities(stripTags(value)).replace(/\s+/g, ' ').trim();
}

function attrValue(tag, name) {
  const pattern = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = pattern.exec(String(tag ?? ''));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? '') : '';
}

function firstTagText(xml, tag) {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i');
  const match = pattern.exec(String(xml ?? ''));
  return match ? cleanInline(match[1]) : '';
}

function extractHeading(html) {
  const h1 = firstTagText(html, 'h1');
  return h1 !== '' ? h1 : firstTagText(html, 'h2');
}

export function htmlToText(html) {
  let text = String(html ?? '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  text = text.replace(/<(script|style|head|noscript|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  text = text.replace(/<\/?(?:script|style|head|noscript|template)\b[^>]*>/gi, '');
  text = text.replace(/<br\b[^>]*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|h[1-6]|li|tr|section|article|blockquote|pre|table|ul|ol|dd|dt|figure|figcaption|header|footer|aside|main|nav)\s*>/gi, '\n');
  text = text.replace(/<(?:p|div|h[1-6]|li|tr|section|article|blockquote|pre|table|ul|ol|dd|dt|figure|figcaption|header|footer|aside|main|nav)\b[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  text = text.replace(/\u00a0/g, ' ');
  text = text.replace(/\r\n?/g, '\n');
  text = text.replace(/[ \t\f\v]+/g, ' ');
  text = text.replace(/ *\n */g, '\n');
  text = text.replace(/\n{2,}/g, '\n');
  return text.trim();
}

function parseManifest(opf) {
  const items = new Map();
  const pattern = /<item\b[^>]*\/?>/gi;
  let match;
  while ((match = pattern.exec(opf)) !== null) {
    const tag = match[0];
    const id = attrValue(tag, 'id');
    const href = attrValue(tag, 'href');
    if (id === '' || href === '') continue;
    items.set(id, {
      id,
      href,
      mediaType: attrValue(tag, 'media-type').toLowerCase(),
      properties: attrValue(tag, 'properties').toLowerCase(),
    });
  }
  return items;
}

function parseSpine(opf) {
  const spineTag = /<spine\b[^>]*>/i.exec(opf);
  const tocId = spineTag ? attrValue(spineTag[0], 'toc') : '';
  const idrefs = [];
  const pattern = /<itemref\b[^>]*\/?>/gi;
  let match;
  while ((match = pattern.exec(opf)) !== null) {
    const idref = attrValue(match[0], 'idref');
    if (idref !== '') idrefs.push(idref);
  }
  return { idrefs, tocId };
}

function findTocPaths(manifest, spine) {
  let ncxPath = '';
  let navPath = '';
  if (spine.tocId !== '' && manifest.has(spine.tocId)) ncxPath = manifest.get(spine.tocId).href;
  for (const item of manifest.values()) {
    if (ncxPath === '' && item.mediaType === 'application/x-dtbncx+xml') ncxPath = item.href;
    if (navPath === '' && item.properties.split(/\s+/).includes('nav')) navPath = item.href;
  }
  return { ncxPath, navPath };
}

function parseNcxTitles(xml, ncxPath) {
  const titles = new Map();
  const baseDir = dirOf(ncxPath);
  const chunks = String(xml).split(/<navPoint\b/i);
  for (let index = 1; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const label = /<navLabel\b[^>]*>[\s\S]*?<text\b[^>]*>([\s\S]*?)<\/text>/i.exec(chunk);
    const content = /<content\b[^>]*>/i.exec(chunk);
    if (!label || !content) continue;
    const source = attrValue(content[0], 'src');
    if (source === '') continue;
    const target = resolveHref(baseDir, stripFragment(source));
    const title = cleanInline(label[1]);
    if (target !== '' && title !== '' && !titles.has(target)) titles.set(target, title);
  }
  return titles;
}

function parseNavTitles(xml, navPath) {
  const titles = new Map();
  const baseDir = dirOf(navPath);
  const pattern = /<a\b[^>]*\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\s\S]*?)<\/a\s*>/gi;
  let match;
  while ((match = pattern.exec(String(xml))) !== null) {
    const source = match[1] ?? match[2] ?? '';
    const title = cleanInline(match[3] ?? '');
    if (source === '' || title === '') continue;
    const target = resolveHref(baseDir, stripFragment(source));
    if (target !== '' && !titles.has(target)) titles.set(target, title);
  }
  return titles;
}

function parseNavItemPath(manifest) {
  for (const item of manifest.values()) {
    if (item.properties.split(/\s+/).includes('nav')) return item.href;
  }
  return '';
}

function readBookTitle(opf) {
  const dcTitle = /<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i.exec(opf);
  if (dcTitle) return cleanInline(dcTitle[1]);
  return firstTagText(opf, 'title');
}

function readBookAuthor(opf) {
  const dcCreator = /<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i.exec(opf);
  return dcCreator ? cleanInline(dcCreator[1]) : '';
}

/**
 * Parse an EPUB buffer.
 * @param {Buffer|Uint8Array|ArrayBuffer} input
 * @returns {{ title: string, author: string, chapters: { title: string, text: string }[], warnings: string[] }}
 */
export function parseEpub(input) {
  const buffer = asBuffer(input);
  const entries = readZipEntries(buffer);
  const budget = { buffer, total: 0 };
  const warnings = [];

  const encryptionEntry = findEntry(entries, 'META-INF/encryption.xml');
  if (encryptionEntry !== undefined) {
    const encryption = readZipFile(entries, encryptionEntry.name, budget).toString('utf8');
    if (/<EncryptedData\b/i.test(encryption)) {
      throw new EpubError('这本 EPUB 受 DRM/加密保护，暂不支持', 'epub-drm');
    }
  }

  const containerEntry = findEntry(entries, 'META-INF/container.xml');
  if (containerEntry === undefined) throw new EpubError('EPUB 缺少 container.xml', 'epub-container');
  const container = decodeXmlBuffer(readZipFile(entries, containerEntry.name, budget));
  const rootfileTag = /<rootfile\b[^>]*\/?>/i.exec(container);
  if (!rootfileTag) throw new EpubError('container.xml 缺少 rootfile', 'epub-container');
  const rootfile = attrValue(rootfileTag[0], 'full-path');
  if (rootfile === '') throw new EpubError('container.xml 缺少 full-path', 'epub-container');

  const opfPath = normalizePath(safeDecode(rootfile));
  const opfEntry = findEntry(entries, opfPath);
  if (opfEntry === undefined) throw new EpubError(`EPUB 缺少 OPF：${opfPath}`, 'epub-opf');
  const opf = decodeXmlBuffer(readZipFile(entries, opfEntry.name, budget));
  const opfDir = dirOf(opfEntry.name);

  const manifest = parseManifest(opf);
  if (manifest.size === 0) throw new EpubError('OPF 缺少 manifest', 'epub-opf');
  const spine = parseSpine(opf);
  if (spine.idrefs.length === 0) throw new EpubError('OPF 缺少 spine', 'epub-opf');

  const title = readBookTitle(opf);
  const author = readBookAuthor(opf);
  if (title === '') warnings.push('OPF 没有书名，使用文件名');

  const { ncxPath, navPath } = findTocPaths(manifest, spine);
  let tocTitles = new Map();
  const navItemPath = parseNavItemPath(manifest);
  try {
    if (ncxPath !== '') {
      const ncxEntry = findEntry(entries, resolveHref(opfDir, ncxPath));
      if (ncxEntry !== undefined) {
        for (const [path, label] of parseNcxTitles(decodeXmlBuffer(readZipFile(entries, ncxEntry.name, budget)), ncxEntry.name)) {
          tocTitles.set(path, label);
        }
      }
    }
    if (navPath !== '') {
      const navEntry = findEntry(entries, resolveHref(opfDir, navPath));
      if (navEntry !== undefined) {
        for (const [path, label] of parseNavTitles(decodeXmlBuffer(readZipFile(entries, navEntry.name, budget)), navEntry.name)) {
          if (!tocTitles.has(path)) tocTitles.set(path, label);
        }
      }
    }
  } catch (error) {
    warnings.push(`目录解析失败，已降级：${error?.message ?? error}`);
    tocTitles = new Map();
  }

  const chapters = [];
  for (const idref of spine.idrefs) {
    if (chapters.length >= MAX_CHAPTERS) break;
    const item = manifest.get(idref);
    if (item === undefined) continue;
    const itemPath = resolveHref(opfDir, item.href);
    const isHtml = item.mediaType.includes('html') || /\.x?html?$/i.test(itemPath);
    if (!isHtml) continue;
    const entry = findEntry(entries, itemPath);
    if (entry === undefined) throw new EpubError(`EPUB 缺少正文：${itemPath}`, 'epub-missing');
    if (navItemPath !== '' && entry.name === resolveHref(opfDir, navItemPath)) continue;
    const html = decodeXmlBuffer(readZipFile(entries, entry.name, budget));
    const heading = extractHeading(html);
    let body = htmlToText(html);
    if (heading !== '' && body.startsWith(heading)) body = body.slice(heading.length).trim();
    if (body === '') continue;
    const tocTitle = tocTitles.get(entry.name) ?? tocTitles.get(itemPath) ?? '';
    const chapterTitle = tocTitle || heading || firstTagText(html, 'title') || `第 ${chapters.length + 1} 章`;
    chapters.push({ title: chapterTitle, text: body });
  }
  if (chapters.length === 0) throw new EpubError('EPUB 没有可读正文', 'epub-empty');

  // Project Gutenberg's generated EPUBs often split one plain-text book into
  // arbitrary 250 KB XHTML chunks and only put the license in the TOC. In that
  // shape the spine is not a chapter list. Rebuild real chapters from the
  // text's own headings after removing the Gutenberg header/footer.
  const combined = chapters.map((chapter) => chapter.text).join('\n');
  if (isGutenbergText(combined) && tocTitles.size < 2) {
    const cleaned = stripGutenbergText(combined);
    const rebuilt = splitChapters(cleaned).filter((chapter) => chapter.text.trim() !== '');
    if (rebuilt.length >= 2) {
      chapters.length = 0;
      for (const chapter of rebuilt) {
        const chapterTitle = chapter.title.trim() || `第 ${chapters.length + 1} 章`;
        chapters.push({ title: chapterTitle, text: chapter.text });
      }
      warnings.push('Gutenberg 文本型 EPUB，已按正文标题重新切章');
    }
  }

  return { title, author, chapters, warnings };
}
