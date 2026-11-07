/**
 * Host half of dsh-fish.
 *
 * It owns three tiny things:
 *   - the `/fish <app>` slash command, which is useful for direct invocation;
 *   - a per-session active-app state, read by the client so a command changes
 *     what every open page shows;
 *   - an authenticated quote proxy, so the browser never has to deal with a
 *     third-party CORS policy or GBK decoding.
 *
 * The fake reasoning row itself lives entirely in client.js. No model-facing
 * tool or prompt is registered: this is deliberately a human-only surface.
 */

import { BookError, createBookStore } from './books.js';

const STATE_PATH = '/api/fish/state';
const QUOTES_PATH = '/api/fish/quotes';
const BOOKS_PATH = '/api/fish/books';
const BOOK_PATH = '/api/fish/book';
const CHAPTER_PATH = '/api/fish/book/chapter';
const MAX_SYMBOLS = 12;
const MAX_IMPORT_BYTES = 64 * 1024 * 1024;
const QUOTE_ENDPOINT = 'https://qt.gtimg.cn/q=';
const MINUTE_ENDPOINT = 'https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=';
const QUOTE_HEADERS = {
  accept: 'text/plain,*/*',
  referer: 'https://gu.qq.com/',
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
};
const CN_SYMBOL_RE = /^(sh|sz|bj)\d{6}$/;
const HK_STOCK_RE = /^hk\d{5}$/;
const HK_INDEX_RE = /^hk[a-z]{1,10}$/i;
const US_TICKER_RE = /^[A-Z][A-Z0-9.]{0,9}$/;
const BARE_HK_INDEX_ALIASES = new Map([
  ['HSI', 'hkHSI'],
  ['HSCEI', 'hkHSCEI'],
  ['HSTECH', 'hkHSTECH'],
]);
const US_ALIASES = new Map([
  ['SPX', 'usINX'],
  ['SP500', 'usINX'],
  ['INX', 'usINX'],
  ['DJI', 'usDJI'],
  ['DJIA', 'usDJI'],
  ['DOW', 'usDJI'],
  ['IXIC', 'usIXIC'],
  ['NASDAQ', 'usIXIC'],
]);
const APP_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

const APP_ALIASES = new Map([
  ['stock', 'stock'],
  ['stocks', 'stock'],
  ['quote', 'stock'],
  ['quotes', 'stock'],
  ['market', 'stock'],
  ['股市', 'stock'],
  ['行情', 'stock'],
  ['股票', 'stock'],
  ['novel', 'novel'],
  ['book', 'novel'],
  ['books', 'novel'],
  ['reader', 'novel'],
  ['read', 'novel'],
  ['小说', 'novel'],
  ['阅读', 'novel'],
  ['电子书', 'novel'],
]);

