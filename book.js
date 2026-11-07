/**
 * Plain-text book helpers.
 *
 * This module is deliberately free of DSH/runtime imports: encoding, chapter
 * splitting and title cleanup are easy to test against a Buffer in Node.
 */

const CHAPTER_TITLE_RE = /^[\s\u3000]*(?:第[0-9０-９零〇一二三四五六七八九十百千万两]{1,12}[章节回卷部篇集]|序章|楔子|引子|尾声|后记|番外)[^\n]{0,50}$/;
const MAX_TITLE_LINE_LENGTH = 1000;
const DECORATIVE_LINE_RE = /^[\s\u3000]*[—–-]{5,}[\s\u3000]*$/;
const CHAPTER_TITLE_ONLY_RE = /^第[0-9０-９零〇一二三四五六七八九十百千万两]{1,12}[章节回卷部篇集]$/;
const PREFACE_MIN_CHARS = 200;
const VIRTUAL_CHAPTER_CHARS = 40000;
const MAX_CHAPTERS = 5000;

export const MAX_TEXT_CHARS = 20_000_000;

function asBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (input instanceof Uint8Array) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  throw new TypeError('expected a Buffer, Uint8Array or ArrayBuffer');
}

function swapUtf16Bytes(buffer) {
  const body = buffer.subarray(0, buffer.length - (buffer.length % 2));
  const swapped = Buffer.allocUnsafe(body.length);
  for (let index = 0; index < body.length; index += 2) {
    swapped[index] = body[index + 1];
    swapped[index + 1] = body[index];
  }
  return swapped;
}

export function normalizeText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').replace(/\uFEFF/g, '');
}

export function isGutenbergText(value) {
  return /\*\*\*\s*(?:START|END) OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i.test(String(value ?? ''));
}

/** Remove the Project Gutenberg header/license and footer from a text book. */
export function stripGutenbergText(value) {
  let output = String(value ?? '');
  const start = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i.exec(output);
  if (start !== null) output = output.slice(start.index + start[0].length);
  const end = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i.exec(output);
  if (end !== null) output = output.slice(0, end.index);
  return output.trim();
}

/**
 * Decode a TXT file the way Chinese e-book files are usually packaged:
 * BOM first, then strict UTF-8, then GB18030.
 */
export function decodeText(input) {
  const buffer = asBuffer(input);
  let text;
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    text = new TextDecoder('utf-8').decode(buffer.subarray(3));
  } else if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    text = new TextDecoder('utf-16le').decode(buffer.subarray(2));
  } else if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    text = new TextDecoder('utf-16le').decode(swapUtf16Bytes(buffer.subarray(2)));
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder('gb18030').decode(buffer);
    }
  }
  return normalizeText(text);
}

export function guessTitle(fileName) {
  const base = String(fileName ?? '').split(/[\\/]/).pop() ?? '';
  return base.replace(/\.[^.]+$/, '').trim() || '未命名';
}

function trimTitle(value) {
  return String(value ?? '').replace(/^[\s\u3000]+|[\s\u3000]+$/g, '').slice(0, 200);
}

function virtualChapters(text) {
  const chapters = [];
  let cursor = 0;
  while (cursor < text.length && chapters.length < MAX_CHAPTERS) {
    let end = Math.min(text.length, cursor + VIRTUAL_CHAPTER_CHARS);
    if (end < text.length) {
      const newline = text.lastIndexOf('\n', end);
      if (newline > cursor + VIRTUAL_CHAPTER_CHARS / 2) end = newline + 1;
    }
    const body = text.slice(cursor, end).replace(/\n{2,}/g, '\n').trim();
    if (body !== '') chapters.push({ title: '', text: body });
    cursor = end;
  }
  return chapters;
}

/**
 * A line that starts with a chapter label is not necessarily a heading:
 * prose can begin with "第四回中既將…". Require either a bare label or a
 * short title-like remainder without sentence punctuation.
 */
