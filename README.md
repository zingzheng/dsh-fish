# dsh-fish

English | [中文](README.zh.md)

**dsh摸鱼小组件：** A reasoning-style dock above the DeepSeek Harness Web UI
composer. It is a human-only surface: the row is rendered entirely on the
client, is not a session event, and does not affect the real conversation or
the model's output. The plugin registers no model-facing tool and no prompt
section.

Two apps share the same row:

- **Stocks** — a watchlist that reads like one line of reasoning.
- **Reading** — TXT / EPUB books stored on the DSH host, with host-backed
  progress that survives page reloads and is shared across browsers.

## Install

Requirements:

- DeepSeek Harness with the Web UI (this plugin is a `dsh.bundle`).
- Node.js 20 or newer on the host.

Install from GitHub:

```sh
dsh plugin --profile web add github:zingzheng/dsh-fish
```

Restart DeepSeek Harness after the install so the Host half and the client
bundle are loaded.

For development, install the working copy as a link:

```sh
dsh plugin --profile web add link:/path/to/dsh-fish
```

Then open a conversation and run `/fish`.

## Use

- `/fish` — open the fish app picker.
- `/fish stock` — turn on the stock watch directly.
- `/fish novel` — turn on the reading app directly.
- `/fish off` — turn the current session's fish row off.
- `/fish status` — print the active app.

`/fish`, `/fish stock` and `/fish novel` are host commands. The bare `/fish`
picker is also decorated as a client-side popup; selecting an app there does
not write a command event. The direct forms appear as a normal command row in
the conversation.

### Stock watch

- Collapsed: one reasoning-like line showing the focused symbol.
- Click the line to focus it. Press `E` (or click the chevron) to expand;
  clicking the line itself does not open the panel.
- `R` refreshes immediately, `J` / `K` (or arrows and `[` / `]`) move the
  focused symbol, and `1`–`9` jump to a symbol.
- `Esc` collapses the row while it has focus.
- Refresh every 5 minutes by default; the interval is configurable.

### Reading

Import books on **Settings → fish → Reading**. Files are uploaded to the DSH
host and stored under `$DSH_HOME/fish`; they are not sent to the model and are
not written into the session log.

- **Collapsed = single-line**. The row shows one visual line of the current
  book. Long lines wrap naturally; the row scrolls one visual line at a time.
  No book title, chapter name, page number or book-specific hover tip is shown.
- **Expanded = multi-line**. A page is 10 visual lines by default (6–14 is
  configurable). A page turn moves one viewport; auto-turn still moves one
  visual line at a time.
- **Content anchor**. Progress is stored as a character position, not a page
  number. Changing font size, line count, window width or collapsing the row
  returns to the same text instead of the same page index.
- **Per book**. Every book keeps its own position; opening another book and
  coming back resumes where you left it.
- **Cross browser**. Books, the active book and progress live on the DSH host.
  A second browser on the same host sees the same shelf and the same position.
- **No blank pages**. Blank lines between paragraphs are collapsed on import,
  so a single-line turn never stops on an empty page.
- **Auto turn**. One visual line per tick; paused while the tab is hidden and
  while the row is hidden by the boss key.
- **Mouse wheel**. While the pointer is over the reading row, the wheel moves
  one visual line. The wheel is left alone in the shelf list.

Supported formats:

- **TXT** — UTF-8, UTF-16LE / UTF-16BE (BOM) and GB18030.
- **EPUB** — ZIP (stored / deflate), `container.xml`, OPF spine, NCX and
  EPUB3 navigation, XHTML text. Images, CSS, footnotes and DRM are not
  rendered. DRM-protected EPUB is rejected.
- Project Gutenberg header/license blocks are stripped. Text-derived Gutenberg
  EPUBs are re-chaptered from their own Chinese chapter headings instead of
  being treated as a dozen arbitrary XHTML chunks.
- **Not supported**: PDF, MOBI, AZW3, online book sources. Those need
  format-specific infrastructure that does not belong in this small app.

Host limits: 64 MB per uploaded file, 20 million characters of parsed text,
64 MB of decompressed EPUB content, and 5000 chapters.

### Reading shortcuts

Global shortcuts work while the reading panel is open, even when the composer
has focus. They require at least one `Ctrl` / `Alt` / `Cmd` modifier.

| Action | Global | When the reading row has focus |
| --- | --- | --- |
| Next / previous page | `Alt + J` / `Alt + K` | `J` / `K`, `→` / `←`, `↓` / `↑`, `Space` / `Shift + Space`, `PageDown` / `PageUp` |
| Next / previous chapter | `Alt + N` / `Alt + P` | `N` / `P` |
| Next / previous book | `Alt + ]` / `Alt + [` | `]` / `[` |
| Open library | `Alt + L` | `L` |
| Toggle auto-turn | `Alt + O` | `A` |
| Toggle expanded | `Alt + G` | `E` / `Enter` |
| Hide / restore | `Alt + H` | — |