function jsonResponse(value, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

function errorResponse(status, code, message) {
  return jsonResponse({ error: { code, message } }, status);
}

function normalizeSymbol(value) {
  const raw = String(value ?? '').trim();
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  if (CN_SYMBOL_RE.test(lower) || HK_STOCK_RE.test(lower)) return lower;
  if (HK_INDEX_RE.test(raw)) return `hk${raw.slice(2).toUpperCase()}`;
  if (/^\d{6}$/.test(raw)) {
    const first = raw[0];
    if (first === '6' || first === '9') return `sh${raw}`;
    if (first === '0' || first === '2' || first === '3') return `sz${raw}`;
    if (first === '4' || first === '8') return `bj${raw}`;
    return undefined;
  }
  if (/^\d{5}$/.test(raw)) return `hk${raw}`;
  if (BARE_HK_INDEX_ALIASES.has(upper)) return BARE_HK_INDEX_ALIASES.get(upper);
  if (/^us/i.test(raw)) {
    const ticker = raw.slice(2).toUpperCase();
    if (!US_TICKER_RE.test(ticker)) return undefined;
    return US_ALIASES.get(ticker) ?? `us${ticker}`;
  }
  if (US_ALIASES.has(upper)) return US_ALIASES.get(upper);
  if (US_TICKER_RE.test(upper)) return `us${upper}`;
  return undefined;
}

function normalizeApp(value) {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLowerCase();
  return APP_ID_RE.test(raw) ? raw : undefined;
}

function resolveApp(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return undefined;
  const alias = APP_ALIASES.get(raw);
  if (alias !== undefined) return alias;
  return normalizeApp(raw);
}

function validSessionId(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

function decodeQuoteBody(buffer) {
  try {
    return new TextDecoder('gbk').decode(buffer);
  } catch {
    return new TextDecoder('utf-8').decode(buffer);
  }
}

function numberAt(fields, index) {
  const raw = fields[index];
  if (raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseWallClock(raw) {
  if (typeof raw !== 'string') return null;
  const compact = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(raw.trim());
  if (compact !== null) {
    return {
      year: Number(compact[1]),
      month: Number(compact[2]),
      day: Number(compact[3]),
      hour: Number(compact[4]),
      minute: Number(compact[5]),
      second: Number(compact[6]),
    };
  }
  const spaced = /^(\d{4})[/-](\d{2})[/-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(raw.trim());
  if (spaced === null) return null;
  return {
    year: Number(spaced[1]),
    month: Number(spaced[2]),
    day: Number(spaced[3]),
    hour: Number(spaced[4]),
    minute: Number(spaced[5]),
    second: Number(spaced[6]),
  };
}

function quoteClock(raw) {
  const clock = parseWallClock(raw);
  if (clock === null) return null;
  return `${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}:${String(clock.second).padStart(2, '0')}`;
}

function zonedWallClockToIso(clock, timeZone) {
  const utcGuess = Date.UTC(clock.year, clock.month - 1, clock.day, clock.hour, clock.minute, clock.second);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = {};
  for (const part of formatter.formatToParts(new Date(utcGuess))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  const asZone = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return new Date(utcGuess - (asZone - utcGuess)).toISOString();
}

function quoteTimestamp(raw, market) {
  const clock = parseWallClock(raw);
  if (clock === null) return null;
  if (market === 'us') {
    try {
      return zonedWallClockToIso(clock, 'America/New_York');
    } catch {
      return null;
    }
  }
  const iso = `${clock.year}-${String(clock.month).padStart(2, '0')}-${String(clock.day).padStart(2, '0')}T${String(clock.hour).padStart(2, '0')}:${String(clock.minute).padStart(2, '0')}:${String(clock.second).padStart(2, '0')}+08:00`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

/** A recent quote timestamp plus a local trading session is a useful "probably trading" signal. */
function marketStateOf(timestamp, market) {
  if (timestamp === null) return 'closed';
  const age = Date.now() - Date.parse(timestamp);
  if (!Number.isFinite(age) || age < 0 || age > 20 * 60 * 1000) return 'closed';
  try {
    const timeZone = market === 'us' ? 'America/New_York' : market === 'hk' ? 'Asia/Hong_Kong' : 'Asia/Shanghai';
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());
    const field = (type) => parts.find((part) => part.type === type)?.value;
    const weekday = field('weekday');
    if (weekday === 'Sat' || weekday === 'Sun') return 'closed';
    const minutes = Number(field('hour')) * 60 + Number(field('minute'));
    if (market === 'us') {
      if (minutes >= 9 * 60 + 30 && minutes <= 16 * 60) return 'open';
    } else {
      const morningEnd = market === 'hk' ? 12 * 60 : 11 * 60 + 30;
      const afternoonEnd = market === 'hk' ? 16 * 60 : 15 * 60;
      if (minutes >= 9 * 60 + 30 && minutes <= morningEnd) return 'open';
      if (minutes >= 13 * 60 && minutes <= afternoonEnd) return 'open';
    }
  } catch {
    // Intl is available on every supported Node; fall through to closed.
  }
  return 'closed';
}

function marketOf(symbol) {
  if (symbol.startsWith('us')) return 'us';
  return symbol.startsWith('hk') ? 'hk' : 'cn';
}

function parseQuoteFields(fields, symbol, market) {
  if (!Array.isArray(fields) || fields.length < 38) return undefined;
  const isIndex = market === 'us'
    ? fields[56] === 'ZS'
    : market === 'hk' && !/^hk\d{5}$/.test(symbol);
  const timestamp = quoteTimestamp(fields[30], market);
  const rawVolume = numberAt(fields, 6);
  const rawAmount = numberAt(fields, 37);
  const amountWan = isIndex
    ? null
    : market === 'cn'
      ? rawAmount
      : (rawAmount === null ? null : rawAmount / 10000);
  return {
    symbol,
    code: fields[2] || symbol.slice(2),
    name: String(fields[1] ?? '').trim() || symbol,
    market,
    currency: market === 'us' ? 'USD' : market === 'hk' ? 'HKD' : 'CNY',
    isIndex,
    price: numberAt(fields, 3),
    prevClose: numberAt(fields, 4),
    open: numberAt(fields, 5),
    volume: isIndex ? null : rawVolume,
    volumeUnit: isIndex ? null : (market === 'cn' ? 'lots' : 'shares'),
    change: numberAt(fields, 31),
    changePercent: numberAt(fields, 32),
    high: numberAt(fields, 33),
    low: numberAt(fields, 34),
    amountWan,
    turnover: market === 'cn' ? numberAt(fields, 38) : null,
    timestamp,
    time: quoteClock(fields[30]),
    marketState: marketStateOf(timestamp, market),
  };
}

function parseQuoteText(text) {
  const quotes = new Map();
  const pattern = /v_([a-z0-9]+)="([^"]*)"/gi;
  for (const match of text.matchAll(pattern)) {
    const symbol = match[1].toLowerCase();
    const quote = parseQuoteFields(match[2].split('~'), symbol, marketOf(symbol));
    if (quote !== undefined) quotes.set(symbol, quote);
  }
  return quotes;
}

function pickMinuteFields(qt, symbol) {
  if (qt === null || typeof qt !== 'object') return undefined;
  const direct = qt[symbol];
  if (Array.isArray(direct) && direct.length >= 38) return direct;
  for (const value of Object.values(qt)) {
    if (Array.isArray(value) && value.length >= 38) return value;
  }
  return undefined;
}

async function fetchDirectQuoteMap(symbols, signal) {
  const response = await fetch(`${QUOTE_ENDPOINT}${symbols.join(',')}`, {
    headers: QUOTE_HEADERS,
    signal,
  });
  if (!response.ok) throw new Error(`Snapshot endpoint returned HTTP ${response.status}`);
  return parseQuoteText(decodeQuoteBody(await response.arrayBuffer()));
}

async function fetchMinuteQuote(symbol, signal) {
  const response = await fetch(`${MINUTE_ENDPOINT}${encodeURIComponent(symbol)}`, {
    headers: {
      ...QUOTE_HEADERS,
      accept: 'application/json,text/plain,*/*',
    },
    signal,
  });
  if (!response.ok) return undefined;
  let body;
  try {
    body = await response.json();
  } catch {
    return undefined;
  }
  if (body === null || body === undefined || body.code !== 0 || body.data === null || typeof body.data !== 'object') {
    return undefined;
  }
  const entry = body.data[symbol] ?? Object.values(body.data).find((value) => (
    value !== null && typeof value === 'object' && value.qt !== undefined
  ));
  const fields = pickMinuteFields(entry?.qt, symbol);
  if (fields === undefined) return undefined;
  return parseQuoteFields(fields, symbol, marketOf(symbol));
}

async function fetchMinuteQuoteMap(symbols, signal) {
  const entries = await Promise.all(symbols.map(async (symbol) => {
    try {
      return [symbol, await fetchMinuteQuote(symbol, signal)];
    } catch {
      return [symbol, undefined];
    }
  }));
  const quotes = new Map();
  for (const [symbol, quote] of entries) {
    if (quote !== undefined) quotes.set(symbol.toLowerCase(), quote);
  }
  return quotes;
}

/** Keep the row with the newest exchange timestamp instead of trusting one endpoint. */
function chooseFreshestQuote(direct, minute) {
  if (direct === undefined) return minute;
  if (minute === undefined) return direct;
  const directTime = direct.timestamp === null ? Number.NaN : Date.parse(direct.timestamp);
  const minuteTime = minute.timestamp === null ? Number.NaN : Date.parse(minute.timestamp);
  if (Number.isFinite(minuteTime) && (!Number.isFinite(directTime) || minuteTime >= directTime)) {
    return minute;
  }
  return direct;
}

async function handleQuotes(request) {
  const url = new URL(request.url);
  const requested = String(url.searchParams.get('symbols') ?? '');
  const symbols = [];
  for (const part of requested.split(',')) {
    const symbol = normalizeSymbol(part);
    if (symbol !== undefined && !symbols.includes(symbol)) symbols.push(symbol);
  }
  if (symbols.length === 0) {
    return errorResponse(400, 'fish/symbols-required', 'Provide at least one valid A-share, Hong Kong, US or index symbol.');
  }
  if (symbols.length > MAX_SYMBOLS) {
    return errorResponse(400, 'fish/too-many-symbols', `At most ${MAX_SYMBOLS} symbols are supported.`);
  }

  const directSignal = typeof AbortSignal.any === 'function'
    ? AbortSignal.any([request.signal, AbortSignal.timeout(7000)])
    : request.signal;
  const minuteSignal = typeof AbortSignal.any === 'function'
    ? AbortSignal.any([request.signal, AbortSignal.timeout(5000)])
    : request.signal;
  let directError = null;

  const [directQuotes, minuteQuotes] = await Promise.all([
    fetchDirectQuoteMap(symbols, directSignal).catch((error) => {
      directError = error;
      return new Map();
    }),
    fetchMinuteQuoteMap(symbols, minuteSignal).catch(() => new Map()),
  ]);

  const quotes = symbols.map((symbol) => {
    const key = symbol.toLowerCase();
    const quote = chooseFreshestQuote(directQuotes.get(key), minuteQuotes.get(key));
    return quote === undefined ? { symbol, missing: true } : { ...quote, symbol };
  });
  if (quotes.every((quote) => quote.missing === true)) {
    const detail = directError instanceof Error ? `: ${directError.message}` : '';
    return errorResponse(502, 'fish/quote-unreadable', `No readable quotes from the snapshot or minute services${detail}.`);
  }

  return jsonResponse({
    fetchedAt: new Date().toISOString(),
    source: 'qt.gtimg.cn/minute',
    quotes,
  });
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body !== null && typeof body === 'object' && !Array.isArray(body) ? body : undefined;
  } catch {
    return undefined;
  }
}

async function readBodyBuffer(request, limit) {
  if (request.body === null || request.body === undefined) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value === undefined) continue;
      total += value.byteLength;
      if (total > limit) throw new BookError('文件超过 64 MB 上限', 'book-too-large', 413);
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A cancelled reader can already be released.
    }
  }
  return Buffer.concat(chunks, total);
}

