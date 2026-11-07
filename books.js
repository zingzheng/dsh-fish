/**
 * Host-side book library.
 *
 * Files live below `$DSH_HOME/fish`:
 *   library.json          metadata + active book + per-book progress
 *   books/<sha256>.json   parsed chapters
 *
 * The browser only receives metadata and one chapter at a time. This keeps a
 * large book from crossing the wire on every page turn and makes progress
 * available from any browser using the same DSH host.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { MAX_TEXT_CHARS, clampChapter, clampOffset, decodeText, guessTitle, percentAt, splitChapters } from './book.js';
import { EpubError, parseEpub } from './epub.js';

const LIBRARY_VERSION = 1;
const BOOKS_LIMIT = 100;
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
const MAX_CACHE_BOOKS = 2;
const ID_RE = /^[a-f0-9]{64}$/;

export class BookError extends Error {
  constructor(message, code = 'book-invalid', status = 400) {
    super(message);
    this.name = 'BookError';
    this.code = code;
    this.status = status;
  }
}

function resolveHome(input) {
  const value = typeof input === 'string' && input.trim() !== '' ? input : (process.env.DSH_HOME || '');
  return value !== '' ? path.resolve(value) : path.join(homedir(), '.dsh');
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function sanitizeName(value) {
  const base = String(value ?? '').split(/[\\/]/).pop() ?? '';
  return base.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 240) || 'book';
}

function emptyLibrary() {
  return { version: LIBRARY_VERSION, activeId: null, items: [] };
}

function normalizeProgress(value, chapterCount, chapterSizes) {
  const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const chapterIndex = clampChapter(source.chapterIndex, chapterCount);
  const offset = clampOffset(source.offset, chapterSizes[chapterIndex] ?? 0);
  return {
    chapterIndex,
    offset,
    percent: percentAt(chapterSizes, chapterIndex, offset),
    updatedAt: asString(source.updatedAt),
  };
}

function normalizeItem(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = asString(value.id).trim();
  if (!ID_RE.test(id)) return null;
  const format = value.format === 'epub' ? 'epub' : 'txt';
  const chapterTitles = Array.isArray(value.chapterTitles)
    ? value.chapterTitles.slice(0, 5000).map((title) => asString(title).slice(0, 240))
    : [];
  const chapterSizes = Array.isArray(value.chapterSizes)
    ? value.chapterSizes.slice(0, 5000).map((size) => Math.max(0, Math.trunc(asNumber(size))))
    : [];
  const chapterCount = Math.max(1, Math.trunc(asNumber(value.chapterCount, chapterSizes.length || 1)));
  const totalChars = Math.max(0, Math.trunc(asNumber(value.totalChars, chapterSizes.reduce((sum, size) => sum + size, 0))));
  return {
    id,
    title: asString(value.title).trim() || '未命名',
    author: asString(value.author).trim(),
    format,
    size: Math.max(0, Math.trunc(asNumber(value.size))),
    chapterCount,
    totalChars,
    chapterTitles,
    chapterSizes,
    importedAt: asString(value.importedAt),
    lastOpenedAt: asString(value.lastOpenedAt),
    progress: normalizeProgress(value.progress, chapterCount, chapterSizes),
  };
}

function normalizeLibrary(value) {
  const source = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const seen = new Set();
  const items = [];
  for (const entry of Array.isArray(source.items) ? source.items : []) {
    const item = normalizeItem(entry);
    if (item === null || seen.has(item.id)) continue;
    seen.add(item.id);
    items.push(item);
    if (items.length >= BOOKS_LIMIT) break;
  }
  items.sort((left, right) => {
    const leftTime = Date.parse(left.lastOpenedAt);
    const rightTime = Date.parse(right.lastOpenedAt);
    return (Number.isFinite(rightTime) ? rightTime : 0) - (Number.isFinite(leftTime) ? leftTime : 0);
  });
  const activeId = typeof source.activeId === 'string' && seen.has(source.activeId) ? source.activeId : (items[0]?.id ?? null);
  return { version: LIBRARY_VERSION, activeId, items };
}

function itemForClient(item) {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    format: item.format,
    size: item.size,
    chapterCount: item.chapterCount,
    totalChars: item.totalChars,
    chapterTitles: item.chapterTitles.slice(),
    chapterSizes: item.chapterSizes.slice(),
    importedAt: item.importedAt,
    lastOpenedAt: item.lastOpenedAt,
    progress: { ...item.progress },
  };
}

function libraryForClient(library) {
  return {
    activeId: library.activeId,
    items: library.items.map(itemForClient),
  };
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
  await rename(temporary, file);
}

async function readJsonFile(file) {
  const text = await readFile(file, 'utf8');
  return JSON.parse(text);
}

/**
 * Create one isolated library instance. Routes own it for the plugin lifetime.
 * @param {{ home?: string }} [options]
 */