Every binding is configurable on **Settings → fish → Reading**. In the shelf
list, `J` / `K` or the arrow keys move the selection, `Enter` opens, and
`Esc` returns to reading.

### Global shortcuts

Global shortcuts work while any fish panel is open, even when the composer has
focus. They always require at least one `Ctrl` / `Alt` / `Cmd` modifier so
ordinary typing is not captured.

Defaults:

- hide / restore: `Alt + H`
- expand / collapse: `Alt + G`

Every binding can be recorded again on **Settings → fish → Global**. The boss
action also dismisses an open fish picker, and hiding is sent to the Host so a
page reload does not bring the panel back.

## Settings

The settings page has a **Global** tab plus one tab per fish app:

- **Global** — hide/restore and expand/collapse shortcuts.
- **Stocks** — watchlist, stock shortcuts, refresh interval and colors
  (red-up/green-down, green-up/red-down, or no color).
- **Reading** — book import / shelf / delete, font size, lines per page,
  auto-turn interval, and reading shortcuts.

The stock watchlist supports A-shares (`600519` / `sh600519`), Hong Kong stocks
(`00700` / `hk00700`), US tickers (`AAPL` / `usAAPL`, `usBRK.B`) and indices
(`sh000001`, `hkHSI`, `usDJI`, `usIXIC`, `usINX`), up to 12 symbols. Bare
tickers such as `AAPL` are treated as US; `SPX` maps to `usINX`.

Stock and reading UI settings live in the browser's `localStorage`. Books and
reading progress do not: they live on the DSH host under
`$DSH_HOME/fish/library.json` and `$DSH_HOME/fish/books/<sha256>.json`.

## Host data

```text
$DSH_HOME/fish/
├── library.json              shelf, active book, per-book progress
└── books/
    └── <sha256>.json         parsed chapters for one book
```

The shelf keeps up to 100 books. Importing the same bytes again updates the
last-opened time and keeps the existing progress. Deleting a book removes the
parsed content and the shelf record; there is no original file to delete.

## Privacy and boundaries

- No book text is placed in the conversation, the session log or model
  context. Chapters are fetched by the browser from authenticated same-origin
  routes only.
- Stock quotes are fetched by the Host from `qt.gtimg.cn` and
  `web.ifzq.gtimg.cn`; the browser never calls those third-party endpoints
  directly.
- Uploaded files are stored below `$DSH_HOME/fish` with owner-only permissions.
  Deleting a book through Settings removes its parsed content from the host.

## Development

```sh
npm test
```

The tests cover TXT decoding (UTF-8, UTF-16LE/BE, GB18030), EPUB parsing,
chapter splitting, Project Gutenberg cleanup, progress math and the host
shelf.

To try a local checkout in the running Harness:

```sh
dsh plugin --profile web add link:$PWD
```

Then restart the Harness. The profile entry is a link, so code changes need a
plugin reload rather than a reinstall.

## Files

- `index.js` — Host half: `/fish` command, per-session app state, quote proxy,
  book import / shelf / chapter / progress routes.
- `book.js` — TXT decoding and chapter splitting.
- `epub.js` — dependency-free EPUB ZIP / OPF / NCX / nav parser.
- `books.js` — host-side shelf, content files and progress persistence.
- `client.js` — Browser half: reasoning-style row, stock panel, reading panel,
  tabbed settings, shortcut recorder, command picker, and all styles.
- `test/novel.test.js` — Node tests for decoding, chapter splitting, progress
  math and the host shelf.
- `cordis.patch.yml` — bundle patch that inserts the plugin.
- `locale/*.json` — Plugin Manager metadata.
- `icon.svg` — original plugin artwork.
- `README.md` / `README.zh.md` — English and Chinese documentation.

## Notes

- The Host fetches both the `qt.gtimg.cn` snapshot and the
  `web.ifzq.gtimg.cn/appstock/app/minute/query` JSON feed. It compares each
  row's exchange timestamp and keeps the newer one, because the snapshot
  endpoint can lag while the minute feed's embedded `qt` array is current.
  Both feeds are proxied through the Host so the browser does not need
  cross-origin access or GBK decoding.
- The quote proxy supports A-share, Hong Kong and US stocks and indices,
  including mixed watchlists.
- Hong Kong stocks report volume in shares and turnover in HKD; US stocks
  report shares and USD; A-shares report lots and CNY. The panel formats
  those units and shows the currency in the detail line.
- US quote timestamps are converted from `America/New_York` (DST-aware), and
  the US session is shown as live during 09:30–16:00 New York time.
- The active app is kept in Host memory per session. It survives a page
  reload but not a Host process restart.
- Book content is read only through authenticated same-origin routes. The
  plugin does not register a model-facing tool or prompt; no book text is
  placed in the conversation or model context.

## License

MIT © 2026 zingzheng