function bookErrorResponse(error) {
  if (error instanceof BookError) {
    return errorResponse(error.status, `fish/${error.code}`, error.message);
  }
  console.warn('dsh-fish: book request failed', error);
  return errorResponse(500, 'fish/book-failed', 'Book request failed.');
}

export const inject = ['commands', 'connection'];

export function apply(ctx) {
  /** @type {Map<string, { app: string | null, rev: number, updatedAt: string }>} */
  const sessions = new Map();
  const bookStore = createBookStore();

  const stateFor = (sessionId) => {
    const state = sessions.get(sessionId);
    return {
      app: state?.app ?? null,
      rev: state?.rev ?? 0,
      updatedAt: state?.updatedAt ?? null,
    };
  };

  const setApp = (sessionId, app) => {
    const previous = sessions.get(sessionId);
    const next = {
      app,
      rev: (previous?.rev ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    sessions.set(sessionId, next);
    if (sessions.size > 2000) {
      const oldest = sessions.keys().next().value;
      if (oldest !== undefined && oldest !== sessionId) sessions.delete(oldest);
    }
    return { ...next };
  };

  ctx.effect(() => ctx.commands.register({
    name: 'fish',
    description: '切换 fish 面板（股票 / 电子书）',
    input: { hint: '[stock|novel|off|status]' },
    recordInput: false,
    handler: ({ agent, rawInput }) => {
      const input = String(rawInput ?? '').trim().toLowerCase();
      if (input === '') {
        return { kind: 'success', text: '用法：/fish stock | novel | off | status' };
      }
      if (input === 'status' || input === '状态') {
        const state = stateFor(agent.id);
        return { kind: 'success', text: `当前 fish 应用：${state.app ?? 'off'}` };
      }
      if (input === 'off' || input === 'close' || input === 'hide' || input === '关闭') {
        setApp(agent.id, null);
        return { kind: 'success' };
      }
      const app = resolveApp(input);
      if (app === undefined) {
        return { kind: 'error', text: `未知的 fish 应用：${input}。试试 /fish stock 或 /fish novel。` };
      }
      setApp(agent.id, app);
      return { kind: 'success' };
    },
  }), 'dsh-fish: /fish command');

  ctx.effect(() => ctx.connection.fetch.register({
    path: STATE_PATH,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      if (request.method === 'GET') {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('sessionId');
        if (!validSessionId(sessionId)) {
          return errorResponse(400, 'fish/session-required', 'A sessionId query parameter is required.');
        }
        return jsonResponse(stateFor(sessionId));
      }

      const body = await readJson(request);
      if (body === undefined || !validSessionId(body.sessionId)) {
        return errorResponse(400, 'fish/invalid-state', 'Expected JSON { sessionId, app }.');
      }
      if (!Object.prototype.hasOwnProperty.call(body, 'app')) {
        return errorResponse(400, 'fish/invalid-app', 'The app field is required (null turns the board off).');
      }
      const app = body.app === null ? null : normalizeApp(body.app);
      if (body.app !== null && app === undefined) {
        return errorResponse(400, 'fish/invalid-app', 'app must be null or a lowercase app id.');
      }
      return jsonResponse(setApp(body.sessionId, app));
    },
  }), `dsh-fish: ${STATE_PATH}`);

  ctx.effect(() => ctx.connection.fetch.register({
    path: QUOTES_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: (request) => handleQuotes(request),
  }), `dsh-fish: ${QUOTES_PATH}`);

  ctx.effect(() => ctx.connection.fetch.register({
    path: BOOKS_PATH,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        if (request.method === 'GET') {
          return jsonResponse(await bookStore.list());
        }
        const contentType = String(request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
        if (!['application/octet-stream', 'application/epub+zip', 'text/plain'].includes(contentType)) {
          return errorResponse(415, 'fish/book-content-type', 'Upload the book as application/octet-stream.');
        }
        const url = new URL(request.url);
        const name = url.searchParams.get('name') ?? 'book.txt';
        const buffer = await readBodyBuffer(request, MAX_IMPORT_BYTES);
        const result = await bookStore.importBuffer(buffer, name);
        const library = await bookStore.list();
        return jsonResponse({ ...library, book: result.item, warnings: result.warnings });
      } catch (error) {
        return bookErrorResponse(error);
      }
    },
  }), `dsh-fish: ${BOOKS_PATH}`);

  ctx.effect(() => ctx.connection.fetch.register({
    path: BOOK_PATH,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        if (request.method === 'GET') {
          const url = new URL(request.url);
          const id = String(url.searchParams.get('id') ?? '');
          return jsonResponse({ book: await bookStore.getMeta(id) });
        }
        const body = await readJson(request);
        if (body === undefined) return errorResponse(400, 'fish/book-request', 'Expected a JSON body.');
        const action = String(body.action ?? '');
        const id = String(body.id ?? '');
        if (action === 'open') {
          const book = await bookStore.open(id);
          return jsonResponse({ activeId: book.id, book });
        }
        if (action === 'delete') {
          return jsonResponse(await bookStore.remove(id));
        }
        if (action === 'progress') {
          if (!Number.isFinite(Number(body.chapterIndex)) || !Number.isFinite(Number(body.offset))) {
            return errorResponse(400, 'fish/book-progress', 'chapterIndex and offset must be numbers.');
          }
          return jsonResponse(await bookStore.saveProgress(id, body.chapterIndex, body.offset));
        }
        return errorResponse(400, 'fish/book-action', 'Unknown book action.');
      } catch (error) {
        return bookErrorResponse(error);
      }
    },
  }), `dsh-fish: ${BOOK_PATH}`);

  ctx.effect(() => ctx.connection.fetch.register({
    path: CHAPTER_PATH,
    methods: ['GET'],
    requestBody: 'buffered',
    fetch: async (request) => {
      try {
        const url = new URL(request.url);
        const id = String(url.searchParams.get('id') ?? '');
        const index = Number(url.searchParams.get('index') ?? '0');
        if (!Number.isFinite(index)) {
          return errorResponse(400, 'fish/chapter-index', 'index must be a number.');
        }
        return jsonResponse({ chapter: await bookStore.getChapter(id, index) });
      } catch (error) {
        return bookErrorResponse(error);
      }
    },
  }), `dsh-fish: ${CHAPTER_PATH}`);
}