export function createBookStore(options = {}) {
  const home = resolveHome(options.home);
  const dataDir = path.join(home, 'fish');
  const booksDir = path.join(dataDir, 'books');
  const libraryFile = path.join(dataDir, 'library.json');

  let library = null;
  let loadPromise = null;
  let operationQueue = Promise.resolve();
  const contentCache = new Map();

  const contentFile = (id) => path.join(booksDir, `${id}.json`);

  const withLock = (operation) => {
    const run = operationQueue.then(operation, operation);
    operationQueue = run.catch(() => {});
    return run;
  };

  const ensureLoaded = async () => {
    if (library !== null) return library;
    if (loadPromise !== null) return loadPromise;
    loadPromise = (async () => {
      await mkdir(booksDir, { recursive: true, mode: 0o700 });
      try {
        library = normalizeLibrary(await readJsonFile(libraryFile));
      } catch (error) {
        if (error?.code !== 'ENOENT') {
          // Keep the bad file for recovery instead of silently deleting it.
          const backup = `${libraryFile}.corrupt-${Date.now()}`;
          try {
            await rename(libraryFile, backup);
            console.warn(`dsh-fish: library.json 无法读取，已移到 ${backup}`);
          } catch {
            // Ignore a failed backup; an in-memory empty library still works.
          }
        }
        library = emptyLibrary();
        try {
          await writeJsonAtomic(libraryFile, library);
        } catch {
          // The import path will report the write failure later.
        }
      }
      return library;
    })();
    try {
      return await loadPromise;
    } finally {
      loadPromise = null;
    }
  };

  const saveLibrary = async (next) => {
    library = normalizeLibrary(next);
    await writeJsonAtomic(libraryFile, library);
    return library;
  };

  const readContent = async (id) => {
    if (!ID_RE.test(id)) throw new BookError('无效的书籍 id', 'book-id', 400);
    const cached = contentCache.get(id);
    if (cached !== undefined) return cached;
    let parsed;
    try {
      parsed = await readJsonFile(contentFile(id));
    } catch (error) {
      if (error?.code === 'ENOENT') throw new BookError('书籍文件不存在', 'book-not-found', 404);
      throw new BookError('书籍文件无法读取', 'book-read', 500);
    }
    if (parsed === null || typeof parsed !== 'object' || !Array.isArray(parsed.chapters)) {
      throw new BookError('书籍文件格式不正确', 'book-file', 500);
    }
    const content = {
      id,
      title: asString(parsed.title).trim() || '未命名',
      author: asString(parsed.author).trim(),
      chapters: parsed.chapters.map((chapter, index) => ({
        title: asString(chapter?.title).slice(0, 240) || `第 ${index + 1} 章`,
        text: asString(chapter?.text),
      })),
    };
    contentCache.set(id, content);
    while (contentCache.size > MAX_CACHE_BOOKS) {
      const oldest = contentCache.keys().next().value;
      if (oldest === undefined) break;
      contentCache.delete(oldest);
    }
    return content;
  };

  const parseImport = (buffer, fileName) => {
    const lower = fileName.toLowerCase();
    const looksZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
    const format = lower.endsWith('.epub') || (looksZip && !lower.endsWith('.txt')) ? 'epub' : 'txt';
    if (format === 'epub') {
      const parsed = parseEpub(buffer);
      return {
        format,
        title: parsed.title,
        author: parsed.author,
        chapters: parsed.chapters,
        warnings: parsed.warnings,
      };
    }
    const text = decodeText(buffer);
    if (text.trim() === '') throw new BookError('TXT 文件内容为空', 'book-empty', 400);
    const chapters = splitChapters(text);
    if (chapters.length === 0) throw new BookError('TXT 文件没有可读正文', 'book-empty', 400);
    return {
      format,
      title: '',
      author: '',
      chapters,
      warnings: [],
    };
  };

  const importBuffer = async (input, fileName) => {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    if (buffer.length === 0) throw new BookError('文件为空', 'book-empty', 400);
    if (buffer.length > MAX_IMPORT_BYTES) throw new BookError('文件超过 64 MB 上限', 'book-too-large', 413);
    const name = sanitizeName(fileName);
    await ensureLoaded();
    const id = createHash('sha256').update(buffer).digest('hex');

    // Re-importing the same bytes keeps the existing progress and content.
    const existing = library.items.find((item) => item.id === id);
    if (existing !== undefined) {
      let contentAvailable = true;
      try {
        await readContent(id);
      } catch (error) {
        if (error instanceof BookError && error.status === 404) contentAvailable = false;
        else throw error;
      }
      if (contentAvailable) {
        return withLock(async () => {
          const now = new Date().toISOString();
          const nextItems = library.items.map((item) => item.id === id ? { ...item, lastOpenedAt: now } : item);
          const saved = await saveLibrary({ ...library, activeId: id, items: nextItems });
          return { item: itemForClient(saved.items.find((item) => item.id === id)), warnings: [] };
        });
      }
    }

    let parsed;
    try {
      parsed = parseImport(buffer, name);
    } catch (error) {
      if (error instanceof EpubError) throw new BookError(error.message, error.code, 400);
      if (error instanceof BookError) throw error;
      throw new BookError(`无法解析这本书：${error?.message ?? error}`, 'book-parse', 400);
    }
    const title = (parsed.title || '').trim() || guessTitle(name);
    const chapters = parsed.chapters
      .map((chapter) => ({ title: asString(chapter.title).slice(0, 240), text: asString(chapter.text) }))
      .filter((chapter) => chapter.text.trim() !== '');
    if (chapters.length === 0) throw new BookError('这本书没有可读正文', 'book-empty', 400);
    const chapterTitles = chapters.map((chapter, index) => chapter.title || `第 ${index + 1} 章`);
    const chapterSizes = chapters.map((chapter) => chapter.text.length);
    const totalChars = chapterSizes.reduce((sum, size) => sum + size, 0);
    if (totalChars > MAX_TEXT_CHARS) {
      throw new BookError(`正文超过 ${MAX_TEXT_CHARS} 字符上限`, 'book-too-large', 413);
    }
    const now = new Date().toISOString();
    const item = {
      id,
      title,
      author: (parsed.author || '').trim(),
      format: parsed.format,
      size: buffer.length,
      chapterCount: chapters.length,
      totalChars,
      chapterTitles,
      chapterSizes,
      importedAt: now,
      lastOpenedAt: now,
      progress: { chapterIndex: 0, offset: 0, percent: 0, updatedAt: now },
    };
    const content = { version: 1, id, title, author: item.author, format: item.format, chapters };

    return withLock(async () => {
      await writeJsonAtomic(contentFile(id), content);
      contentCache.set(id, { id, title, author: item.author, chapters });
      while (contentCache.size > MAX_CACHE_BOOKS) {
        const oldest = contentCache.keys().next().value;
        if (oldest === undefined) break;
        contentCache.delete(oldest);
      }
      const nextItems = [item, ...library.items.filter((entry) => entry.id !== id)].slice(0, BOOKS_LIMIT);
      const saved = await saveLibrary({ version: LIBRARY_VERSION, activeId: id, items: nextItems });
      return { item: itemForClient(saved.items.find((entry) => entry.id === id)), warnings: parsed.warnings ?? [] };
    });
  };

  const list = async () => {
    await ensureLoaded();
    return libraryForClient(library);
  };

  const getMeta = async (id) => {
    await ensureLoaded();
    const item = library.items.find((entry) => entry.id === id);
    if (item === undefined) throw new BookError('书籍不存在', 'book-not-found', 404);
    return itemForClient(item);
  };

  const getChapter = async (id, index) => {
    await ensureLoaded();
    const item = library.items.find((entry) => entry.id === id);
    if (item === undefined) throw new BookError('书籍不存在', 'book-not-found', 404);
    const content = await readContent(id);
    const chapterIndex = clampChapter(index, content.chapters.length);
    const chapter = content.chapters[chapterIndex];
    return {
      id,
      title: item.title,
      chapterIndex,
      chapterCount: content.chapters.length,
      chapterTitle: chapter.title,
      text: chapter.text,
    };
  };

  const open = async (id) => {
    await ensureLoaded();
    return withLock(async () => {
      const item = library.items.find((entry) => entry.id === id);
      if (item === undefined) throw new BookError('书籍不存在', 'book-not-found', 404);
      const now = new Date().toISOString();
      const items = library.items.map((entry) => entry.id === id ? { ...entry, lastOpenedAt: now } : entry);
      const saved = await saveLibrary({ ...library, activeId: id, items });
      return itemForClient(saved.items.find((entry) => entry.id === id));
    });
  };

  const saveProgress = async (id, chapterIndex, offset) => {
    await ensureLoaded();
    return withLock(async () => {
      const item = library.items.find((entry) => entry.id === id);
      if (item === undefined) throw new BookError('书籍不存在', 'book-not-found', 404);
      const index = clampChapter(chapterIndex, item.chapterCount);
      const clamped = clampOffset(offset, item.chapterSizes[index] ?? 0);
      const progress = {
        chapterIndex: index,
        offset: clamped,
        percent: percentAt(item.chapterSizes, index, clamped),
        updatedAt: new Date().toISOString(),
      };
      const items = library.items.map((entry) => entry.id === id ? { ...entry, progress } : entry);
      const saved = await saveLibrary({ ...library, items });
      return { id, progress: { ...saved.items.find((entry) => entry.id === id).progress } };
    });
  };

  const remove = async (id) => {
    await ensureLoaded();
    return withLock(async () => {
      const item = library.items.find((entry) => entry.id === id);
      if (item === undefined) throw new BookError('书籍不存在', 'book-not-found', 404);
      contentCache.delete(id);
      try {
        await unlink(contentFile(id));
      } catch (error) {
        if (error?.code !== 'ENOENT') throw new BookError('删除书籍文件失败', 'book-delete', 500);
      }
      const items = library.items.filter((entry) => entry.id !== id);
      const activeId = library.activeId === id ? (items[0]?.id ?? null) : library.activeId;
      const saved = await saveLibrary({ ...library, activeId, items });
      return libraryForClient(saved);
    });
  };

  return {
    dataDir,
    booksDir,
    list,
    getMeta,
    getChapter,
    importBuffer,
    open,
    saveProgress,
    remove,
  };
}
