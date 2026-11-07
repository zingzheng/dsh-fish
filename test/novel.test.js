import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { decodeText, percentAt, splitChapters, stripGutenbergText } from '../book.js';
import { createBookStore } from '../books.js';
import { parseEpub } from '../epub.js';

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Build a small, valid, stored-only EPUB for the parser tests. */
function makeEpub(entries) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, value] of entries) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(value);
    const sum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(sum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    const localRecord = Buffer.concat([local, nameBuffer, data]);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    header.writeUInt32LE(sum, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(nameBuffer.length, 28);
    header.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([header, nameBuffer]));

    locals.push(localRecord);
    offset += localRecord.length;
  }

  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

test('decodes UTF-8, UTF-16 and GB18030 TXT', async () => {
  const text = '第一章 开始\n\n中文内容。\n';
  assert.equal(decodeText(Buffer.from(text, 'utf8')), text);
  const utf16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]);
  assert.equal(decodeText(utf16), text);
  const gbk = Buffer.from([0xb5, 0xda, 0xd2, 0xbb, 0xd5, 0xc2, 0x20, 0xbf, 0xaa, 0xca, 0xbc]);
  assert.equal(decodeText(gbk).slice(0, 6), '第一章 开始'.slice(0, 6));
});

test('splits headings and virtual chunks without blank lines', () => {
  const text = '前言内容。\n\n第一章 开始\n\n一段。\n\n二段。\n\n第二章 后来\n\n三段。\n';
  const chapters = splitChapters(text);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].title, '第一章 开始');
  assert.equal(chapters[0].text, '一段。\n二段。');
  assert.equal(chapters[1].text, '三段。');

  const long = splitChapters('没有标题。'.repeat(20000));
  assert.ok(long.length > 1);
  assert.ok(long.every((chapter) => chapter.text.length <= 40000));
});

test('strips Gutenberg boilerplate and ignores prose that starts like a heading', () => {
  const wrapped = 'header\n*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\n第一回 開始\n正文。\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\nfooter';
  assert.equal(stripGutenbergText(wrapped), '第一回 開始\n正文。');

  const text = '第一回 開始\n正文。\n第四回中既將前事說明，此回不再重複。\n第二回 後來\n結尾。';
  const chapters = splitChapters(text);
  assert.equal(chapters.length, 2);
  assert.ok(chapters[0].text.includes('第四回中既將'));
});

test('percent is based on chapter sizes', () => {
  assert.equal(percentAt([516, 336], 0, 0), 0);
  assert.equal(percentAt([516, 336], 0, 516), 60.56);
  assert.equal(percentAt([516, 336], 1, 0), 60.56);
  assert.equal(percentAt([516, 336], 1, 336), 100);
});

test('parses EPUB metadata, navigation and spine text', () => {
  const parsed = parseEpub(makeEpub([
    ['mimetype', 'application/epub+zip'],
    ['META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'],
    ['OEBPS/content.opf', '<?xml version="1.0" encoding="utf-8"?><package version="3.0" unique-identifier="book-id" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>测试书</dc:title><dc:creator>作者</dc:creator></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="ch1" href="chapter1.xhtml" media-type="application/xhtml+xml"/><item id="ch2" href="chapter2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="ch1"/><itemref idref="ch2"/></spine></package>'],
    ['OEBPS/nav.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><body><nav epub:type="toc"><ol><li><a href="chapter1.xhtml">第一章 开始</a></li><li><a href="chapter2.xhtml">第二章 后来</a></li></ol></nav></body></html>'],
    ['OEBPS/chapter1.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第一章 开始</title></head><body><h1>第一章 开始</h1><p>正文一。</p><p>正文二。</p></body></html>'],
    ['OEBPS/chapter2.xhtml', '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>第二章 后来</title></head><body><h1>第二章 后来</h1><p>结尾。</p></body></html>'],
  ]));

  assert.equal(parsed.title, '测试书');
  assert.equal(parsed.author, '作者');
  assert.equal(parsed.chapters.length, 2);
  assert.deepEqual(parsed.chapters.map((chapter) => chapter.title), ['第一章 开始', '第二章 后来']);
  assert.match(parsed.chapters[0].text, /正文一/);
  assert.match(parsed.chapters[1].text, /结尾/);
});

test('store imports a TXT, saves progress and removes it', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'dsh-fish-test-'));
  try {
    const store = createBookStore({ home });
    const result = await store.importBuffer(Buffer.from('第一章 开始\n\n正文。\n\n第二章 后来\n\n结尾。\n', 'utf8'), 'sample.txt');
    assert.equal(result.item.title, 'sample');
    assert.equal(result.item.chapterCount, 2);
    const chapter = await store.getChapter(result.item.id, 1);
    assert.equal(chapter.chapterTitle, '第二章 后来');
    const progress = await store.saveProgress(result.item.id, 1, 2);
    assert.equal(progress.progress.chapterIndex, 1);
    assert.ok(progress.progress.percent > 0);
    const list = await store.list();
    assert.equal(list.activeId, result.item.id);
    const removed = await store.remove(result.item.id);
    assert.equal(removed.items.length, 0);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