function isChapterHeading(line) {
  if (typeof line !== 'string' || line.length > MAX_TITLE_LINE_LENGTH) return false;
  if (!CHAPTER_TITLE_RE.test(line)) return false;
  const compact = line.trim();
  const match = /^(?:第[0-9０-９零〇一二三四五六七八九十百千万两]{1,12}[章节回卷部篇集]|序章|楔子|引子|尾声|后记|番外)/.exec(compact);
  if (match === null) return false;
  const rest = compact.slice(match[0].length).trim();
  if (rest === '') return true;
  return rest.length <= 40 && !/[。！？；，、,.!?;]/.test(rest);
}

/**
 * Split a TXT book at common Chinese chapter headings.
 *
 * A book without headings still needs to be readable in a browser; it is cut
 * into large virtual chunks instead of becoming one enormous DOM text node.
 *
 * @param {string} input
 * @returns {{ title: string, text: string }[]}
 */
export function splitChapters(input) {
  let text = normalizeText(input);
  if (isGutenbergText(text)) text = stripGutenbergText(text);
  if (text.trim() === '') return [];
  const chapters = [];
  let current = null;
  let headingFound = false;
  let preface = [];

  const flush = () => {
    if (current === null) return;
    const bodyLines = current.lines.slice();
    let title = trimTitle(current.title);
    if (CHAPTER_TITLE_ONLY_RE.test(title)) {
      while (bodyLines.length > 0 && bodyLines[0].trim() === '') bodyLines.shift();
      const candidate = (bodyLines[0] ?? '').trim();
      if (candidate !== '' && candidate.length <= 60 && !CHAPTER_TITLE_ONLY_RE.test(candidate)
        && !/[。！？!?]/.test(candidate) && /[\u3400-\u9fff]/.test(candidate)) {
        title = `${title} ${candidate}`.slice(0, 200);
        bodyLines.shift();
      }
    }
    const body = bodyLines.join('\n').replace(/\n{2,}/g, '\n').trim();
    if (body !== '') {
      chapters.push({ title, text: body });
    }
    current = null;
  };

  const contentLines = text.split('\n').filter((line) => !DECORATIVE_LINE_RE.test(line));
  for (const line of contentLines) {
    if (isChapterHeading(line)) {
      flush();
      if (!headingFound) {
        headingFound = true;
        const prefaceText = preface.join('\n');
        if (prefaceText.trim() !== '' && prefaceText.trim().length > PREFACE_MIN_CHARS) {
          chapters.push({ title: '前言', text: prefaceText });
        }
        preface = [];
      }
      current = { title: line, lines: [] };
      continue;
    }
    if (current === null) preface.push(line);
    else current.lines.push(line);
    if (chapters.length >= MAX_CHAPTERS) break;
  }
  flush();

  if (!headingFound || chapters.length === 0) return virtualChapters(text);
  return chapters.slice(0, MAX_CHAPTERS);
}

/** Clamp a chapter index against a chapter array. */
export function clampChapter(index, count) {
  const value = Math.trunc(Number(index));
  if (!Number.isFinite(value) || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, value));
}

/** Clamp a character offset against a chapter length. */
export function clampOffset(offset, length) {
  const value = Math.trunc(Number(offset));
  if (!Number.isFinite(value) || length <= 0) return 0;
  return Math.min(length, Math.max(0, value));
}

/** Book percentage from chapter sizes plus the offset inside the chapter. */
export function percentAt(chapterSizes, chapterIndex, offset) {
  if (!Array.isArray(chapterSizes) || chapterSizes.length === 0) return 0;
  const index = Math.min(chapterSizes.length - 1, Math.max(0, Math.trunc(Number(chapterIndex)) || 0));
  let before = 0;
  for (let cursor = 0; cursor < index; cursor += 1) before += chapterSizes[cursor] ?? 0;
  const size = chapterSizes[index] ?? 0;
  const total = chapterSizes.reduce((sum, value) => sum + (value ?? 0), 0);
  if (total <= 0) return 0;
  const inside = Math.min(size, Math.max(0, Math.trunc(Number(offset)) || 0));
  return Math.round(((before + inside) / total) * 10000) / 100;
}
