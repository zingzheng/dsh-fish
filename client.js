window.__ModuleLoader__.load({
  id: 'dsh-fish',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-fish';
    const STORAGE_KEY = 'dsh-fish.config.v1';
    const STATE_PATH = '/api/fish/state';
    const QUOTES_PATH = '/api/fish/quotes';
    const BOOKS_PATH = '/api/fish/books';
    const BOOK_PATH = '/api/fish/book';
    const CHAPTER_PATH = '/api/fish/book/chapter';
    const NOVEL_EVENT = 'dsh-fish:novel-changed';
    const MAX_SYMBOLS = 12;
    const CONFIG_VERSION = 2;
    const REFRESH_OPTIONS = [1, 3, 5, 10, 15];
    const NOVEL_FONT_SIZES = [12, 13, 14, 15];
    const NOVEL_LINE_OPTIONS = [6, 8, 10, 12, 14];
    const NOVEL_AUTO_OPTIONS = [0, 5, 10, 20, 30];
    const DEFAULT_SYMBOLS = ['sh000001', 'sz399001', 'sz399006'];
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
    const GLOBAL_SHORTCUT_ACTIONS = ['boss', 'toggle'];
    const APP_SHORTCUT_ACTIONS = {
      stock: ['refresh', 'next', 'prev'],
      novel: ['nextPage', 'prevPage', 'nextChapter', 'prevChapter', 'nextBook', 'prevBook', 'library', 'auto'],
    };
    const DEFAULT_GLOBAL_SHORTCUTS = Object.freeze({
      boss: 'alt+keyh',
      toggle: 'alt+keyg',
    });
    const DEFAULT_APP_SHORTCUTS = Object.freeze({
      stock: Object.freeze({
        refresh: 'alt+keyr',
        next: 'alt+keyj',
        prev: 'alt+keyk',
      }),
      novel: Object.freeze({
        nextPage: 'alt+keyj',
        prevPage: 'alt+keyk',
        nextChapter: 'alt+keyn',
        prevChapter: 'alt+keyp',
        nextBook: 'alt+bracketright',
        prevBook: 'alt+bracketleft',
        library: 'alt+keyl',
        auto: 'alt+keyo',
      }),
    });
    const PREVIOUS_GLOBAL_SHORTCUTS = Object.freeze({
      boss: 'alt+shift+keyh',
      toggle: 'alt+shift+keye',
    });
    const PREVIOUS_APP_SHORTCUTS = Object.freeze({
      stock: Object.freeze({
        refresh: 'alt+shift+keyr',
        next: 'alt+shift+keyj',
        prev: 'alt+shift+keyk',
      }),
    });

    const PRESETS = [
      { symbol: 'sh000001', labelKey: 'preset.sh000001' },
      { symbol: 'sz399001', labelKey: 'preset.sz399001' },
      { symbol: 'sz399006', labelKey: 'preset.sz399006' },
      { symbol: 'hkHSI', labelKey: 'preset.hkHSI' },
      { symbol: 'usDJI', labelKey: 'preset.usDJI' },
      { symbol: 'usIXIC', labelKey: 'preset.usIXIC' },
      { symbol: 'usINX', labelKey: 'preset.usINX' },
      { symbol: 'sh600519', labelKey: 'preset.sh600519' },
      { symbol: 'hk00700', labelKey: 'preset.hk00700' },
      { symbol: 'usAAPL', labelKey: 'preset.usAAPL' },
      { symbol: 'usTSLA', labelKey: 'preset.usTSLA' },
      { symbol: 'usNVDA', labelKey: 'preset.usNVDA' },
      { symbol: 'usMSFT', labelKey: 'preset.usMSFT' },
    ];

    // Adding a fish app is deliberately a small, local change: add an entry
    // here (tab label, title, description, icon), add its defaults under
    // config.apps, and add a branch in FishDock. Its settings tab is created
    // from this registry. The host state route accepts any lowercase app id,
    // so a client-rendered app needs no host change.
    const FISH_APPS = [
      {
        id: 'stock',
        enabled: true,
        icon: 'chart',
        tabLabelKey: 'settings.tab.stock',
        titleKey: 'settings.app.stock.title',
        descriptionKey: 'settings.app.stock.description',
        badgeKey: 'settings.app.stock.badge',
      },
      {
        id: 'novel',
        enabled: true,
        icon: 'book',
        tabLabelKey: 'settings.tab.novel',
        titleKey: 'settings.app.novel.title',
        descriptionKey: 'settings.app.novel.description',
        badgeKey: 'settings.app.novel.badge',
      },
    ];

    const DICT = {
      en: {
        'dock.title': 'Thinking',
        'dock.loading': 'Reading the watchlist…',
        'dock.error': 'Market data is temporarily unavailable',
        'dock.empty': 'No symbols configured',
        'dock.retry': 'Retry',
        'dock.refresh': 'Refresh now (R)',
        'dock.expand': 'Expand reasoning',
        'dock.collapse': 'Collapse reasoning',
        'dock.updated': 'updated {time}',
        'dock.refreshIn': 'refresh in {time}',
        'dock.refreshing': 'refreshing…',
        'dock.marketOpen': 'Live',
        'dock.marketClosed': 'Closed',
        'dock.notFound': '{symbol} not found',
        'dock.syncError': 'not synced',
        'dock.syncing': 'syncing…',
        'dock.offline': 'connection lost',
        'dock.retryHint': 'press R to retry',
        'dock.a11y': 'Market reasoning row',
        'dock.focus': 'Focus the fish row (E expands)',
        'dock.key.refresh': 'refresh',
        'dock.key.switch': 'switch',
        'dock.key.jump': 'jump',
        'dock.bossLabel': 'hide',
        'table.name': 'Name',
        'table.price': 'Last',
        'table.change': 'Chg',
        'table.percent': 'Chg%',
        'table.range': 'High/Low',
        'table.amount': 'Turnover',
        'detail.open': 'Open',
        'detail.prev': 'Prev',
        'detail.high': 'High',
        'detail.low': 'Low',
        'detail.volume': 'Volume',
        'detail.amount': 'Turnover',
        'detail.turnover': 'Turnover rate',
        'cmd.group.apps': 'Apps',
        'cmd.group.control': 'Control',
        'cmd.stock.label': 'Stock watch',
        'cmd.stock.detail': 'Put your watchlist in the reasoning row',
        'cmd.novel.label': 'E-books',
        'cmd.novel.detail': 'Read TXT / EPUB in the reasoning row',
        'cmd.off.label': 'Hide the fish',
        'cmd.off.detail': 'Turn off this session’s reasoning row',
        'cmd.search.placeholder': 'Pick a fish app',
        'cmd.search.empty': 'No fish apps yet',
        'cmd.search.noResults': 'No matching app',
        'settings.title': 'Fish',
        'settings.description': 'Keep lightweight information disguised as model reasoning above the composer. Reading settings stay in this browser; books and progress live on the DSH host.',
        'settings.tab.global': 'Global',
        'settings.tab.stock': 'Stocks',
        'settings.tab.novel': 'Reading',
        'settings.tabs.aria': 'fish settings',
        'settings.global.title': 'Global',
        'settings.global.description': 'Global shortcuts and shell behavior for fish.',
        'settings.shortcuts.stock.title': 'Stock shortcuts',
        'settings.shortcuts.stock.description': 'Refresh and switch the stock watch. Single-key R / J / K / 1–9 also work when the stock row is focused.',
        'settings.app.noSettings': 'This app has no settings yet.',
        'settings.apps.title': 'Apps',
        'settings.apps.description': 'Every fish app shares the same reasoning row; more apps can be added later.',
        'settings.app.stock.title': 'Stocks',
        'settings.app.stock.description': 'Show A-share, Hong Kong, US and index quotes in the reasoning row, with collapse, cycling and timed refresh.',
        'settings.app.stock.badge': 'On',
        'settings.app.novel.title': 'E-books',
        'settings.app.novel.description': 'Read TXT and EPUB files in the reasoning row, with per-book progress on the DSH host.',
        'settings.app.novel.badge': 'On',
        'settings.watchlist.title': 'Watchlist',
        'settings.watchlist.description': 'Up to 12 symbols. Use 600519, 00700, AAPL, hkHSI or usDJI. Bare US tickers are accepted; SPX maps to usINX.',
        'settings.watchlist.placeholder': 'Code, e.g. 600519 / 00700 / AAPL / usDJI',
        'settings.watchlist.add': 'Add',
        'settings.watchlist.empty': 'No symbols yet. Add one below, or pick a common index.',
        'settings.watchlist.full': 'The watchlist is limited to 12 symbols.',
        'settings.watchlist.invalid': 'Invalid code. Use six A-share digits, five Hong Kong digits, a US ticker such as AAPL, or a sh/sz/bj/hk/us prefix.',
        'settings.watchlist.duplicate': 'That symbol is already in the list.',
        'settings.watchlist.remove': 'Remove',
        'settings.watchlist.moveUp': 'Move up',
        'settings.watchlist.moveDown': 'Move down',
        'settings.watchlist.count': '{count} / 12',
        'settings.watchlist.unknown': 'not found',
        'settings.quick': 'Common',
        'settings.refresh.title': 'Refresh interval',
        'settings.refresh.description': 'Refreshes while the fish row is open. Press R or use the refresh icon to update immediately.',
        'settings.refresh.minutes': '{count} min',
        'settings.color.title': 'Change colors',
        'settings.color.description': 'Only affects the quote numbers, not the rest of the UI.',
        'settings.color.cn': 'Red up / green down',
        'settings.color.intl': 'Green up / red down',
        'settings.color.none': 'No color',
        'settings.shortcuts.title': 'Global shortcuts',
        'settings.shortcuts.description': 'Work while a fish panel is open. A Ctrl / Alt / Cmd modifier is required so normal typing stays intact.',
        'settings.shortcuts.record': 'Record',
        'settings.shortcuts.recording': 'Press a combo…',
        'settings.shortcuts.cancel': 'Cancel',
        'settings.shortcuts.reset': 'Restore default shortcuts',
        'settings.shortcuts.resetApp': 'Restore app shortcuts',
        'settings.shortcuts.invalid': 'Use at least one Ctrl / Alt / Cmd modifier.',
        'settings.shortcuts.conflict': 'Already used by “{action}”.',
        'settings.shortcuts.hint': 'Click Record, then press a combo. Esc cancels; Backspace clears.',
        'settings.shortcuts.unbound': 'Not set',
        'settings.shortcuts.boss.title': 'Hide / restore',
        'settings.shortcuts.boss.desc': 'Hides the fish panel instantly; press again to bring it back.',
        'settings.shortcuts.toggle.title': 'Expand / collapse',
        'settings.shortcuts.toggle.desc': 'Opens or closes the current fish panel.',
        'settings.shortcuts.refresh.title': 'Refresh quotes',
        'settings.shortcuts.refresh.desc': 'Refresh the current app immediately.',
        'settings.shortcuts.next.title': 'Next stock',
        'settings.shortcuts.next.desc': 'Focus the next watchlist symbol.',
        'settings.shortcuts.prev.title': 'Previous stock',
        'settings.shortcuts.prev.desc': 'Focus the previous watchlist symbol.',
        'settings.reset': 'Restore defaults',
        'settings.resetConfirm': 'Click again to confirm',
        'settings.autosave': 'Reading settings save automatically in this browser.',
        'novel.library': 'Library',
        'novel.empty': 'No books yet',
        'novel.noBooks': 'No books imported',
        'novel.importHint': 'Open Settings → fish → Reading to import TXT / EPUB.',
        'novel.loading': 'Loading library…',
        'novel.loadingChapter': 'Loading chapter…',
        'novel.chapterError': 'Chapter unavailable',
        'novel.libraryError': 'Library unavailable',
        'novel.retry': 'Retry',
        'novel.open': 'Open',
        'novel.opened': 'Reading',
        'novel.noChapter': 'Text',
        'novel.booksCount': '{count} books',
        'novel.booksCountOne': '1 book',
        'novel.a11y': 'Reasoning row',
        'novel.key.select': 'select',
        'novel.key.open': 'open',
        'novel.key.back': 'back',
        'novel.key.page': 'turn',
        'novel.key.book': 'book',
        'novel.key.chapter': 'chapter',
        'novel.key.library': 'library',
        'novel.key.auto': 'auto',
        'settings.novel.library.title': 'Books',
        'settings.novel.library.description': 'Upload TXT / EPUB to the DSH host. Every browser sees the same shelf; progress is stored per book.',
        'settings.novel.import': 'Import TXT / EPUB',
        'settings.novel.importing': 'Importing {done}/{total}…',
        'settings.novel.importHint': 'Files stay on the DSH host; clearing browser data does not remove them.',
        'settings.novel.loading': 'Loading books…',
        'settings.novel.empty': 'No books yet. Import a TXT or EPUB above.',
        'settings.novel.active': 'Current',
        'settings.novel.chapters': '{count} chapters',
        'settings.novel.chaptersOne': '{count} chapter',
        'settings.novel.open': 'Open',
        'settings.novel.delete': 'Delete',
        'settings.novel.confirmDelete': 'Confirm delete',
        'settings.novel.reading.title': 'Reading',
        'settings.novel.reading.description': 'Single-line is one visual line per page; expanded mode is one page at a time. Font or line changes keep the same text position.',
        'settings.novel.fontSize': 'Font size',
        'settings.novel.fontSizeDescription': 'Affects the reading area only.',
        'settings.novel.pixels': '{count} px',
        'settings.novel.lines': 'Lines per page',
        'settings.novel.linesDescription': 'Number of visual lines shown when expanded.',
        'settings.novel.lineCount': '{count} lines',
        'settings.novel.auto': 'Auto turn',
        'settings.novel.autoDescription': 'Advances one visual line. Paused while the tab is hidden.',
        'settings.novel.autoOff': 'Off',
        'settings.novel.autoSeconds': 'Every {count}s',
        'settings.shortcuts.novel.title': 'Reading shortcuts',
        'settings.shortcuts.novel.description': 'Work while the reader panel is open. Single keys also work when the reading row is focused.',
        'settings.shortcuts.nextPage.title': 'Next page',
        'settings.shortcuts.nextPage.desc': 'Advance one line, or one page when expanded.',
        'settings.shortcuts.prevPage.title': 'Previous page',
        'settings.shortcuts.prevPage.desc': 'Go back one line, or one page when expanded.',
        'settings.shortcuts.nextChapter.title': 'Next chapter',
        'settings.shortcuts.nextChapter.desc': 'Jump to the start of the next chapter.',
        'settings.shortcuts.prevChapter.title': 'Previous chapter',
        'settings.shortcuts.prevChapter.desc': 'Jump to the start of the previous chapter.',
        'settings.shortcuts.nextBook.title': 'Next book',
        'settings.shortcuts.nextBook.desc': 'Switch to the next book on the shelf.',
        'settings.shortcuts.prevBook.title': 'Previous book',
        'settings.shortcuts.prevBook.desc': 'Switch to the previous book on the shelf.',
        'settings.shortcuts.library.title': 'Library',
        'settings.shortcuts.library.desc': 'Expand the row and show the book list.',
        'settings.shortcuts.auto.title': 'Auto turn',
        'settings.shortcuts.auto.desc': 'Toggle the current auto-turn speed.',
        'preset.sh000001': 'SSE Composite',
        'preset.sz399001': 'SZSE Component',
        'preset.sz399006': 'ChiNext',
        'preset.sh600519': 'Kweichow Moutai',
        'preset.hk00700': 'Tencent',
        'preset.hkHSI': 'Hang Seng Index',
        'preset.usDJI': 'Dow Jones',
        'preset.usIXIC': 'Nasdaq',
        'preset.usINX': 'S&P 500',
        'preset.usAAPL': 'Apple',
        'preset.usTSLA': 'Tesla',
        'preset.usNVDA': 'Nvidia',
        'preset.usMSFT': 'Microsoft',
      },
      zh: {
        'dock.title': '思考',
        'dock.loading': '正在读取自选股…',
        'dock.error': '行情暂时不可用',
        'dock.empty': '还没有配置自选股',
        'dock.retry': '重试',
        'dock.refresh': '立即刷新 (R)',
        'dock.expand': '展开思考',
        'dock.collapse': '收起思考',
        'dock.updated': '更新于 {time}',
        'dock.refreshIn': '{time} 后刷新',
        'dock.refreshing': '正在刷新…',
        'dock.marketOpen': '交易中',
        'dock.marketClosed': '已收盘',
        'dock.notFound': '未找到 {symbol}',
        'dock.syncError': '状态未同步',
        'dock.syncing': '同步中…',
        'dock.offline': '连接中断',
        'dock.retryHint': '按 R 重试',
        'dock.a11y': '行情思考行',
        'dock.focus': '聚焦 fish 行情（按 E 展开）',
        'dock.key.refresh': '刷新',
        'dock.key.switch': '切换',
        'dock.key.jump': '定位',
        'dock.bossLabel': '隐藏',
        'table.name': '名称',
        'table.price': '最新',
        'table.change': '涨跌',
        'table.percent': '涨跌幅',
        'table.range': '最高/最低',
        'table.amount': '成交额',
        'detail.open': '今开',
        'detail.prev': '昨收',
        'detail.high': '最高',
        'detail.low': '最低',
        'detail.volume': '成交量',
        'detail.amount': '成交额',
        'detail.turnover': '换手率',
        'cmd.group.apps': '应用',
        'cmd.group.control': '控制',
        'cmd.stock.label': '股市看盘',
        'cmd.stock.detail': '把自选股行情放进思考区',
        'cmd.novel.label': '电子书',
        'cmd.novel.detail': '在思考区阅读 TXT / EPUB',
        'cmd.off.label': '收起 fish',
        'cmd.off.detail': '关闭当前会话的 fish 面板',
        'cmd.search.placeholder': '选择 fish 应用',
        'cmd.search.empty': '还没有 fish 应用',
        'cmd.search.noResults': '没有匹配的应用',
        'settings.title': 'fish',
        'settings.description': '把轻量信息伪装成模型思考，放在输入框上方。阅读设置保存在当前浏览器；书和进度保存在 DSH 主机。',
        'settings.tab.global': '全局',
        'settings.tab.stock': '股票',
        'settings.tab.novel': '阅读',
        'settings.tabs.aria': 'fish 设置',
        'settings.global.title': '全局',
        'settings.global.description': 'fish 的全局快捷键和外壳设置。',
        'settings.shortcuts.stock.title': '股票快捷键',
        'settings.shortcuts.stock.description': '刷新和切换股票。股票行聚焦时也可用单键 R / J / K / 1–9。',
        'settings.app.noSettings': '这个应用还没有可配置项。',
        'settings.apps.title': '应用',
        'settings.apps.description': '每个 fish 应用共享同一块思考区，后续可以继续接入。',
        'settings.app.stock.title': '股票',
        'settings.app.stock.description': '在思考区显示 A 股、港股、美股与指数行情，支持收起、切换和定时刷新。',
        'settings.app.stock.badge': '已启用',
        'settings.app.novel.title': '电子书',
        'settings.app.novel.description': '在思考区阅读 TXT / EPUB；每本书的进度保存在 DSH 主机。',
        'settings.app.novel.badge': '已启用',
        'settings.watchlist.title': '自选股',
        'settings.watchlist.description': '最多 12 只；支持 A 股、港股、美股与指数。输入 600519、00700、AAPL、hkHSI 或 usDJI；SPX 会映射到 usINX。',
        'settings.watchlist.placeholder': '代码，如 600519 / 00700 / AAPL / usDJI',
        'settings.watchlist.add': '添加',
        'settings.watchlist.empty': '还没有自选。在下面添加，或点一个常用代码。',
        'settings.watchlist.full': '自选最多 12 只。',
        'settings.watchlist.invalid': '代码格式不对。支持 6 位 A 股、5 位港股、美股 ticker（如 AAPL），或 sh/sz/bj/hk/us 前缀。',
        'settings.watchlist.duplicate': '这只已经在列表里了。',
        'settings.watchlist.remove': '删除',
        'settings.watchlist.moveUp': '上移',
        'settings.watchlist.moveDown': '下移',
        'settings.watchlist.count': '{count} / 12',
        'settings.watchlist.unknown': '未找到',
        'settings.quick': '常用',
        'settings.refresh.title': '刷新间隔',
        'settings.refresh.description': '面板打开时自动刷新；按 R 或点刷新图标可立即更新。',
        'settings.refresh.minutes': '{count} 分钟',
        'settings.color.title': '涨跌颜色',
        'settings.color.description': '只影响行情数字，不影响其它界面。',
        'settings.color.cn': '红涨绿跌',
        'settings.color.intl': '绿涨红跌',
        'settings.color.none': '无颜色',
        'settings.shortcuts.title': '全局快捷键',
        'settings.shortcuts.description': 'fish 面板打开时生效。必须带 Ctrl / Alt / Cmd 修饰键，避免打断正常输入。',
        'settings.shortcuts.record': '录制',
        'settings.shortcuts.recording': '按下组合键…',
        'settings.shortcuts.cancel': '取消',
        'settings.shortcuts.reset': '恢复默认快捷键',
        'settings.shortcuts.resetApp': '恢复当前应用快捷键',
        'settings.shortcuts.invalid': '需要至少一个 Ctrl / Alt / Cmd 修饰键。',
        'settings.shortcuts.conflict': '已被「{action}」占用。',
        'settings.shortcuts.hint': '点录制后按下组合键；Esc 取消，Backspace 清除。',
        'settings.shortcuts.unbound': '未设置',
        'settings.shortcuts.boss.title': '隐藏 / 恢复',
        'settings.shortcuts.boss.desc': '有 fish 面板时立即隐藏；再按一次恢复。',
        'settings.shortcuts.toggle.title': '展开 / 收起',
        'settings.shortcuts.toggle.desc': '展开或收起当前 fish 面板。',
        'settings.shortcuts.refresh.title': '立即刷新',
        'settings.shortcuts.refresh.desc': '立即刷新当前应用的行情。',
        'settings.shortcuts.next.title': '下一只股票',
        'settings.shortcuts.next.desc': '聚焦下一只自选。',
        'settings.shortcuts.prev.title': '上一只股票',
        'settings.shortcuts.prev.desc': '聚焦上一只自选。',
        'settings.reset': '恢复默认',
        'settings.resetConfirm': '再次点击确认',
        'settings.autosave': '阅读设置会自动保存到当前浏览器。',
        'novel.library': '书库',
        'novel.empty': '还没有电子书',
        'novel.noBooks': '还没有导入书',
        'novel.importHint': '打开 设置 → fish → 阅读 导入 TXT / EPUB。',
        'novel.loading': '正在读取书库…',
        'novel.loadingChapter': '正在读取章节…',
        'novel.chapterError': '章节暂时不可用',
        'novel.libraryError': '书库暂时不可用',
        'novel.retry': '重试',
        'novel.open': '打开',
        'novel.opened': '当前',
        'novel.noChapter': '正文',
        'novel.booksCount': '{count} 本',
        'novel.booksCountOne': '1 本',
        'novel.a11y': '思考行',
        'novel.key.select': '选择',
        'novel.key.open': '打开',
        'novel.key.back': '返回',
        'novel.key.page': '翻页',
        'novel.key.book': '换书',
        'novel.key.chapter': '翻章',
        'novel.key.library': '书库',
        'novel.key.auto': '自动',
        'settings.novel.library.title': '书籍',
        'settings.novel.library.description': 'TXT / EPUB 上传到 DSH 主机；所有浏览器共用书架，每本书独立保存进度。',
        'settings.novel.import': '导入 TXT / EPUB',
        'settings.novel.importing': '导入中 {done}/{total}…',
        'settings.novel.importHint': '文件保存在 DSH 主机；清浏览器数据不会丢失。',
        'settings.novel.loading': '正在读取书籍…',
        'settings.novel.empty': '还没有书。在上方导入 TXT 或 EPUB。',
        'settings.novel.active': '当前',
        'settings.novel.chapters': '{count} 章',
        'settings.novel.chaptersOne': '{count} 章',
        'settings.novel.open': '打开',
        'settings.novel.delete': '删除',
        'settings.novel.confirmDelete': '确认删除',
        'settings.novel.reading.title': '阅读',
        'settings.novel.reading.description': '单行时一行一页；展开时按整页翻。改字号或行数不会丢掉当前文字位置。',
        'settings.novel.fontSize': '字号',
        'settings.novel.fontSizeDescription': '只影响阅读区。',
        'settings.novel.pixels': '{count} px',
        'settings.novel.lines': '每页行数',
        'settings.novel.linesDescription': '展开后一页显示的可视行数。',
        'settings.novel.lineCount': '{count} 行',
        'settings.novel.auto': '自动翻页',
        'settings.novel.autoDescription': '每次前进一个可视行；标签页不可见时暂停。',
        'settings.novel.autoOff': '关闭',
        'settings.novel.autoSeconds': '每 {count} 秒',
        'settings.shortcuts.novel.title': '阅读快捷键',
        'settings.shortcuts.novel.description': '阅读面板打开时生效。阅读行聚焦时也可用单键。',
        'settings.shortcuts.nextPage.title': '下一页',
        'settings.shortcuts.nextPage.desc': '前进一行；展开时前进一页。',
        'settings.shortcuts.prevPage.title': '上一页',
        'settings.shortcuts.prevPage.desc': '后退一行；展开时后退一页。',
        'settings.shortcuts.nextChapter.title': '下一章',
        'settings.shortcuts.nextChapter.desc': '跳到下一章开头。',
        'settings.shortcuts.prevChapter.title': '上一章',
        'settings.shortcuts.prevChapter.desc': '跳到上一章开头。',
        'settings.shortcuts.nextBook.title': '下一本书',
        'settings.shortcuts.nextBook.desc': '切换到书架中的下一本。',
        'settings.shortcuts.prevBook.title': '上一本书',
        'settings.shortcuts.prevBook.desc': '切换到书架中的上一本。',
        'settings.shortcuts.library.title': '打开书库',
        'settings.shortcuts.library.desc': '展开阅读行并显示书库列表。',
        'settings.shortcuts.auto.title': '自动翻页',
        'settings.shortcuts.auto.desc': '在当前速度和关闭之间切换。',
        'preset.sh000001': '上证指数',
        'preset.sz399001': '深证成指',
        'preset.sz399006': '创业板指',
        'preset.sh600519': '贵州茅台',
        'preset.hk00700': '腾讯控股',
        'preset.hkHSI': '恒生指数',
        'preset.usDJI': '道琼斯',
        'preset.usIXIC': '纳斯达克',
        'preset.usINX': '标普500',
        'preset.usAAPL': '苹果',
        'preset.usTSLA': '特斯拉',
        'preset.usNVDA': '英伟达',
        'preset.usMSFT': '微软',
      },
    };

    // ---------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------

    function defaultConfig() {
      return {
        version: CONFIG_VERSION,
        shortcuts: { ...DEFAULT_GLOBAL_SHORTCUTS },
        apps: {
          stock: {
            symbols: DEFAULT_SYMBOLS.slice(),
            refreshMinutes: 5,
            colorMode: 'cn',
            shortcuts: { ...DEFAULT_APP_SHORTCUTS.stock },
          },
          novel: {
            fontSize: 13,
            linesPerPage: 10,
            autoSeconds: 0,
            shortcuts: { ...DEFAULT_APP_SHORTCUTS.novel },
          },
        },
      };
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

    const MODIFIER_KEYS = new Set(['ctrl', 'alt', 'shift', 'meta']);
    const KEY_LABELS = {
      bracketleft: '[',
      bracketright: ']',
      backquote: '`',
      minus: '-',
      equal: '=',
      comma: ',',
      period: '.',
      slash: '/',
      semicolon: ';',
      quote: "'",
      backslash: '\\',
      space: 'Space',
      enter: 'Enter',
      escape: 'Esc',
      backspace: 'Backspace',
      delete: 'Del',
      tab: 'Tab',
      arrowup: '↑',
      arrowdown: '↓',
      arrowleft: '←',
      arrowright: '→',
      home: 'Home',
      end: 'End',
      pageup: 'PgUp',
      pagedown: 'PgDn',
      insert: 'Ins',
    };

    function isModifierEvent(event) {
      return /^(control|alt|shift|meta)(left|right)?$/.test(String(event.code ?? '').toLowerCase());
    }

    function keyLabel(code) {
      const raw = String(code ?? '').toLowerCase();
      if (/^key[a-z]$/.test(raw)) return raw.slice(3).toUpperCase();
      if (/^digit[0-9]$/.test(raw)) return raw.slice(5);
      if (/^numpad[0-9]$/.test(raw)) return `Num${raw.slice(6)}`;
      if (/^f([1-9]|1[0-2])$/.test(raw)) return raw.toUpperCase();
      return KEY_LABELS[raw] ?? String(code ?? '');
    }

    function formatCombo(combo) {
      if (typeof combo !== 'string' || combo === '') return '';
      const parts = combo.split('+');
      const code = parts.pop();
      const labels = {
        ctrl: 'Ctrl',
        alt: 'Alt',
        shift: 'Shift',
        meta: 'Cmd',
      };
      return [...parts.map((modifier) => labels[modifier] ?? modifier), keyLabel(code)].join('+');
    }

    function comboFromEvent(event) {
      const code = String(event.code ?? '');
      if (code === '' || isModifierEvent(event)) return null;
      const modifiers = [];
      if (event.ctrlKey) modifiers.push('ctrl');
      if (event.altKey) modifiers.push('alt');
      if (event.shiftKey) modifiers.push('shift');
      if (event.metaKey) modifiers.push('meta');
      return [...modifiers, code.toLowerCase()].join('+');
    }

    function validShortcut(combo) {
      if (typeof combo !== 'string' || combo === '') return false;
      const parts = combo.split('+');
      const code = parts.pop();
      if (code === undefined || code === '' || code.startsWith('control') || code.startsWith('alt') || code.startsWith('shift') || code.startsWith('meta')) return false;
      const modifiers = parts;
      if (modifiers.some((modifier) => !MODIFIER_KEYS.has(modifier))) return false;
      if (new Set(modifiers).size !== modifiers.length) return false;
      return modifiers.some((modifier) => modifier === 'ctrl' || modifier === 'alt' || modifier === 'meta');
    }

    function normalizeShortcut(value, fallback) {
      if (value === '') return '';
      if (typeof value !== 'string') return fallback;
      const combo = value.trim().toLowerCase();
      return validShortcut(combo) ? combo : fallback;
    }

    function normalizeShortcuts(raw, actions, defaults) {
      const source = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
      const result = {};
      const used = new Set();
      for (const action of actions) {
        const candidate = normalizeShortcut(source[action], defaults[action]);
        if (candidate !== '' && used.has(candidate)) {
          result[action] = '';
        } else {
          result[action] = candidate;
          if (candidate !== '') used.add(candidate);
        }
      }
      return result;
    }

    function normalizeConfig(raw) {
      const base = defaultConfig();
      if (raw === null || typeof raw !== 'object') return base;
      const rawApps = raw.apps !== null && typeof raw.apps === 'object' && !Array.isArray(raw.apps)
        ? raw.apps
        : {};
      const rawStock = rawApps.stock !== null && typeof rawApps.stock === 'object' && !Array.isArray(rawApps.stock)
        ? rawApps.stock
        : {};
      const rawNovel = rawApps.novel !== null && typeof rawApps.novel === 'object' && !Array.isArray(rawApps.novel)
        ? rawApps.novel
        : {};

      let symbols = base.apps.stock.symbols;
      if (Array.isArray(rawStock.symbols)) {
        const seen = new Set();
        symbols = [];
        for (const entry of rawStock.symbols) {
          const symbol = normalizeSymbol(entry);
          if (symbol !== undefined && !seen.has(symbol)) {
            seen.add(symbol);
            symbols.push(symbol);
          }
          if (symbols.length >= MAX_SYMBOLS) break;
        }
      }

      const refreshMinutes = REFRESH_OPTIONS.includes(Number(rawStock.refreshMinutes))
        ? Number(rawStock.refreshMinutes)
        : base.apps.stock.refreshMinutes;
      const colorMode = rawStock.colorMode === 'intl' || rawStock.colorMode === 'none'
        ? rawStock.colorMode
        : 'cn';
      const fontSize = NOVEL_FONT_SIZES.includes(Number(rawNovel.fontSize))
        ? Number(rawNovel.fontSize)
        : base.apps.novel.fontSize;
      const linesPerPage = NOVEL_LINE_OPTIONS.includes(Number(rawNovel.linesPerPage))
        ? Number(rawNovel.linesPerPage)
        : base.apps.novel.linesPerPage;
      const autoSeconds = NOVEL_AUTO_OPTIONS.includes(Number(rawNovel.autoSeconds))
        ? Number(rawNovel.autoSeconds)
        : base.apps.novel.autoSeconds;

      const previousVersion = typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0;
      const rawGlobalShortcuts = raw.shortcuts !== null && typeof raw.shortcuts === 'object' && !Array.isArray(raw.shortcuts)
        ? { ...raw.shortcuts }
        : {};
      if (previousVersion < 2) {
        for (const action of GLOBAL_SHORTCUT_ACTIONS) {
          if (rawGlobalShortcuts[action] === PREVIOUS_GLOBAL_SHORTCUTS[action]) {
            rawGlobalShortcuts[action] = DEFAULT_GLOBAL_SHORTCUTS[action];
          }
        }
      }
      const globalShortcuts = normalizeShortcuts(
        rawGlobalShortcuts,
        GLOBAL_SHORTCUT_ACTIONS,
        DEFAULT_GLOBAL_SHORTCUTS,
      );
      const legacyStockShortcuts = {};
      if (raw.shortcuts !== null && typeof raw.shortcuts === 'object' && !Array.isArray(raw.shortcuts)) {
        for (const action of APP_SHORTCUT_ACTIONS.stock) {
          if (raw.shortcuts[action] !== undefined) legacyStockShortcuts[action] = raw.shortcuts[action];
        }
      }
      const rawStockShortcuts = rawStock.shortcuts !== null && typeof rawStock.shortcuts === 'object' && !Array.isArray(rawStock.shortcuts)
        ? { ...rawStock.shortcuts }
        : {};
      if (previousVersion < 2) {
        for (const action of APP_SHORTCUT_ACTIONS.stock) {
          if (legacyStockShortcuts[action] === PREVIOUS_APP_SHORTCUTS.stock[action]) {
            legacyStockShortcuts[action] = DEFAULT_APP_SHORTCUTS.stock[action];
          }
          if (rawStockShortcuts[action] === PREVIOUS_APP_SHORTCUTS.stock[action]) {
            rawStockShortcuts[action] = DEFAULT_APP_SHORTCUTS.stock[action];
          }
        }
      }
      const stockShortcuts = normalizeShortcuts(
        { ...legacyStockShortcuts, ...rawStockShortcuts },
        APP_SHORTCUT_ACTIONS.stock,
        DEFAULT_APP_SHORTCUTS.stock,
      );
      const rawNovelShortcuts = rawNovel.shortcuts !== null && typeof rawNovel.shortcuts === 'object' && !Array.isArray(rawNovel.shortcuts)
        ? { ...rawNovel.shortcuts }
        : {};
      const novelShortcuts = normalizeShortcuts(
        rawNovelShortcuts,
        APP_SHORTCUT_ACTIONS.novel,
        DEFAULT_APP_SHORTCUTS.novel,
      );
      const globalCombos = new Set(Object.values(globalShortcuts).filter(Boolean));
      for (const action of APP_SHORTCUT_ACTIONS.stock) {
        if (stockShortcuts[action] !== '' && globalCombos.has(stockShortcuts[action])) {
          stockShortcuts[action] = '';
        }
      }
      for (const action of APP_SHORTCUT_ACTIONS.novel) {
        if (novelShortcuts[action] !== '' && globalCombos.has(novelShortcuts[action])) {
          novelShortcuts[action] = '';
        }
      }

      return {
        ...base,
        ...raw,
        version: CONFIG_VERSION,
        shortcuts: globalShortcuts,
        apps: {
          ...base.apps,
          ...rawApps,
          stock: {
            ...base.apps.stock,
            ...rawStock,
            symbols,
            refreshMinutes,
            colorMode,
            shortcuts: stockShortcuts,
          },
          novel: {
            ...base.apps.novel,
            ...rawNovel,
            fontSize,
            linesPerPage,
            autoSeconds,
            shortcuts: novelShortcuts,
          },
        },
      };
    }

    function loadConfig() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw === null ? defaultConfig() : normalizeConfig(JSON.parse(raw));
      } catch {
        return defaultConfig();
      }
    }

    let config = loadConfig();
    const configListeners = new Set();

    function getConfig() {
      return config;
    }

    function subscribeConfig(listener) {
      configListeners.add(listener);
      return () => configListeners.delete(listener);
    }

    function updateConfig(next) {
      config = normalizeConfig(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      } catch {
        // Private browsing can refuse storage; keep the in-memory config.
      }
      for (const listener of [...configListeners]) {
        try {
          listener();
        } catch {
          // A listener failing must not break the config write.
        }
      }
      return config;
    }

    function useConfig() {
      const [value, setValue] = React.useState(getConfig);
      React.useEffect(() => subscribeConfig(() => setValue(getConfig())), []);
      return value;
    }

    function useSymbolInfo(symbols) {
      const key = symbols.join(',');
      const [info, setInfo] = React.useState({ names: {}, missing: {} });
      React.useEffect(() => {
        const controller = new AbortController();
        let alive = true;
        if (symbols.length === 0) {
          setInfo({ names: {}, missing: {} });
          return () => controller.abort();
        }
        fetchQuotesApi(symbols, controller.signal).then((body) => {
          if (!alive) return;
          const names = {};
          const missing = {};
          for (const quote of body.quotes) {
            if (quote.missing) missing[quote.symbol] = true;
            else names[quote.symbol] = quote.name;
          }
          setInfo({ names, missing });
        }).catch(() => {});
        return () => {
          alive = false;
          controller.abort();
        };
      }, [key]);
      return info;
    }

    /**
     * Shared book shelf state. Both the reader panel and the settings page use
     * it; the custom event lets an import/open/delete refresh every mounted
     * consumer without a second global store.
     */
    function useNovelLibrary() {
      const [state, setState] = React.useState({ activeId: null, items: [], loading: true, error: null });
      const generationRef = React.useRef(0);

      const reload = React.useCallback(async () => {
        const generation = ++generationRef.current;
        setState((previous) => ({ ...previous, loading: true, error: null }));
        try {
          const body = await fetchBooksApi();
          if (generation !== generationRef.current) return;
          setState({
            activeId: typeof body.activeId === 'string' ? body.activeId : null,
            items: Array.isArray(body.items) ? body.items : [],
            loading: false,
            error: null,
          });
        } catch (error) {
          if (generation !== generationRef.current) return;
          setState((previous) => ({
            ...previous,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          }));
        }
      }, []);

      React.useEffect(() => {
        void reload();
        const onChange = () => void reload();
        const onVisibility = () => {
          if (document.visibilityState === 'visible') void reload();
        };
        window.addEventListener(NOVEL_EVENT, onChange);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
          window.removeEventListener(NOVEL_EVENT, onChange);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, [reload]);

      return { ...state, reload };
    }

    function notifyNovelChanged() {
      window.dispatchEvent(new Event(NOVEL_EVENT));
    }

    // ---------------------------------------------------------------------
    // Fetching
    // ---------------------------------------------------------------------

    async function readJson(response) {
      const text = await response.text();
      if (text === '') return undefined;
      try {
        return JSON.parse(text);
      } catch {
        return undefined;
      }
    }

    async function fetchQuotesApi(symbols, signal) {
      if (symbols.length === 0) {
        return { fetchedAt: new Date().toISOString(), quotes: [] };
      }
      const response = await fetch(`${QUOTES_PATH}?symbols=${encodeURIComponent(symbols.join(','))}`, {
        signal,
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      }
      if (body === undefined || !Array.isArray(body.quotes)) {
        throw new Error('行情服务返回了无法识别的数据');
      }
      return body;
    }

    async function fetchBooksApi(signal) {
      const response = await fetch(BOOKS_PATH, {
        signal,
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      if (body === undefined || !Array.isArray(body.items)) throw new Error('书库返回了无法识别的数据');
      return body;
    }

    async function importBookApi(file, signal) {
      const name = encodeURIComponent(file?.name ?? 'book.txt');
      const response = await fetch(`${BOOKS_PATH}?name=${name}`, {
        method: 'POST',
        signal,
        cache: 'no-store',
        headers: {
          accept: 'application/json',
          'content-type': 'application/octet-stream',
        },
        body: file,
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      if (body === undefined || body.book === undefined) throw new Error('导入结果无法识别');
      return body;
    }

    async function fetchChapterApi(id, index, signal) {
      const response = await fetch(`${CHAPTER_PATH}?id=${encodeURIComponent(id)}&index=${encodeURIComponent(index)}`, {
        signal,
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      if (body === undefined || body.chapter === undefined) throw new Error('章节内容无法识别');
      return body.chapter;
    }

    async function postBookAction(payload, keepalive = false) {
      const response = await fetch(BOOK_PATH, {
        method: 'POST',
        cache: 'no-store',
        keepalive,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await readJson(response);
      if (!response.ok) throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      return body;
    }

    async function openBookApi(id) {
      return postBookAction({ action: 'open', id });
    }

    async function saveProgressApi(id, chapterIndex, offset, keepalive = false) {
      return postBookAction({ action: 'progress', id, chapterIndex, offset }, keepalive);
    }

    async function deleteBookApi(id) {
      return postBookAction({ action: 'delete', id });
    }

    async function fetchSessionState(sessionId, signal) {
      const response = await fetch(`${STATE_PATH}?sessionId=${encodeURIComponent(sessionId)}`, {
        signal,
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      }
      return body;
    }

    async function postSessionState(sessionId, app, keepalive = false) {
      const response = await fetch(STATE_PATH, {
        method: 'POST',
        cache: 'no-store',
        keepalive,
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ sessionId, app }),
      });
      const body = await readJson(response);
      if (!response.ok) {
        throw new Error(body?.error?.message ?? `HTTP ${response.status}`);
      }
      return body;
    }

    // ---------------------------------------------------------------------
    // Per-session state
    // ---------------------------------------------------------------------

    function createFishStore() {
      const EMPTY = Object.freeze({
        app: null,
        hidden: false,
        stash: null,
        hostRev: 0,
        bossRev: 0,
        syncing: false,
        syncError: null,
        hostOnline: true,
        holdUntil: 0,
        op: 0,
      });
      const entries = new Map();
      const listeners = new Set();
      let currentSession = null;
      let opCounter = 0;

      const notify = () => {
        for (const listener of [...listeners]) listener();
      };

      const get = (sessionId) => entries.get(sessionId) ?? EMPTY;

      const patch = (sessionId, changes) => {
        const previous = get(sessionId);
        let changed = false;
        for (const key of Object.keys(changes)) {
          if (previous[key] !== changes[key]) {
            changed = true;
            break;
          }
        }
        if (!changed) return previous;
        const next = { ...previous, ...changes };
        entries.set(sessionId, next);
        notify();
        return next;
      };

      const subscribe = (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      };

      const enter = (sessionId) => {
        currentSession = sessionId;
      };
      const leave = (sessionId) => {
        if (currentSession === sessionId) currentSession = null;
      };

      const acceptLocal = (sessionId, host) => {
        patch(sessionId, {
          app: host.app ?? null,
          hidden: false,
          stash: null,
          hostRev: host.rev,
          bossRev: host.rev,
          syncing: false,
          syncError: null,
          hostOnline: true,
          holdUntil: 0,
        });
      };

      const acceptBossOff = (sessionId, host) => {
        patch(sessionId, {
          hostRev: host.rev,
          bossRev: host.rev,
          syncing: false,
          syncError: null,
          hostOnline: true,
        });
      };

      const applyHost = (sessionId, host) => {
        const state = get(sessionId);
        if (host === undefined || host === null || typeof host.rev !== 'number') return;
        if (host.rev < state.hostRev) return;

        if (state.hidden) {
          if (host.rev <= state.bossRev) {
            patch(sessionId, { hostOnline: true });
            return;
          }
          if (host.app === null) {
            patch(sessionId, {
              hidden: false,
              app: null,
              stash: null,
              hostRev: host.rev,
              bossRev: host.rev,
              syncing: false,
              syncError: null,
              hostOnline: true,
              holdUntil: 0,
            });
          } else {
            patch(sessionId, {
              stash: host.app,
              app: null,
              hostRev: host.rev,
              syncing: false,
              hostOnline: true,
              holdUntil: 0,
            });
          }
          return;
        }

        if (Date.now() < state.holdUntil && host.rev <= state.hostRev) {
          patch(sessionId, { hostOnline: true });
          return;
        }

        patch(sessionId, {
          app: host.app ?? null,
          hidden: false,
          stash: null,
          hostRev: host.rev,
          bossRev: state.bossRev,
          syncing: false,
          syncError: null,
          hostOnline: true,
          holdUntil: 0,
        });
      };

      const noteHostUnavailable = (sessionId) => {
        patch(sessionId, { hostOnline: false });
      };

      const requestApp = async (sessionId, app) => {
        const op = ++opCounter;
        patch(sessionId, {
          op,
          app,
          hidden: false,
          stash: null,
          syncing: true,
          syncError: null,
          holdUntil: Date.now() + 10000,
        });
        try {
          const host = await postSessionState(sessionId, app);
          if (get(sessionId).op === op) acceptLocal(sessionId, host);
        } catch {
          if (get(sessionId).op === op) {
            patch(sessionId, { syncing: false, syncError: 'sync', hostOnline: false });
          }
        }
      };

      const hideForBoss = (sessionId) => {
        const state = get(sessionId);
        if (state.app === null) return false;
        const stash = state.app;
        const op = ++opCounter;
        patch(sessionId, {
          op,
          hidden: true,
          app: null,
          stash,
          bossRev: state.hostRev,
          syncing: true,
          syncError: null,
          holdUntil: 0,
        });
        postSessionState(sessionId, null, true).then((host) => {
          if (get(sessionId).op === op) acceptBossOff(sessionId, host);
        }).catch(() => {
          if (get(sessionId).op === op) {
            patch(sessionId, { syncing: false, syncError: 'hide', hostOnline: false });
          }
        });
        return true;
      };

      const restoreForBoss = (sessionId) => {
        const state = get(sessionId);
        if (!state.hidden || state.stash === null) return false;
        const app = state.stash;
        const op = ++opCounter;
        patch(sessionId, { op, syncing: true, syncError: null });
        postSessionState(sessionId, app).then((host) => {
          if (get(sessionId).op === op) acceptLocal(sessionId, host);
        }).catch(() => {
          if (get(sessionId).op === op) {
            patch(sessionId, { syncing: false, syncError: 'sync', hostOnline: false });
          }
        });
        return true;
      };

      const firstActiveSession = () => {
        for (const [sessionId, state] of entries) {
          if (state.app !== null || state.hidden) return sessionId;
        }
        return null;
      };

      return {
        get,
        patch,
        subscribe,
        enter,
        leave,
        applyHost,
        noteHostUnavailable,
        requestApp,
        hideForBoss,
        restoreForBoss,
        currentSession: () => currentSession,
        firstActiveSession,
      };
    }

    const store = createFishStore();
    const appControllers = new Map();
    let shortcutCapture = null;
    let commandUiRuntime = null;

    function dismissFishPopup() {
      try {
        commandUiRuntime?.dismiss('fish');
      } catch {
        // A stale popup controller must not break a shortcut.
      }
    }

    function beginShortcutCapture(handler) {
      shortcutCapture = handler;
    }

    function endShortcutCapture(handler) {
      if (handler === undefined || shortcutCapture === handler) shortcutCapture = null;
    }

    function useSessionState(sessionId) {
      const [state, setState] = React.useState(() => store.get(sessionId));
      React.useEffect(() => {
        setState(store.get(sessionId));
        return store.subscribe(() => setState(store.get(sessionId)));
      }, [sessionId]);
      return state;
    }

    function useHostSync(sessionId) {
      React.useEffect(() => {
        let cancelled = false;
        let timer;

        const poll = async () => {
          if (cancelled) return;
          if (document.visibilityState === 'hidden') {
            timer = setTimeout(poll, 10000);
            return;
          }
          try {
            const state = await fetchSessionState(sessionId);
            if (!cancelled) store.applyHost(sessionId, state);
          } catch {
            if (!cancelled) store.noteHostUnavailable(sessionId);
          }
          if (!cancelled) timer = setTimeout(poll, 2500);
        };

        const onVisibility = () => {
          if (document.visibilityState !== 'visible') return;
          clearTimeout(timer);
          void poll();
        };

        void poll();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
          cancelled = true;
          clearTimeout(timer);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, [sessionId]);
    }

    // ---------------------------------------------------------------------
    // Quote feed
    // ---------------------------------------------------------------------

    function useQuoteFeed(symbols, refreshMinutes, enabled) {
      const symbolKey = symbols.join(',');
      const intervalMs = Math.max(1, refreshMinutes) * 60 * 1000;
      const [data, setData] = React.useState({
        quotes: [],
        fetchedAt: null,
        loading: false,
        error: null,
        nextAt: 0,
      });
      const [nonce, setNonce] = React.useState(0);
      const [clock, setClock] = React.useState(() => Date.now());
      const requestRef = React.useRef(null);

      const load = React.useCallback(async () => {
        if (!enabled) return;
        if (symbolKey === '') {
          setData({ quotes: [], fetchedAt: null, loading: false, error: null, nextAt: 0 });
          return;
        }
        requestRef.current?.abort();
        const controller = new AbortController();
        requestRef.current = controller;
        setData((previous) => ({ ...previous, loading: true, error: null }));
        try {
          const body = await fetchQuotesApi(symbols, controller.signal);
          if (controller.signal.aborted) return;
          setData({
            quotes: body.quotes,
            fetchedAt: body.fetchedAt ?? new Date().toISOString(),
            loading: false,
            error: null,
            nextAt: Date.now() + intervalMs,
          });
        } catch (error) {
          if (controller.signal.aborted || error?.name === 'AbortError') return;
          setData((previous) => ({
            ...previous,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
            nextAt: Date.now() + intervalMs,
          }));
        }
      }, [enabled, symbolKey, intervalMs]);

      React.useEffect(() => {
        if (!enabled) return undefined;
        if (symbolKey === '') {
          setData({ quotes: [], fetchedAt: null, loading: false, error: null, nextAt: 0 });
          return undefined;
        }
        void load();
        const interval = setInterval(() => void load(), intervalMs);
        return () => {
          clearInterval(interval);
          requestRef.current?.abort();
        };
      }, [enabled, load, intervalMs, symbolKey, nonce]);

      React.useEffect(() => {
        if (!enabled) return undefined;
        const interval = setInterval(() => setClock(Date.now()), 1000);
        return () => clearInterval(interval);
      }, [enabled]);

      React.useEffect(() => {
        if (!enabled) return undefined;
        const onVisibility = () => {
          if (document.visibilityState !== 'visible') return;
          if (data.nextAt === 0 || Date.now() >= data.nextAt) {
            setNonce((value) => value + 1);
          }
        };
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
      }, [enabled, data.nextAt]);

      const refresh = React.useCallback(() => setNonce((value) => value + 1), []);
      const remaining = data.nextAt === 0 ? null : Math.max(0, Math.ceil((data.nextAt - clock) / 1000));

      return { ...data, refresh, remaining };
    }

    // ---------------------------------------------------------------------
    // Formatting
    // ---------------------------------------------------------------------

    function trendClass(quote, colorMode) {
      if (colorMode === 'none') return 'dfish-neutral';
      if (quote === null || quote === undefined || quote.change === null || quote.change === undefined) return 'dfish-flat';
      if (Math.abs(quote.change) < 0.000001) return 'dfish-flat';
      const up = quote.change > 0;
      const red = colorMode === 'cn' ? up : !up;
      return red ? 'dfish-up' : 'dfish-down';
    }

    function referenceTrendClass(value, reference, colorMode) {
      if (colorMode === 'none') return 'dfish-neutral';
      if (value === null || value === undefined || reference === null || reference === undefined) return 'dfish-flat';
      if (Math.abs(value - reference) < 0.000001) return 'dfish-flat';
      const up = value > reference;
      const red = colorMode === 'cn' ? up : !up;
      return red ? 'dfish-up' : 'dfish-down';
    }

    function priceDigits(quote) {
      return quote?.market === 'hk' && quote?.isIndex !== true ? 3 : 2;
    }

    function formatPrice(value, digits = 2) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      return value.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }

    function formatSigned(value, digits = 2) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      const abs = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      if (value > 0) return `+${abs}`;
      if (value < 0) return `-${abs}`;
      return abs;
    }

    function formatPercent(value) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      const sign = value > 0 ? '+' : '';
      return `${sign}${value.toFixed(2)}%`;
    }

    function formatAmount(wan) {
      if (wan === null || wan === undefined || !Number.isFinite(wan)) return '—';
      if (Math.abs(wan) >= 10000) return `${(wan / 10000).toFixed(2)}亿`;
      return `${wan.toFixed(0)}万`;
    }

    function formatVolume(value, unit) {
      if (value === null || value === undefined || !Number.isFinite(value)) return '—';
      const suffix = unit === 'shares' ? '股' : '手';
      if (Math.abs(value) >= 100000000) return `${(value / 100000000).toFixed(2)}亿${suffix}`;
      if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}万${suffix}`;
      return `${value.toFixed(0)}${suffix}`;
    }

    function formatClock(iso) {
      if (iso === null || iso === undefined) return '—';
      const date = new Date(iso);
      if (Number.isNaN(date.getTime())) return '—';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    }

    function formatCountdown(seconds) {
      if (seconds === null) return '—';
      if (seconds <= 0) return '0s';
      if (seconds < 60) return `${seconds}s`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    }

    // ---------------------------------------------------------------------
    // Icons
    // ---------------------------------------------------------------------

    function IconThink({ size = 14 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.25,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      },
      h('path', { d: 'M6.1 3.1a2.25 2.25 0 0 0-1.75 3.7 2.55 2.55 0 0 0 .62 4.6 2.3 2.3 0 0 0 3.78 1.1V3.75A2.3 2.3 0 0 0 6.1 3.1Z' }),
      h('path', { d: 'M9.9 3.1a2.25 2.25 0 0 1 1.75 3.7 2.55 2.55 0 0 1-.62 4.6 2.3 2.3 0 0 1-3.78 1.1' }),
      h('path', { d: 'M6.5 7.1c.65.2 1.05.62 1.2 1.3M9.5 7.1c-.65.2-1.05.62-1.2 1.3' }));
    }

    function IconChevron({ size = 11 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 12 12',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      }, h('path', { d: 'M4.5 2.5 8 6l-3.5 3.5' }));
    }

    function IconRefresh({ size = 13, spinning = false }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.35,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className: spinning ? 'dfish-spin' : undefined,
        'aria-hidden': true,
        focusable: false,
      },
      h('path', { d: 'M13.1 7.2A5.2 5.2 0 1 0 12 11.7' }),
      h('path', { d: 'M13.1 3.2v4h-4' }));
    }

    function IconChart({ size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      },
      h('path', { d: 'M2.5 13.5h11' }),
      h('path', { d: 'M4 11.5V8.2M7 11.5V4.8M10 11.5V6.6M13 11.5V3.2' }));
    }

    function IconBook({ size = 16 }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox: '0 0 16 16',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.3,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      },
      h('path', { d: 'M2.7 3.1c1.7-.5 3.3-.2 5.3.9v9c-2-1.1-3.6-1.4-5.3-.9v-9Z' }),
      h('path', { d: 'M13.3 3.1c-1.7-.5-3.3-.2-5.3.9v9c2-1.1 3.6-1.4 5.3-.9v-9Z' }));
    }

    function AppIcon({ name, size = 18 }) {
      return name === 'book' ? h(IconBook, { size }) : h(IconChart, { size });
    }

    // ---------------------------------------------------------------------
    // Dock
    // ---------------------------------------------------------------------

    function FishDock(props) {
      const { sessionId, t: providedT } = props;
      const tr = providedT || fallbackT;
      const cfg = useConfig();
      const session = useSessionState(sessionId);
      useHostSync(sessionId);

      React.useEffect(() => {
        store.enter(sessionId);
        return () => store.leave(sessionId);
      }, [sessionId]);

      const app = session.app === null
        ? null
        : FISH_APPS.find((entry) => entry.id === session.app && entry.enabled !== false);
      if (app === null) return null;
      if (app.id === 'novel') {
        return h(NovelPanel, {
          sessionId,
          session,
          config: cfg,
          t: tr,
        });
      }
      return h(StockPanel, {
        sessionId,
        session,
        config: cfg,
        t: tr,
      });
    }

    function StockPanel({ sessionId, session, config, t }) {
      const stockConfig = config.apps.stock;
      const symbols = stockConfig.symbols;
      const symbolKey = symbols.join(',');
      const [expanded, setExpanded] = React.useState(false);
      const [focusedSymbol, setFocusedSymbol] = React.useState(symbols[0] ?? null);
      const feed = useQuoteFeed(symbols, stockConfig.refreshMinutes, true);
      const rootRef = React.useRef(null);
      const actionsRef = React.useRef({});

      React.useEffect(() => {
        if (focusedSymbol !== null && symbols.includes(focusedSymbol)) return;
        setFocusedSymbol(symbols[0] ?? null);
      }, [symbolKey, focusedSymbol]);

      const focusedQuote = feed.quotes.find((quote) => quote.symbol === focusedSymbol) ?? null;
      const focusedIndex = symbols.indexOf(focusedSymbol);
      const marketOpen = focusedQuote?.marketState === 'open';
      const busy = feed.loading || session.syncing;
      const summary = summaryText({ t, feed, focusedQuote, focusedSymbol, symbols });

      const step = (delta) => {
        if (symbols.length === 0) return;
        const current = symbols.indexOf(focusedSymbol);
        const base = current < 0 ? (delta > 0 ? -1 : 0) : current;
        const next = (base + delta + symbols.length) % symbols.length;
        setFocusedSymbol(symbols[next]);
      };

      const selectIndex = (index) => {
        if (index < 0 || index >= symbols.length) return;
        setFocusedSymbol(symbols[index]);
      };

      actionsRef.current = {
        refresh: feed.refresh,
        toggle: () => setExpanded((value) => !value),
        next: () => step(1),
        prev: () => step(-1),
      };

      React.useEffect(() => {
        const controller = {
          refresh: () => actionsRef.current.refresh?.(),
          toggle: () => actionsRef.current.toggle?.(),
          next: () => actionsRef.current.next?.(),
          prev: () => actionsRef.current.prev?.(),
          nextPage: () => actionsRef.current.next?.(),
          prevPage: () => actionsRef.current.prev?.(),
        };
        appControllers.set(sessionId, controller);
        return () => {
          if (appControllers.get(sessionId) === controller) appControllers.delete(sessionId);
        };
      }, [sessionId]);

      const onKeyDown = (event) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null) return;
        if ((event.key === 'Enter' || event.key === ' ') && !(target instanceof Element && target.closest('button') !== null)) {
          event.preventDefault();
          setExpanded((value) => !value);
          return;
        }
        if (event.key === 'r' || event.key === 'R') {
          event.preventDefault();
          feed.refresh();
        } else if (event.key === 'j' || event.key === 'J' || event.key === 'ArrowDown') {
          event.preventDefault();
          step(1);
        } else if (event.key === 'k' || event.key === 'K' || event.key === 'ArrowUp') {
          event.preventDefault();
          step(-1);
        } else if (event.key === ']' || event.key === '[') {
          event.preventDefault();
          step(event.key === ']' ? 1 : -1);
        } else if (/^[1-9]$/.test(event.key)) {
          event.preventDefault();
          selectIndex(Number(event.key) - 1);
        } else if (event.key === 'e' || event.key === 'E') {
          event.preventDefault();
          setExpanded((value) => !value);
        } else if (event.key === 'Escape' && expanded) {
          event.preventDefault();
          setExpanded(false);
        }
      };

      const status = statusInfo({ t, feed, focusedQuote, marketOpen, session });
      const colorMode = stockConfig.colorMode;
      const bossCombo = formatCombo(config.shortcuts.boss);

      return h('div', {
        ref: rootRef,
        tabIndex: 0,
        className: 'dfish-root',
        'data-expanded': expanded ? 'true' : undefined,
        'data-session': session.app ?? undefined,
        onKeyDown,
        role: 'group',
        'aria-label': t('dock.a11y'),
      },
        h('div', { className: 'dfish-header' },
          h('div', {
            className: 'dfish-toggle',
            title: expanded ? t('dock.focus') : undefined,
            onClick: () => rootRef.current?.focus(),
          },
            h('span', { className: 'dfish-leading' }, h(IconThink, { size: 14 })),
            h('span', { className: 'dfish-title' }, t('dock.title')),
            h('span', { className: 'dfish-sep', 'aria-hidden': true }),
            h('span', {
              className: 'dfish-summary',
              'data-busy': busy ? 'true' : undefined,
            }, h('span', { className: 'dfish-summary-text' }, summary))),
          h('span', {
            className: 'dfish-header-status',
            'data-state': status.state,
            title: status.title,
          },
            h('span', {
              className: 'dfish-dot',
              'data-state': status.state,
              'aria-hidden': true,
            }),
            h('span', { className: 'dfish-header-status-text' },
              status.main,
              status.extra === '' ? null : h('span', { className: 'dfish-header-status-extra' }, status.extra))),
          h('button', {
            type: 'button',
            className: 'dfish-chevronbtn',
            'aria-expanded': expanded,
            title: expanded ? t('dock.collapse') : t('dock.expand'),
            onClick: () => setExpanded((value) => !value),
          }, h(IconChevron, { size: 11 })),
          h('span', { className: 'dfish-tools' },
            h('button', {
              type: 'button',
              className: 'dfish-iconbtn',
              title: t('dock.refresh'),
              'aria-label': t('dock.refresh'),
              disabled: symbols.length === 0,
              onClick: (event) => {
                event.stopPropagation();
                feed.refresh();
              },
            }, h(IconRefresh, { size: 13, spinning: feed.loading })))),
        expanded ? h('div', { className: 'dfish-body' },
          symbols.length === 0
            ? h('div', { className: 'dfish-empty' }, t('dock.empty'))
            : h('div', { className: 'dfish-table' },
              h('div', { className: 'dfish-tr dfish-thead' },
                h('span', null, t('table.name')),
                h('span', null, t('table.price')),
                h('span', null, t('table.change')),
                h('span', null, t('table.percent')),
                h('span', { className: 'dfish-col-range' }, t('table.range')),
                h('span', { className: 'dfish-col-amount' }, t('table.amount'))),
              symbols.map((symbol, index) => {
                const quote = feed.quotes.find((item) => item.symbol === symbol);
                return h(QuoteRow, {
                  key: symbol,
                  symbol,
                  quote,
                  index,
                  focused: symbol === focusedSymbol,
                  colorMode,
                  onSelect: selectIndex,
                });
              })),
          h(QuoteDetail, { quote: focusedQuote, colorMode, t }),
          h('div', { className: 'dfish-foot' },
            h('span', { className: 'dfish-keys' },
              h('kbd', { className: 'dfish-kbd' }, 'R'), ' ', h('span', null, t('dock.key.refresh')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, 'J/K'), ' ', h('span', null, t('dock.key.switch')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, '1–9'), ' ', h('span', null, t('dock.key.jump')),
              bossCombo === '' ? null : h(React.Fragment, null,
                h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
                h('kbd', { className: 'dfish-kbd' }, bossCombo), ' ', h('span', null, t('dock.bossLabel')))))) : null);
    }

    function summaryText({ t, feed, focusedQuote, focusedSymbol, symbols }) {
      if (symbols.length === 0) return t('dock.empty');
      if (focusedQuote?.missing === true) return t('dock.notFound', { symbol: focusedSymbol ?? '' });
      if (focusedQuote !== null && focusedQuote.price !== null && focusedQuote.price !== undefined) {
        const digits = priceDigits(focusedQuote);
        return `${focusedQuote.name} ${formatPrice(focusedQuote.price, digits)} ${formatSigned(focusedQuote.change, digits)} ${formatPercent(focusedQuote.changePercent)}`;
      }
      if (feed.error !== null) return t('dock.error');
      return t('dock.loading');
    }

    function statusInfo({ t, feed, focusedQuote, marketOpen, session }) {
      const market = marketOpen ? t('dock.marketOpen') : t('dock.marketClosed');
      const updated = t('dock.updated', { time: formatClock(focusedQuote?.timestamp ?? feed.fetchedAt) });
      const refresh = t('dock.refreshIn', { time: formatCountdown(feed.remaining) });
      const sync = session.syncError !== null ? ` · ${t('dock.syncError')}` : '';

      if (feed.error !== null) {
        const last = feed.quotes.length > 0 ? ` · ${updated}` : '';
        return {
          state: 'error',
          main: t('dock.error'),
          extra: feed.quotes.length > 0 ? ` · ${updated}` : '',
          title: `${t('dock.error')}${last} · ${t('dock.retryHint')}`,
        };
      }
      if (feed.loading) {
        return {
          state: 'loading',
          main: t('dock.refreshing'),
          extra: '',
          title: t('dock.refreshing'),
        };
      }
      if (!session.hostOnline) {
        return {
          state: 'error',
          main: t('dock.offline'),
          extra: '',
          title: t('dock.offline'),
        };
      }
      if (session.syncing) {
        return {
          state: 'loading',
          main: t('dock.syncing'),
          extra: '',
          title: t('dock.syncing'),
        };
      }
      return {
        state: marketOpen ? 'open' : 'closed',
        main: `${market} · ${refresh}`,
        extra: ` · ${updated}`,
        title: `${market} · ${updated} · ${refresh}${sync}`,
      };
    }

    function QuoteRow({ symbol, quote, index, focused, colorMode, onSelect }) {
      const missing = quote === undefined || quote.missing === true;
      const name = missing ? symbol : quote.name;
      const code = missing ? symbol : quote.code;
      const trend = trendClass(quote, colorMode);
      const digits = priceDigits(quote);
      return h('button', {
        type: 'button',
        className: 'dfish-tr dfish-row',
        'data-focused': focused ? 'true' : undefined,
        title: `${name} ${symbol}`,
        onClick: () => onSelect(index),
      },
        h('span', { className: 'dfish-name' }, h('span', { className: 'dfish-name-text' }, name), h('span', { className: 'dfish-code' }, code)),
        h('span', { className: `dfish-num ${trend}` }, formatPrice(quote?.price, digits)),
        h('span', { className: `dfish-num ${trend}` }, formatSigned(quote?.change, digits)),
        h('span', { className: `dfish-num ${trend}` }, formatPercent(quote?.changePercent)),
        h('span', { className: 'dfish-num dfish-col-range' }, quote?.high === null || quote?.high === undefined ? '—' : `${formatPrice(quote.high, digits)} / ${formatPrice(quote.low, digits)}`),
        h('span', { className: 'dfish-num dfish-col-amount' }, formatAmount(quote?.amountWan)));
    }

    function QuoteDetail({ quote, colorMode, t }) {
      if (quote === undefined || quote === null || quote.missing === true) return null;
      const digits = priceDigits(quote);
      const openClass = referenceTrendClass(quote.open, quote.prevClose, colorMode);
      const highClass = referenceTrendClass(quote.high, quote.prevClose, colorMode);
      const lowClass = referenceTrendClass(quote.low, quote.prevClose, colorMode);
      const amount = quote.amountWan === null || quote.amountWan === undefined
        ? '—'
        : `${formatAmount(quote.amountWan)}${quote.currency ? ` ${quote.currency}` : ''}`;
      const item = (label, value, className) => h('span', { className: 'dfish-detail-item' }, label, h('b', { className }, value));
      return h('div', { className: 'dfish-detail' },
        item(t('detail.open'), formatPrice(quote.open, digits), openClass),
        item(t('detail.prev'), formatPrice(quote.prevClose, digits), 'dfish-flat'),
        item(t('detail.high'), formatPrice(quote.high, digits), highClass),
        item(t('detail.low'), formatPrice(quote.low, digits), lowClass),
        item(t('detail.volume'), formatVolume(quote.volume ?? quote.volumeLots, quote.volumeUnit ?? 'lots'), 'dfish-flat'),
        item(t('detail.amount'), amount, 'dfish-flat'),
        quote.turnover === null || quote.turnover === undefined ? null : item(t('detail.turnover'), `${quote.turnover.toFixed(2)}%`, 'dfish-flat'));
    }


    // ---------------------------------------------------------------------
    // Novel reader
    // ---------------------------------------------------------------------

    function novelLineHeight(fontSize) {
      return Math.max(16, Math.round(Number(fontSize) * 1.55));
    }

    function novelPercentOf(item, chapterIndex, offset) {
      if (item === null || item === undefined) return 0;
      const sizes = Array.isArray(item.chapterSizes) ? item.chapterSizes : [];
      const total = Number(item.totalChars) || sizes.reduce((sum, value) => sum + (Number(value) || 0), 0);
      if (!(total > 0) || sizes.length === 0) return 0;
      const index = Math.min(sizes.length - 1, Math.max(0, Math.trunc(Number(chapterIndex)) || 0));
      let before = 0;
      for (let cursor = 0; cursor < index; cursor += 1) before += Number(sizes[cursor]) || 0;
      const inside = Math.min(Number(sizes[index]) || 0, Math.max(0, Math.trunc(Number(offset)) || 0));
      return Math.min(100, Math.max(0, ((before + inside) / total) * 100));
    }

    function novelPercentText(value) {
      if (!Number.isFinite(value)) return '0%';
      return `${Math.max(0, Math.min(100, Math.floor(value)))}%`;
    }

    function maxAlignedScroll(element, lineHeight) {
      const max = Math.max(0, element.scrollHeight - element.clientHeight);
      return Math.max(0, Math.floor(max / lineHeight) * lineHeight);
    }

    function novelTextNode(element) {
      if (element === null) return null;
      if (element.firstChild !== null && element.firstChild.nodeType === 3) return element.firstChild;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      return walker.nextNode();
    }

    function caretAtPoint(x, y) {
      try {
        if (typeof document.caretRangeFromPoint === 'function') {
          const range = document.caretRangeFromPoint(x, y);
          if (range !== null) return range;
        }
        if (typeof document.caretPositionFromPoint === 'function') {
          const position = document.caretPositionFromPoint(x, y);
          if (position !== null && position.offsetNode !== null) {
            const range = document.createRange();
            range.setStart(position.offsetNode, position.offset);
            range.collapse(true);
            return range;
          }
        }
      } catch {
        // Caret placement is best-effort; the last known anchor remains usable.
      }
      return null;
    }

    /** Character offset at the visual top line of a reading viewport. */
    function offsetAtViewportTop(element, lineHeight) {
      if (element === null || element.clientHeight <= 0) return null;
      const rect = element.getBoundingClientRect();
      const range = caretAtPoint(rect.left + 1, rect.top + Math.min(lineHeight - 1, Math.max(1, lineHeight / 2)));
      if (range === null || range.startContainer.nodeType !== 3) return null;
      const node = novelTextNode(element);
      if (node === null || range.startContainer !== node) return null;
      return Math.max(0, Math.min(node.length, range.startOffset));
    }

    /** Scroll one character offset to its visual line, aligned to the line height. */
    function scrollToNovelOffset(element, offset, lineHeight) {
      const node = novelTextNode(element);
      if (node === null) {
        element.scrollTop = 0;
        return 0;
      }
      const clamped = Math.max(0, Math.min(node.length, Math.trunc(Number(offset) || 0)));
      const range = document.createRange();
      range.setStart(node, clamped);
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      const host = element.getBoundingClientRect();
      const raw = rect.top - host.top + element.scrollTop;
      const aligned = Math.max(0, Math.round(raw / lineHeight) * lineHeight);
      element.scrollTop = Math.min(aligned, maxAlignedScroll(element, lineHeight));
      return element.scrollTop;
    }

    function scrollNovelByLines(element, lines, lineHeight) {
      if (element === null) return 'idle';
      const step = Math.trunc(lines) * lineHeight;
      if (step === 0) return 'idle';
      const max = maxAlignedScroll(element, lineHeight);
      if (step > 0 && element.scrollTop >= max - 0.5) return 'end';
      if (step < 0 && element.scrollTop <= 0.5) return 'start';
      element.scrollTop = Math.min(max, Math.max(0, element.scrollTop + step));
      return 'ok';
    }

    function novelBookSubtitle(item) {
      if (item === null || item === undefined) return '';
      if (item.author && item.author.trim() !== '') return `${item.title} · ${item.author}`;
      return item.title;
    }

    function novelBookCount(t, count) {
      return count === 1 ? t('novel.booksCountOne') : t('novel.booksCount', { count });
    }

    function novelChapterCount(t, count) {
      return count === 1 ? t('settings.novel.chaptersOne', { count }) : t('settings.novel.chapters', { count });
    }

    function NovelPanel({ sessionId, session, config, t }) {
      const novel = config.apps.novel;
      const library = useNovelLibrary();
      const [expanded, setExpanded] = React.useState(false);
      const [libraryOpen, setLibraryOpen] = React.useState(false);
      const [bookId, setBookId] = React.useState(null);
      const [chapter, setChapter] = React.useState(null);
      const [position, setPosition] = React.useState(null);
      const [loadingChapter, setLoadingChapter] = React.useState(false);
      const [error, setError] = React.useState(null);
      const [selectedBookId, setSelectedBookId] = React.useState(null);
      const [restoreNonce, setRestoreNonce] = React.useState(0);
      const rootRef = React.useRef(null);
      const viewportRef = React.useRef(null);
      const anchorRef = React.useRef(0);
      const pendingRef = React.useRef(null);
      const chapterTokenRef = React.useRef(0);
      const chapterCacheRef = React.useRef(new Map());
      const pendingSaveRef = React.useRef(null);
      const saveTimerRef = React.useRef(null);
      const lastAutoRef = React.useRef(novel.autoSeconds > 0 ? novel.autoSeconds : 5);
      const manualSwitchRef = React.useRef(null);
      const actionsRef = React.useRef({});
      const lineHeight = novelLineHeight(novel.fontSize);
      const bookIdRef = React.useRef(bookId);
      const chapterRef = React.useRef(chapter);
      const positionRef = React.useRef(position);
      const expandedRef = React.useRef(expanded);
      const libraryOpenRef = React.useRef(libraryOpen);
      const loadingRef = React.useRef(loadingChapter);

      const activeItem = library.items.find((item) => item.id === bookId)
        ?? library.items.find((item) => item.id === library.activeId)
        ?? library.items[0]
        ?? null;
      const currentItem = library.items.find((item) => item.id === bookId) ?? null;
      const percent = novelPercentOf(currentItem ?? activeItem, position?.chapterIndex ?? 0, position?.offset ?? 0);
      const selectedIndex = Math.max(0, library.items.findIndex((item) => item.id === selectedBookId));
      const selectedItem = library.items[selectedIndex] ?? null;

      if (novel.autoSeconds > 0) lastAutoRef.current = novel.autoSeconds;
      bookIdRef.current = bookId;
      chapterRef.current = chapter;
      positionRef.current = position;
      expandedRef.current = expanded;
      libraryOpenRef.current = libraryOpen;
      loadingRef.current = loadingChapter;

      const flushSave = React.useCallback((keepalive = false) => {
        const pending = pendingSaveRef.current;
        pendingSaveRef.current = null;
        if (saveTimerRef.current !== null) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        if (pending === null) return;
        void saveProgressApi(pending.id, pending.chapterIndex, pending.offset, keepalive).catch(() => {});
      }, []);

      const scheduleSave = React.useCallback((id, chapterIndex, offset) => {
        if (typeof id !== 'string' || id === '') return;
        pendingSaveRef.current = { id, chapterIndex, offset };
        if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveTimerRef.current = null;
          flushSave(false);
        }, 350);
      }, [flushSave]);

      const captureAnchor = React.useCallback(() => {
        const element = viewportRef.current;
        if (element !== null) {
          const offset = offsetAtViewportTop(element, lineHeight);
          if (offset !== null) anchorRef.current = offset;
        }
        return anchorRef.current;
      }, [lineHeight]);

      const applyPending = React.useCallback(() => {
        const element = viewportRef.current;
        if (element === null) return;
        const current = chapterRef.current;
        const pending = pendingRef.current;
        if (pending === null || current === null) return;
        if (pending.bookId !== bookIdRef.current || pending.chapterIndex !== current.chapterIndex) return;
        if (element.clientHeight <= 0) return;
        pendingRef.current = null;
        if (pending.edge === 'end') {
          element.scrollTop = maxAlignedScroll(element, lineHeight);
        } else {
          scrollToNovelOffset(element, pending.offset, lineHeight);
        }
        const offset = offsetAtViewportTop(element, lineHeight);
        if (pending.edge === 'end' && offset !== null) {
          anchorRef.current = offset;
          setPosition((previous) => {
            if (previous !== null && previous.chapterIndex === current.chapterIndex && previous.offset === offset) return previous;
            return { chapterIndex: current.chapterIndex, offset };
          });
        }
        if (pending.save === true) {
          scheduleSave(bookIdRef.current, current.chapterIndex, pending.edge === 'end' && offset !== null ? offset : pending.offset);
        }
      }, [lineHeight, scheduleSave]);

      const loadChapter = React.useCallback(async (id, index, offset, edge = 'anchor', save = false) => {
        if (typeof id !== 'string' || id === '') return;
        const token = ++chapterTokenRef.current;
        const cacheKey = `${id}:${index}`;
        flushSave();
        setLoadingChapter(true);
        setError(null);
        try {
          let data = chapterCacheRef.current.get(cacheKey);
          if (data === undefined) {
            data = await fetchChapterApi(id, index);
            chapterCacheRef.current.set(cacheKey, data);
            while (chapterCacheRef.current.size > 24) {
              const oldest = chapterCacheRef.current.keys().next().value;
              if (oldest === undefined) break;
              chapterCacheRef.current.delete(oldest);
            }
          }
          if (token !== chapterTokenRef.current || bookIdRef.current !== id) return;
          const textLength = typeof data.text === 'string' ? data.text.length : 0;
          const target = edge === 'end' ? textLength : Math.max(0, Math.min(textLength, Math.trunc(Number(offset) || 0)));
          chapterRef.current = data;
          setChapter(data);
          setPosition({ chapterIndex: data.chapterIndex, offset: target });
          anchorRef.current = target;
          pendingRef.current = {
            bookId: id,
            chapterIndex: data.chapterIndex,
            offset: target,
            edge: edge === 'end' ? 'end' : 'anchor',
            save,
          };
          setLoadingChapter(false);
          setRestoreNonce((value) => value + 1);
        } catch (reason) {
          if (token !== chapterTokenRef.current) return;
          setLoadingChapter(false);
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      }, [flushSave]);

      // Keep the local book selection in step with the host shelf. A manual
      // switch holds the target until the host has acknowledged it.
      React.useEffect(() => {
        if (library.loading) return;
        const desired = library.activeId ?? library.items[0]?.id ?? null;
        if (desired === bookId) {
          if (manualSwitchRef.current === desired) manualSwitchRef.current = null;
          return;
        }
        if (manualSwitchRef.current !== null && manualSwitchRef.current !== desired) return;
        setBookId(desired);
      }, [library.loading, library.activeId, library.items, bookId]);

      // Load the first chapter when a different book becomes active.
      React.useEffect(() => {
        if (bookId === null) {
          setChapter(null);
          setPosition(null);
          setError(null);
          setLoadingChapter(false);
          return undefined;
        }
        const item = library.items.find((entry) => entry.id === bookId);
        if (item === undefined) return undefined;
        const progress = item.progress ?? { chapterIndex: 0, offset: 0 };
        setChapter(null);
        setPosition(progress);
        anchorRef.current = progress.offset ?? 0;
        void loadChapter(bookId, progress.chapterIndex ?? 0, progress.offset ?? 0, 'anchor');
        return undefined;
      }, [bookId]);

      React.useLayoutEffect(() => {
        if (libraryOpen) return;
        applyPending();
      }, [applyPending, chapter, expanded, libraryOpen, novel.fontSize, novel.linesPerPage, restoreNonce]);

      // A style change does not move the stored anchor; restore the same
      // character after the browser has reflowed the text.
      const styleKey = `${novel.fontSize}:${novel.linesPerPage}`;
      const previousStyleRef = React.useRef(styleKey);
      React.useEffect(() => {
        if (previousStyleRef.current === styleKey) return;
        previousStyleRef.current = styleKey;
        if (chapterRef.current === null) return;
        pendingRef.current = {
          bookId: bookIdRef.current,
          chapterIndex: chapterRef.current.chapterIndex,
          offset: anchorRef.current,
          edge: 'anchor',
        };
        setRestoreNonce((value) => value + 1);
      }, [styleKey]);

      // Width changes (resize / responsive row) alter line breaks. Re-anchor
      // to the last known character rather than to a page number.
      React.useEffect(() => {
        const element = viewportRef.current;
        if (element === null || typeof ResizeObserver !== 'function') return undefined;
        let width = element.clientWidth;
        const observer = new ResizeObserver(() => {
          if (element.clientWidth === width || element.clientWidth <= 0) return;
          width = element.clientWidth;
          if (chapterRef.current === null || libraryOpenRef.current) return;
          pendingRef.current = {
            bookId: bookIdRef.current,
            chapterIndex: chapterRef.current.chapterIndex,
            offset: anchorRef.current,
            edge: 'anchor',
          };
          setRestoreNonce((value) => value + 1);
        });
        observer.observe(element);
        return () => observer.disconnect();
      }, [chapter, expanded, libraryOpen, novel.fontSize, novel.linesPerPage]);

      React.useEffect(() => {
        const onPageHide = () => flushSave(true);
        window.addEventListener('pagehide', onPageHide);
        return () => {
          window.removeEventListener('pagehide', onPageHide);
          flushSave(true);
        };
      }, [flushSave]);

      const progressToHost = React.useCallback(() => {
        const current = chapterRef.current;
        const element = viewportRef.current;
        if (current === null || element === null) return;
        const offset = offsetAtViewportTop(element, lineHeight);
        if (offset === null) return;
        anchorRef.current = offset;
        setPosition((previous) => {
          if (previous !== null && previous.chapterIndex === current.chapterIndex && previous.offset === offset) return previous;
          return { chapterIndex: current.chapterIndex, offset };
        });
        scheduleSave(bookIdRef.current, current.chapterIndex, offset);
      }, [lineHeight, scheduleSave]);

      const advance = React.useCallback((lines, fromAuto = false) => {
        const current = chapterRef.current;
        const element = viewportRef.current;
        if (current === null || element === null || loadingRef.current || libraryOpenRef.current) return;
        const result = scrollNovelByLines(element, lines, lineHeight);
        if (result === 'end') {
          if (current.chapterIndex + 1 < current.chapterCount) {
            void loadChapter(bookIdRef.current, current.chapterIndex + 1, 0, 'anchor', true);
          }
          return;
        }
        if (result === 'start') {
          if (current.chapterIndex > 0) {
            void loadChapter(bookIdRef.current, current.chapterIndex - 1, 0, 'end', true);
          }
          return;
        }
        if (result === 'ok') progressToHost();
      }, [lineHeight, loadChapter, progressToHost]);

      const pageStep = React.useCallback(() => (expandedRef.current ? novel.linesPerPage : 1), [novel.linesPerPage]);

      // currentItemRef is assigned here so retry sees the latest shelf item
      // without making every callback depend on the whole library list.
      const currentItemRef = React.useRef(currentItem);
      currentItemRef.current = currentItem;

      const goNextPage = React.useCallback(() => {
        advance(pageStep(), false);
      }, [advance, pageStep]);

      const goPrevPage = React.useCallback(() => {
        advance(-pageStep(), false);
      }, [advance, pageStep]);

      const goNextChapter = React.useCallback(() => {
        const current = chapterRef.current;
        if (current === null || current.chapterIndex + 1 >= current.chapterCount) return;
        void loadChapter(bookIdRef.current, current.chapterIndex + 1, 0, 'anchor', true);
      }, [loadChapter]);

      const goPrevChapter = React.useCallback(() => {
        const current = chapterRef.current;
        if (current === null || current.chapterIndex <= 0) return;
        void loadChapter(bookIdRef.current, current.chapterIndex - 1, 0, 'anchor', true);
      }, [loadChapter]);

      const openBook = React.useCallback(async (item) => {
        if (item === null || item === undefined) return;
        if (item.id === bookIdRef.current) {
          setLibraryOpen(false);
          pendingRef.current = {
            bookId: item.id,
            chapterIndex: chapterRef.current?.chapterIndex ?? item.progress?.chapterIndex ?? 0,
            offset: anchorRef.current,
            edge: 'anchor',
          };
          setRestoreNonce((value) => value + 1);
          return;
        }
        flushSave();
        manualSwitchRef.current = item.id;
        setLibraryOpen(false);
        setBookId(item.id);
        setChapter(null);
        setPosition(item.progress ?? { chapterIndex: 0, offset: 0 });
        setError(null);
        try {
          await openBookApi(item.id);
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : String(reason));
        } finally {
          void library.reload();
        }
      }, [flushSave, library]);

      const switchBook = React.useCallback((delta) => {
        const items = library.items;
        if (items.length === 0) return;
        const currentIndex = Math.max(0, items.findIndex((item) => item.id === bookIdRef.current));
        const target = items[(currentIndex + delta + items.length) % items.length];
        void openBook(target);
      }, [library.items, openBook]);

      const closeLibrary = React.useCallback(() => {
        if (!libraryOpenRef.current) return;
        pendingRef.current = {
          bookId: bookIdRef.current,
          chapterIndex: chapterRef.current?.chapterIndex ?? 0,
          offset: anchorRef.current,
          edge: 'anchor',
        };
        setLibraryOpen(false);
        setRestoreNonce((value) => value + 1);
      }, []);

      const openLibrary = React.useCallback(() => {
        captureAnchor();
        setSelectedBookId((previous) => previous ?? bookIdRef.current ?? library.items[0]?.id ?? null);
        pendingRef.current = {
          bookId: bookIdRef.current,
          chapterIndex: chapterRef.current?.chapterIndex ?? 0,
          offset: anchorRef.current,
          edge: 'anchor',
        };
        setExpanded(true);
        setLibraryOpen(true);
        requestAnimationFrame(() => rootRef.current?.focus());
      }, [captureAnchor, library.items]);

      const toggleLibrary = React.useCallback(() => {
        if (libraryOpenRef.current) closeLibrary();
        else openLibrary();
      }, [closeLibrary, openLibrary]);

      const toggleExpanded = React.useCallback(() => {
        const next = !expandedRef.current;
        captureAnchor();
        setLibraryOpen(false);
        if (chapterRef.current !== null) {
          pendingRef.current = {
            bookId: bookIdRef.current,
            chapterIndex: chapterRef.current.chapterIndex,
            offset: anchorRef.current,
            edge: 'anchor',
          };
        }
        setExpanded(next);
      }, [captureAnchor]);

      const toggleAuto = React.useCallback(() => {
        const current = novel.autoSeconds;
        const next = current > 0 ? 0 : (lastAutoRef.current || 5);
        updateConfig({
          ...config,
          apps: {
            ...config.apps,
            novel: { ...config.apps.novel, autoSeconds: next },
          },
        });
      }, [config, novel.autoSeconds]);

      const retry = React.useCallback(() => {
        if (library.error !== null) {
          void library.reload();
          return;
        }
        if (currentItemRef.current !== null) {
          void loadChapter(bookIdRef.current, positionRef.current?.chapterIndex ?? currentItemRef.current.progress.chapterIndex ?? 0, positionRef.current?.offset ?? currentItemRef.current.progress.offset ?? 0, 'anchor');
        }
      }, [library, loadChapter]);

      const moveSelection = React.useCallback((delta) => {
        const items = library.items;
        if (items.length === 0) return;
        const index = items.findIndex((item) => item.id === selectedBookId);
        const base = index < 0 ? 0 : index;
        const next = (base + delta + items.length) % items.length;
        setSelectedBookId(items[next].id);
      }, [library.items, selectedBookId]);

      const openSelected = React.useCallback(() => {
        const item = library.items.find((entry) => entry.id === selectedBookId) ?? library.items[selectedIndex];
        if (item !== undefined) void openBook(item);
      }, [library.items, openBook, selectedBookId, selectedIndex]);

      React.useEffect(() => {
        if (selectedBookId !== null && library.items.some((item) => item.id === selectedBookId)) return;
        setSelectedBookId(bookId ?? library.items[0]?.id ?? null);
      }, [bookId, library.items, selectedBookId]);

      actionsRef.current = {
        next: goNextPage,
        prev: goPrevPage,
        nextChapter: goNextChapter,
        prevChapter: goPrevChapter,
        nextBook: () => switchBook(1),
        prevBook: () => switchBook(-1),
        library: toggleLibrary,
        auto: toggleAuto,
        toggle: toggleExpanded,
        wheel: (delta) => advance(delta > 0 ? 1 : -1, false),
        canWheel: () => !libraryOpenRef.current,
      };

      React.useEffect(() => {
        const controller = {
          next: () => actionsRef.current.next?.(),
          prev: () => actionsRef.current.prev?.(),
          nextPage: () => actionsRef.current.next?.(),
          prevPage: () => actionsRef.current.prev?.(),
          nextChapter: () => actionsRef.current.nextChapter?.(),
          prevChapter: () => actionsRef.current.prevChapter?.(),
          nextBook: () => actionsRef.current.nextBook?.(),
          prevBook: () => actionsRef.current.prevBook?.(),
          library: () => actionsRef.current.library?.(),
          auto: () => actionsRef.current.auto?.(),
          toggle: () => actionsRef.current.toggle?.(),
        };
        appControllers.set(sessionId, controller);
        return () => {
          if (appControllers.get(sessionId) === controller) appControllers.delete(sessionId);
        };
      }, [sessionId]);

      // Auto turn advances one visual line; a page in expanded mode is still
      // readable at a steady pace instead of jumping ten lines at once.
      React.useEffect(() => {
        if (!(novel.autoSeconds > 0) || bookId === null || libraryOpen) return undefined;
        const timer = setInterval(() => {
          if (document.visibilityState === 'hidden' || libraryOpenRef.current) return;
          actionsRef.current.wheel?.(1);
        }, novel.autoSeconds * 1000);
        return () => clearInterval(timer);
      }, [bookId, libraryOpen, novel.autoSeconds]);

      // Wheel over the row moves one visual line, like a small overlay reader.
      React.useEffect(() => {
        const element = rootRef.current;
        if (element === null) return undefined;
        let last = 0;
        const onWheel = (event) => {
          if (event.ctrlKey || event.metaKey) return;
          if (libraryOpenRef.current) return;
          if (viewportRef.current === null) return;
          event.preventDefault();
          const now = Date.now();
          if (now - last < 45) return;
          last = now;
          actionsRef.current.wheel?.(event.deltaY > 0 ? 1 : -1);
        };
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
      }, []);

      const onKeyDown = (event) => {
        if (event.defaultPrevented) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const target = event.target;
        if (target instanceof Element && target.closest('input, textarea, select, [contenteditable="true"]') !== null) return;
        if (target instanceof Element && target.closest('button') !== null && (event.key === ' ' || event.key === 'Enter')) return;
        const pageKey = event.key === 'ArrowRight' || event.key === 'ArrowLeft'
          || event.key === 'ArrowDown' || event.key === 'ArrowUp'
          || event.key === 'PageDown' || event.key === 'PageUp'
          || event.key === ' ' || event.key === 'j' || event.key === 'J'
          || event.key === 'k' || event.key === 'K';
        if (event.repeat && !pageKey) return;

        if (libraryOpen) {
          if (event.key === 'j' || event.key === 'J' || event.key === 'ArrowDown' || event.key === 'PageDown') {
            event.preventDefault();
            moveSelection(1);
          } else if (event.key === 'k' || event.key === 'K' || event.key === 'ArrowUp' || event.key === 'PageUp') {
            event.preventDefault();
            moveSelection(-1);
          } else if (event.key === 'Home') {
            event.preventDefault();
            if (library.items[0] !== undefined) setSelectedBookId(library.items[0].id);
          } else if (event.key === 'End') {
            event.preventDefault();
            const last = library.items[library.items.length - 1];
            if (last !== undefined) setSelectedBookId(last.id);
          } else if (event.key === 'Enter') {
            if (target instanceof Element && target.closest('button') !== null) return;
            event.preventDefault();
            openSelected();
          } else if (event.key === 'Escape' || event.key === 'l' || event.key === 'L') {
            event.preventDefault();
            closeLibrary();
          }
          return;
        }

        if (event.key === 'Escape') {
          if (expanded) {
            event.preventDefault();
            toggleExpanded();
          }
          return;
        }
        if (event.key === 'e' || event.key === 'E' || event.key === 'Enter') {
          if (target instanceof Element && target.closest('button') !== null) return;
          event.preventDefault();
          toggleExpanded();
          return;
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'j' || event.key === 'J' || (event.key === ' ' && !event.shiftKey)) {
          event.preventDefault();
          goNextPage();
          return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp' || event.key === 'PageUp' || event.key === 'k' || event.key === 'K' || (event.key === ' ' && event.shiftKey)) {
          event.preventDefault();
          goPrevPage();
          return;
        }
        if (event.key === 'n' || event.key === 'N') {
          event.preventDefault();
          goNextChapter();
          return;
        }
        if (event.key === 'p' || event.key === 'P') {
          event.preventDefault();
          goPrevChapter();
          return;
        }
        if (event.key === '[' || event.key === ']') {
          event.preventDefault();
          switchBook(event.key === ']' ? 1 : -1);
          return;
        }
        if (event.key === 'l' || event.key === 'L') {
          event.preventDefault();
          toggleLibrary();
          return;
        }
        if (event.key === 'a' || event.key === 'A') {
          event.preventDefault();
          toggleAuto();
        }
      };

      const headerText = libraryOpen
        ? t('novel.library')
        : expanded
          ? (currentItem === null ? t('novel.empty') : `${novelBookSubtitle(currentItem)} · ${chapter?.chapterTitle ?? t('novel.noChapter')}`)
          : null;
      const showPercent = currentItem !== null && !libraryOpen;

      const headerViewport = !expanded && !libraryOpen && chapter !== null
        ? h('span', {
          ref: viewportRef,
          className: 'dfish-novel-viewport dfish-novel-line',
          style: { fontSize: `${novel.fontSize}px`, lineHeight: `${lineHeight}px`, height: `${lineHeight}px` },
          'aria-hidden': true,
        }, chapter.text)
        : null;

      const header = h('div', {
        ref: rootRef,
        tabIndex: 0,
        className: 'dfish-root dfish-novel-root',
        'data-expanded': expanded ? 'true' : undefined,
        'data-session': session.app ?? undefined,
        onKeyDown,
        role: 'group',
        'aria-label': t('novel.a11y'),
      },
        h('div', { className: 'dfish-header dfish-novel-header' },
          h('div', {
            className: 'dfish-toggle',
            title: expanded ? t('dock.focus') : undefined,
            onClick: () => rootRef.current?.focus(),
          },
            h('span', { className: 'dfish-leading' }, h(IconThink, { size: 14 })),
            h('span', { className: 'dfish-title' }, t('dock.title')),
            h('span', { className: 'dfish-sep', 'aria-hidden': true }),
            headerViewport !== null
              ? headerViewport
              : h('span', { className: 'dfish-summary' },
                h('span', { className: 'dfish-summary-text' }, headerText ?? (
                  library.loading
                    ? t('novel.loading')
                    : library.error !== null
                      ? t('novel.libraryError')
                      : library.items.length === 0
                        ? t('novel.empty')
                        : error ?? t('novel.loadingChapter')
                )))),
          showPercent ? h('span', { className: 'dfish-novel-percent' }, novelPercentText(percent)) : null,
          h('span', { className: 'dfish-tools' },
            h('button', {
              type: 'button',
              className: 'dfish-iconbtn',
              title: t('novel.library'),
              'aria-label': t('novel.library'),
              onClick: (event) => {
                event.stopPropagation();
                toggleLibrary();
              },
            }, h(IconBook, { size: 13 }))),
          h('button', {
            type: 'button',
            className: 'dfish-chevronbtn',
            'aria-expanded': expanded,
            title: expanded ? t('dock.collapse') : t('dock.expand'),
            onClick: (event) => {
              event.stopPropagation();
              toggleExpanded();
            },
          }, h(IconChevron, { size: 11 }))),
        expanded ? h('div', { className: 'dfish-body dfish-novel-body', onClick: () => rootRef.current?.focus() },
          libraryOpen ? renderNovelLibrary() : renderNovelReader()) : null);

      function renderNovelLibrary() {
        return h(React.Fragment, null,
          h('div', { className: 'dfish-novel-library-head' },
            h('span', { className: 'dfish-novel-library-title' }, t('novel.library')),
            h('span', { className: 'dfish-novel-library-count' }, novelBookCount(t, library.items.length))),
          library.items.length === 0
            ? h('div', { className: 'dfish-novel-empty' },
              h('div', null, t('novel.noBooks')),
              h('div', { className: 'dfish-novel-empty-hint' }, t('novel.importHint')))
            : h('div', { className: 'dfish-novel-library-list' },
              library.items.map((item) => {
                const rowChapter = item.id === bookId && position !== null ? position.chapterIndex : (item.progress?.chapterIndex ?? 0);
                const rowOffset = item.id === bookId && position !== null ? position.offset : (item.progress?.offset ?? 0);
                return h('button', {
                  type: 'button',
                  key: item.id,
                  className: 'dfish-novel-book',
                  'data-active': item.id === bookId ? 'true' : undefined,
                  'data-selected': item.id === selectedBookId ? 'true' : undefined,
                  'data-book-id': item.id,
                  onClick: () => void openBook(item),
                  onMouseEnter: () => setSelectedBookId(item.id),
                },
                  h('span', { className: 'dfish-novel-book-main' },
                    h('span', { className: 'dfish-novel-book-title' }, item.title),
                    h('span', { className: 'dfish-novel-book-meta' },
                      `${String(item.format ?? '').toUpperCase()} · ${item.chapterTitles?.[rowChapter] ?? t('novel.noChapter')} · ${novelPercentText(novelPercentOf(item, rowChapter, rowOffset))}`)),
                  h('span', { className: 'dfish-novel-book-open' }, item.id === bookId ? t('novel.opened') : t('novel.open')));
              })),
          h('div', { className: 'dfish-novel-foot' },
            h('span', { className: 'dfish-keys' },
              h('kbd', { className: 'dfish-kbd' }, 'J/K'), ' ', h('span', null, t('novel.key.select')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, 'Enter'), ' ', h('span', null, t('novel.key.open')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, 'Esc'), ' ', h('span', null, t('novel.key.back')))));
      }

      function renderNovelReader() {
        if (library.error !== null) {
          return h(React.Fragment, null,
            h('div', { className: 'dfish-novel-empty' }, h('div', null, t('novel.libraryError')), h('div', { className: 'dfish-novel-empty-hint' }, library.error)),
            h('div', { className: 'dfish-novel-foot' },
              h('button', { type: 'button', className: 'dfish-btn dfish-btn-small', onClick: retry }, t('novel.retry'))));
        }
        if (currentItem === null) {
          return h('div', { className: 'dfish-novel-empty' },
            h('div', null, library.loading ? t('novel.loading') : t('novel.noBooks')),
            h('div', { className: 'dfish-novel-empty-hint' }, t('novel.importHint')));
        }
        if (error !== null && chapter === null) {
          return h(React.Fragment, null,
            h('div', { className: 'dfish-novel-empty' }, h('div', null, t('novel.chapterError')), h('div', { className: 'dfish-novel-empty-hint' }, error)),
            h('div', { className: 'dfish-novel-foot' },
              h('button', { type: 'button', className: 'dfish-btn dfish-btn-small', onClick: retry }, t('novel.retry'))));
        }
        if (chapter === null) {
          return h('div', { className: 'dfish-novel-empty' }, t('novel.loadingChapter'));
        }
        return h(React.Fragment, null,
          h('div', { className: 'dfish-novel-meta' },
            h('span', { className: 'dfish-novel-meta-book' }, novelBookSubtitle(currentItem)),
            h('span', { className: 'dfish-novel-meta-chapter' }, chapter.chapterTitle),
            h('span', { className: 'dfish-novel-meta-percent' }, novelPercentText(percent))),
          h('div', {
            ref: viewportRef,
            className: 'dfish-novel-viewport dfish-novel-page',
            style: { fontSize: `${novel.fontSize}px`, lineHeight: `${lineHeight}px`, height: `${lineHeight * novel.linesPerPage}px` },
            'aria-hidden': true,
          }, chapter.text),
          h('div', { className: 'dfish-novel-foot' },
            h('span', { className: 'dfish-keys' },
              h('kbd', { className: 'dfish-kbd' }, 'J/K'), ' ', h('span', null, t('novel.key.page')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, '[ ]'), ' ', h('span', null, t('novel.key.book')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, 'N/P'), ' ', h('span', null, t('novel.key.chapter')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, 'L'), ' ', h('span', null, t('novel.key.library')),
              h('span', { className: 'dfish-keysep', 'aria-hidden': true }, '·'),
              h('kbd', { className: 'dfish-kbd' }, 'A'), ' ', h('span', null, t('novel.key.auto')))));
      }

      return header;
    }

    // ---------------------------------------------------------------------
    // Settings page
    // ---------------------------------------------------------------------

    function ShortcutRow({ action, combo, recording, tr, onToggle }) {
      return h('div', {
        className: 'dfish-shortcut-row',
        'data-recording': recording ? 'true' : undefined,
      },
        h('span', { className: 'dfish-rowline-copy' },
          h('span', { className: 'dfish-rowline-title' }, tr(`settings.shortcuts.${action}.title`)),
          h('span', { className: 'dfish-rowline-desc' }, tr(`settings.shortcuts.${action}.desc`))),
        h('span', { className: 'dfish-shortcut-control' },
          h('span', { className: 'dfish-combo', 'aria-live': 'polite' },
            recording
              ? tr('settings.shortcuts.recording')
              : (combo === '' ? tr('settings.shortcuts.unbound') : formatCombo(combo))),
          h('button', {
            type: 'button',
            className: 'dfish-btn dfish-btn-small',
            onClick: () => onToggle(action),
          }, recording ? tr('settings.shortcuts.cancel') : tr('settings.shortcuts.record'))));
    }

    function SettingsPage(props) {
      const { t: providedT } = props;
      const tr = providedT || fallbackT;
      const cfg = useConfig();
      const stock = cfg.apps.stock;
      const novel = cfg.apps.novel;
      const symbols = stock.symbols;
      const info = useSymbolInfo(symbols);
      const novelLibrary = useNovelLibrary();
      const [draft, setDraft] = React.useState('');
      const [addError, setAddError] = React.useState(null);
      const [confirmReset, setConfirmReset] = React.useState(false);
      const [activeTab, setActiveTab] = React.useState('global');
      const [recordingKey, setRecordingKey] = React.useState(null);
      const [shortcutError, setShortcutError] = React.useState(null);
      const [importing, setImporting] = React.useState(null);
      const [importErrors, setImportErrors] = React.useState([]);
      const [bookConfirm, setBookConfirm] = React.useState(null);
      const captureRef = React.useRef(null);
      const tabRefs = React.useRef({});
      const fileInputRef = React.useRef(null);

      const tabs = [
        { id: 'global', labelKey: 'settings.tab.global' },
        ...FISH_APPS.filter((app) => app.enabled).map((app) => ({ id: app.id, labelKey: app.tabLabelKey })),
      ];
      const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : 'global';
      const stockApp = FISH_APPS.find((app) => app.id === 'stock');

      React.useEffect(() => {
        if (!confirmReset) return undefined;
        const timer = setTimeout(() => setConfirmReset(false), 3000);
        return () => clearTimeout(timer);
      }, [confirmReset]);

      React.useEffect(() => {
        if (bookConfirm === null) return undefined;
        const timer = setTimeout(() => setBookConfirm(null), 3000);
        return () => clearTimeout(timer);
      }, [bookConfirm]);

      React.useEffect(() => () => {
        const handler = captureRef.current;
        captureRef.current = null;
        endShortcutCapture(handler);
      }, []);

      const stopShortcutRecording = () => {
        const handler = captureRef.current;
        captureRef.current = null;
        endShortcutCapture(handler);
        setRecordingKey(null);
        setShortcutError(null);
      };

      const activateTab = (tabId, focus = false) => {
        stopShortcutRecording();
        setConfirmReset(false);
        setActiveTab(tabId);
        if (focus) {
          requestAnimationFrame(() => tabRefs.current[tabId]?.focus());
        }
      };

      const onTabKeyDown = (event) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const index = tabs.findIndex((tab) => tab.id === currentTab);
        if (index < 0) return;
        let nextIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else nextIndex = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault();
        activateTab(tabs[nextIndex].id, true);
      };

      const updateStock = (patch) => {
        const current = getConfig();
        updateConfig({
          ...current,
          apps: {
            ...current.apps,
            stock: { ...current.apps.stock, ...patch },
          },
        });
      };

      const updateNovel = (patch) => {
        const current = getConfig();
        updateConfig({
          ...current,
          apps: {
            ...current.apps,
            novel: { ...current.apps.novel, ...patch },
          },
        });
      };

      const addSymbol = (raw) => {
        const symbol = normalizeSymbol(raw);
        if (symbol === undefined) {
          setAddError('invalid');
          return;
        }
        const current = getConfig().apps.stock.symbols;
        if (current.includes(symbol)) {
          setAddError('duplicate');
          return;
        }
        if (current.length >= MAX_SYMBOLS) {
          setAddError('full');
          return;
        }
        updateStock({ symbols: [...current, symbol] });
        setDraft('');
        setAddError(null);
      };

      const removeSymbol = (symbol) => {
        updateStock({ symbols: getConfig().apps.stock.symbols.filter((item) => item !== symbol) });
      };

      const moveSymbol = (index, delta) => {
        const current = getConfig().apps.stock.symbols.slice();
        const target = index + delta;
        if (target < 0 || target >= current.length) return;
        const [item] = current.splice(index, 1);
        current.splice(target, 0, item);
        updateStock({ symbols: current });
      };

      const resetStock = () => {
        if (!confirmReset) {
          setConfirmReset(true);
          return;
        }
        const current = getConfig();
        const defaults = defaultConfig();
        updateConfig({
          ...current,
          apps: {
            ...current.apps,
            stock: {
              ...defaults.apps.stock,
              shortcuts: current.apps.stock.shortcuts,
            },
          },
        });
        setConfirmReset(false);
        setDraft('');
        setAddError(null);
      };

      const resetNovel = () => {
        if (!confirmReset) {
          setConfirmReset(true);
          return;
        }
        const current = getConfig();
        const defaults = defaultConfig();
        updateConfig({
          ...current,
          apps: {
            ...current.apps,
            novel: {
              ...defaults.apps.novel,
              shortcuts: current.apps.novel.shortcuts,
            },
          },
        });
        setConfirmReset(false);
      };

      const updateShortcut = (scope, action, combo) => {
        const current = getConfig();
        if (scope === 'global') {
          updateConfig({
            ...current,
            shortcuts: { ...current.shortcuts, [action]: combo },
          });
          return;
        }
        if (scope !== 'stock' && scope !== 'novel') return;
        updateConfig({
          ...current,
          apps: {
            ...current.apps,
            [scope]: {
              ...current.apps[scope],
              shortcuts: { ...current.apps[scope].shortcuts, [action]: combo },
            },
          },
        });
      };

      const findShortcutConflict = (scope, action, combo) => {
        const current = getConfig();
        const entries = [];
        for (const candidate of GLOBAL_SHORTCUT_ACTIONS) {
          if (scope === 'global' && candidate === action) continue;
          entries.push({ scope: 'global', action: candidate, combo: current.shortcuts[candidate] });
        }
        const appScopes = scope === 'global' ? ['stock', 'novel'] : [scope];
        for (const appScope of appScopes) {
          if (appScope !== 'stock' && appScope !== 'novel') continue;
          for (const candidate of APP_SHORTCUT_ACTIONS[appScope]) {
            if (scope === appScope && candidate === action) continue;
            entries.push({ scope: appScope, action: candidate, combo: current.apps[appScope].shortcuts[candidate] });
          }
        }
        return entries.find((entry) => entry.combo === combo) ?? null;
      };

      const startShortcutRecording = (scope, action) => {
        const key = `${scope}:${action}`;
        if (recordingKey === key) {
          stopShortcutRecording();
          return;
        }
        stopShortcutRecording();
        const handler = (event) => {
          if (event.key === 'Escape') {
            stopShortcutRecording();
            return true;
          }
          if (isModifierEvent(event)) return true;
          if ((event.code === 'Backspace' || event.code === 'Delete')
            && !event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
            updateShortcut(scope, action, '');
            captureRef.current = null;
            endShortcutCapture(handler);
            setRecordingKey(null);
            setShortcutError(null);
            return true;
          }
          const combo = comboFromEvent(event);
          if (combo === null || !validShortcut(combo)) {
            setShortcutError({ scope, type: 'invalid' });
            return true;
          }
          const conflict = findShortcutConflict(scope, action, combo);
          if (conflict !== null) {
            setShortcutError({ scope, type: 'conflict', action: conflict.action });
            return true;
          }
          updateShortcut(scope, action, combo);
          captureRef.current = null;
          endShortcutCapture(handler);
          setRecordingKey(null);
          setShortcutError(null);
          return true;
        };
        captureRef.current = handler;
        beginShortcutCapture(handler);
        setRecordingKey(key);
        setShortcutError(null);
      };

      const resetShortcuts = (scope) => {
        stopShortcutRecording();
        const current = getConfig();
        if (scope === 'global') {
          updateConfig({ ...current, shortcuts: { ...DEFAULT_GLOBAL_SHORTCUTS } });
          return;
        }
        if (scope !== 'stock' && scope !== 'novel') return;
        updateConfig({
          ...current,
          apps: {
            ...current.apps,
            [scope]: {
              ...current.apps[scope],
              shortcuts: { ...DEFAULT_APP_SHORTCUTS[scope] },
            },
          },
        });
      };

      const importNovelFiles = async (event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (files.length === 0) return;
        setImporting({ done: 0, total: files.length });
        setImportErrors([]);
        const errors = [];
        for (let index = 0; index < files.length; index += 1) {
          try {
            await importBookApi(files[index]);
          } catch (error) {
            errors.push(`${files[index].name}：${error instanceof Error ? error.message : String(error)}`);
          }
          setImporting({ done: index + 1, total: files.length });
        }
        setImporting(null);
        setImportErrors(errors);
        notifyNovelChanged();
        await novelLibrary.reload();
      };

      const openNovelBook = async (id) => {
        try {
          await openBookApi(id);
          notifyNovelChanged();
          await novelLibrary.reload();
        } catch (error) {
          setImportErrors([error instanceof Error ? error.message : String(error)]);
        }
      };

      const removeNovelBook = async (id) => {
        if (bookConfirm !== id) {
          setBookConfirm(id);
          return;
        }
        setBookConfirm(null);
        try {
          await deleteBookApi(id);
          notifyNovelChanged();
          await novelLibrary.reload();
        } catch (error) {
          setImportErrors([error instanceof Error ? error.message : String(error)]);
        }
      };

      const errorText = addError === null ? null : tr(`settings.watchlist.${addError}`);
      const shortcutErrorText = (scope) => shortcutError === null || shortcutError.scope !== scope
        ? null
        : shortcutError.type === 'conflict'
          ? tr('settings.shortcuts.conflict', { action: tr(`settings.shortcuts.${shortcutError.action}.title`) })
          : tr('settings.shortcuts.invalid');

      const renderGlobal = () => h(React.Fragment, null,
        h('p', { className: 'dfish-panel-lede' }, tr('settings.global.description')),
        h('section', { className: 'dfish-section dfish-section-first' },
          h('div', { className: 'dfish-section-head' },
            h('h3', null, tr('settings.shortcuts.title')),
            h('p', null, tr('settings.shortcuts.description'))),
          h('div', { className: 'dfish-shortcut-list' },
            GLOBAL_SHORTCUT_ACTIONS.map((action) => h(ShortcutRow, {
              key: action,
              action,
              combo: cfg.shortcuts[action],
              recording: recordingKey === `global:${action}`,
              tr,
              onToggle: () => startShortcutRecording('global', action),
            }))),
          shortcutErrorText('global') === null ? null : h('p', { className: 'dfish-form-error', role: 'alert' }, shortcutErrorText('global')),
          h('div', { className: 'dfish-shortcuts-foot' },
            h('span', { className: 'dfish-note' }, tr('settings.shortcuts.hint')),
            h('button', {
              type: 'button',
              className: 'dfish-btn dfish-btn-quiet',
              onClick: () => resetShortcuts('global'),
            }, tr('settings.shortcuts.reset')))));

      const renderStock = () => h(React.Fragment, null,
        h('div', { className: 'dfish-app' },
          h('span', { className: 'dfish-app-icon' }, h(AppIcon, { name: stockApp?.icon ?? 'chart' })),
          h('span', { className: 'dfish-app-body' },
            h('span', { className: 'dfish-app-title' }, tr('settings.app.stock.title')),
            h('span', { className: 'dfish-app-desc' }, tr('settings.app.stock.description')))),
        h('section', { className: 'dfish-section' },
          h('div', { className: 'dfish-section-head dfish-section-head-row' },
            h('div', null,
              h('h3', null, tr('settings.watchlist.title')),
              h('p', null, tr('settings.watchlist.description'))),
            h('span', { className: 'dfish-count' }, tr('settings.watchlist.count', { count: symbols.length }))),
          h('div', { className: 'dfish-input-row' },
            h('input', {
              className: 'dfish-input',
              value: draft,
              placeholder: tr('settings.watchlist.placeholder'),
              spellCheck: false,
              autoComplete: 'off',
              maxLength: 20,
              onChange: (event) => {
                setDraft(event.target.value);
                if (addError !== null) setAddError(null);
              },
              onKeyDown: (event) => {
                if (event.key !== 'Enter') return;
                if (event.nativeEvent?.isComposing) return;
                event.preventDefault();
                addSymbol(draft);
              },
            }),
            h('button', {
              type: 'button',
              className: 'dfish-btn dfish-btn-primary',
              onClick: () => addSymbol(draft),
            }, tr('settings.watchlist.add'))),
          errorText === null ? null : h('p', { className: 'dfish-form-error', role: 'alert' }, errorText),
          h('div', { className: 'dfish-presets' },
            h('span', { className: 'dfish-presets-label' }, tr('settings.quick')),
            PRESETS.map((preset) => h('button', {
              type: 'button',
              key: preset.symbol,
              className: 'dfish-chip',
              'data-added': symbols.includes(preset.symbol) ? 'true' : undefined,
              disabled: symbols.includes(preset.symbol),
              onClick: () => addSymbol(preset.symbol),
            }, tr(preset.labelKey)))),
          h('div', { className: 'dfish-list' },
            symbols.length === 0
              ? h('div', { className: 'dfish-list-empty' }, tr('settings.watchlist.empty'))
              : symbols.map((symbol, index) => h('div', { className: 'dfish-symbol', key: symbol },
                h('span', { className: 'dfish-symbol-code' }, symbol),
                h('span', { className: 'dfish-symbol-name' }, info.names[symbol] ?? (info.missing[symbol] ? tr('settings.watchlist.unknown') : '—')),
                h('span', { className: 'dfish-symbol-actions' },
                  h('button', {
                    type: 'button',
                    className: 'dfish-mini',
                    title: tr('settings.watchlist.moveUp'),
                    'aria-label': tr('settings.watchlist.moveUp'),
                    disabled: index === 0,
                    onClick: () => moveSymbol(index, -1),
                  }, '↑'),
                  h('button', {
                    type: 'button',
                    className: 'dfish-mini',
                    title: tr('settings.watchlist.moveDown'),
                    'aria-label': tr('settings.watchlist.moveDown'),
                    disabled: index === symbols.length - 1,
                    onClick: () => moveSymbol(index, 1),
                  }, '↓'),
                  h('button', {
                    type: 'button',
                    className: 'dfish-mini dfish-mini-danger',
                    title: tr('settings.watchlist.remove'),
                    'aria-label': tr('settings.watchlist.remove'),
                    onClick: () => removeSymbol(symbol),
                  }, '×')))))),
        h('section', { className: 'dfish-section' },
          h('div', { className: 'dfish-section-head' },
            h('h3', null, tr('settings.shortcuts.stock.title')),
            h('p', null, tr('settings.shortcuts.stock.description'))),
          h('div', { className: 'dfish-shortcut-list' },
            APP_SHORTCUT_ACTIONS.stock.map((action) => h(ShortcutRow, {
              key: action,
              action,
              combo: cfg.apps.stock.shortcuts[action],
              recording: recordingKey === `stock:${action}`,
              tr,
              onToggle: () => startShortcutRecording('stock', action),
            }))),
          shortcutErrorText('stock') === null ? null : h('p', { className: 'dfish-form-error', role: 'alert' }, shortcutErrorText('stock')),
          h('div', { className: 'dfish-shortcuts-foot' },
            h('span', { className: 'dfish-note' }, tr('settings.shortcuts.hint')),
            h('button', {
              type: 'button',
              className: 'dfish-btn dfish-btn-quiet',
              onClick: () => resetShortcuts('stock'),
            }, tr('settings.shortcuts.resetApp')))),
        h('section', { className: 'dfish-section' },
          h('div', { className: 'dfish-rowline' },
            h('span', { className: 'dfish-rowline-copy' },
              h('span', { className: 'dfish-rowline-title' }, tr('settings.refresh.title')),
              h('span', { className: 'dfish-rowline-desc' }, tr('settings.refresh.description'))),
            h('select', {
              className: 'dfish-select',
              value: String(stock.refreshMinutes),
              onChange: (event) => updateStock({ refreshMinutes: Number(event.target.value) }),
            }, REFRESH_OPTIONS.map((minutes) => h('option', {
              key: minutes,
              value: String(minutes),
            }, tr('settings.refresh.minutes', { count: minutes }))))),
          h('div', { className: 'dfish-rowline' },
            h('span', { className: 'dfish-rowline-copy' },
              h('span', { className: 'dfish-rowline-title' }, tr('settings.color.title')),
              h('span', { className: 'dfish-rowline-desc' }, tr('settings.color.description'))),
            h('select', {
              className: 'dfish-select',
              value: stock.colorMode,
              onChange: (event) => updateStock({ colorMode: event.target.value }),
            },
              h('option', { value: 'cn' }, tr('settings.color.cn')),
              h('option', { value: 'intl' }, tr('settings.color.intl')),
              h('option', { value: 'none' }, tr('settings.color.none'))))),
        h('div', { className: 'dfish-tab-footer' },
          h('button', {
            type: 'button',
            className: 'dfish-btn dfish-btn-quiet',
            onClick: resetStock,
          }, confirmReset ? tr('settings.resetConfirm') : tr('settings.reset'))));

      const renderNovel = () => h(React.Fragment, null,
        h('div', { className: 'dfish-app' },
          h('span', { className: 'dfish-app-icon' }, h(AppIcon, { name: 'book' })),
          h('span', { className: 'dfish-app-body' },
            h('span', { className: 'dfish-app-title' }, tr('settings.app.novel.title')),
            h('span', { className: 'dfish-app-desc' }, tr('settings.app.novel.description')))),
        h('section', { className: 'dfish-section' },
          h('div', { className: 'dfish-section-head dfish-section-head-row' },
            h('div', null,
              h('h3', null, tr('settings.novel.library.title')),
              h('p', null, tr('settings.novel.library.description'))),
            h('span', { className: 'dfish-count' }, novelBookCount(tr, novelLibrary.items.length))),
          h('div', { className: 'dfish-input-row dfish-novel-import-row' },
            h('input', {
              ref: fileInputRef,
              type: 'file',
              accept: '.txt,.epub,text/plain,application/epub+zip',
              multiple: true,
              style: { display: 'none' },
              onChange: importNovelFiles,
            }),
            h('button', {
              type: 'button',
              className: 'dfish-btn dfish-btn-primary',
              disabled: importing !== null,
              onClick: () => fileInputRef.current?.click(),
            }, importing === null
              ? tr('settings.novel.import')
              : tr('settings.novel.importing', { done: importing.done, total: importing.total })),
            h('span', { className: 'dfish-note dfish-novel-import-hint' }, tr('settings.novel.importHint'))),
          importErrors.length === 0 ? null : h('div', { className: 'dfish-form-error', role: 'alert' },
            importErrors.map((message) => h('div', { key: message }, message))),
          novelLibrary.error === null ? null : h('p', { className: 'dfish-form-error', role: 'alert' }, novelLibrary.error),
          novelLibrary.loading
            ? h('div', { className: 'dfish-list-empty' }, tr('settings.novel.loading'))
            : novelLibrary.items.length === 0
              ? h('div', { className: 'dfish-list-empty' }, tr('settings.novel.empty'))
              : h('div', { className: 'dfish-list dfish-novel-settings-list' },
                novelLibrary.items.map((item) => h('div', {
                  className: 'dfish-novel-settings-book',
                  key: item.id,
                  'data-active': item.id === novelLibrary.activeId ? 'true' : undefined,
                },
                  h('span', { className: 'dfish-novel-settings-main' },
                    h('span', { className: 'dfish-novel-settings-title' },
                      h('span', { className: 'dfish-novel-settings-name' }, item.title),
                      item.id === novelLibrary.activeId ? h('span', { className: 'dfish-badge', 'data-on': 'true' }, tr('settings.novel.active')) : null),
                    h('span', { className: 'dfish-novel-settings-meta' },
                      `${String(item.format ?? '').toUpperCase()} · ${novelChapterCount(tr, item.chapterCount)} · ${novelPercentText(novelPercentOf(item, item.progress?.chapterIndex ?? 0, item.progress?.offset ?? 0))} · ${item.chapterTitles?.[item.progress?.chapterIndex ?? 0] ?? tr('novel.noChapter')}`)),
                  h('span', { className: 'dfish-novel-settings-actions' },
                    h('button', {
                      type: 'button',
                      className: 'dfish-btn dfish-btn-small',
                      onClick: () => void openNovelBook(item.id),
                    }, tr('settings.novel.open')),
                    h('button', {
                      type: 'button',
                      className: 'dfish-btn dfish-btn-small dfish-btn-danger',
                      onClick: () => void removeNovelBook(item.id),
                    }, bookConfirm === item.id ? tr('settings.novel.confirmDelete') : tr('settings.novel.delete'))))))),
        h('section', { className: 'dfish-section' },
          h('div', { className: 'dfish-section-head' },
            h('h3', null, tr('settings.novel.reading.title')),
            h('p', null, tr('settings.novel.reading.description'))),
          h('div', { className: 'dfish-rowline' },
            h('span', { className: 'dfish-rowline-copy' },
              h('span', { className: 'dfish-rowline-title' }, tr('settings.novel.fontSize')),
              h('span', { className: 'dfish-rowline-desc' }, tr('settings.novel.fontSizeDescription'))),
            h('select', {
              className: 'dfish-select',
              value: String(novel.fontSize),
              onChange: (event) => updateNovel({ fontSize: Number(event.target.value) }),
            }, NOVEL_FONT_SIZES.map((size) => h('option', { key: size, value: String(size) }, tr('settings.novel.pixels', { count: size }))))),
          h('div', { className: 'dfish-rowline' },
            h('span', { className: 'dfish-rowline-copy' },
              h('span', { className: 'dfish-rowline-title' }, tr('settings.novel.lines')),
              h('span', { className: 'dfish-rowline-desc' }, tr('settings.novel.linesDescription'))),
            h('select', {
              className: 'dfish-select',
              value: String(novel.linesPerPage),
              onChange: (event) => updateNovel({ linesPerPage: Number(event.target.value) }),
            }, NOVEL_LINE_OPTIONS.map((count) => h('option', { key: count, value: String(count) }, tr('settings.novel.lineCount', { count }))))),
          h('div', { className: 'dfish-rowline' },
            h('span', { className: 'dfish-rowline-copy' },
              h('span', { className: 'dfish-rowline-title' }, tr('settings.novel.auto')),
              h('span', { className: 'dfish-rowline-desc' }, tr('settings.novel.autoDescription'))),
            h('select', {
              className: 'dfish-select',
              value: String(novel.autoSeconds),
              onChange: (event) => updateNovel({ autoSeconds: Number(event.target.value) }),
            }, NOVEL_AUTO_OPTIONS.map((seconds) => h('option', {
              key: seconds,
              value: String(seconds),
            }, seconds === 0 ? tr('settings.novel.autoOff') : tr('settings.novel.autoSeconds', { count: seconds })))))),
        h('section', { className: 'dfish-section' },
          h('div', { className: 'dfish-section-head' },
            h('h3', null, tr('settings.shortcuts.novel.title')),
            h('p', null, tr('settings.shortcuts.novel.description'))),
          h('div', { className: 'dfish-shortcut-list' },
            APP_SHORTCUT_ACTIONS.novel.map((action) => h(ShortcutRow, {
              key: action,
              action,
              combo: cfg.apps.novel.shortcuts[action],
              recording: recordingKey === `novel:${action}`,
              tr,
              onToggle: () => startShortcutRecording('novel', action),
            }))),
          shortcutErrorText('novel') === null ? null : h('p', { className: 'dfish-form-error', role: 'alert' }, shortcutErrorText('novel')),
          h('div', { className: 'dfish-shortcuts-foot' },
            h('span', { className: 'dfish-note' }, tr('settings.shortcuts.hint')),
            h('button', {
              type: 'button',
              className: 'dfish-btn dfish-btn-quiet',
              onClick: () => resetShortcuts('novel'),
            }, tr('settings.shortcuts.resetApp')))),
        h('div', { className: 'dfish-tab-footer' },
          h('button', {
            type: 'button',
            className: 'dfish-btn dfish-btn-quiet',
            onClick: resetNovel,
          }, confirmReset ? tr('settings.resetConfirm') : tr('settings.reset'))));

      const renderAppFallback = (app) => h(React.Fragment, null,
        h('div', { className: 'dfish-app' },
          h('span', { className: 'dfish-app-icon' }, h(AppIcon, { name: app.icon })),
          h('span', { className: 'dfish-app-body' },
            h('span', { className: 'dfish-app-title' }, tr(app.titleKey)),
            h('span', { className: 'dfish-app-desc' }, tr(app.descriptionKey)))),
        h('p', { className: 'dfish-note dfish-more-apps' }, tr('settings.app.noSettings')));

      const activeApp = FISH_APPS.find((app) => app.id === currentTab);

      return h('div', { className: 'dfish-settings' },
        h('h2', null, tr('settings.title')),
        h('p', { className: 'dfish-lede' }, tr('settings.description')),
        h('div', {
          className: 'dfish-tabs',
          role: 'tablist',
          'aria-label': tr('settings.tabs.aria'),
          onKeyDown: onTabKeyDown,
        }, tabs.map((tab) => h('button', {
          type: 'button',
          key: tab.id,
          id: `dfish-tab-${tab.id}`,
          ref: (element) => { tabRefs.current[tab.id] = element; },
          role: 'tab',
          className: 'dfish-tab',
          'data-active': currentTab === tab.id ? 'true' : undefined,
          'aria-selected': currentTab === tab.id,
          'aria-controls': `dfish-panel-${tab.id}`,
          tabIndex: currentTab === tab.id ? 0 : -1,
          onClick: () => activateTab(tab.id),
        }, tr(tab.labelKey)))),
        h('div', {
          className: 'dfish-tabpanel',
          role: 'tabpanel',
          id: `dfish-panel-${currentTab}`,
          'aria-labelledby': `dfish-tab-${currentTab}`,
        }, currentTab === 'global' ? renderGlobal() : activeApp?.id === 'stock' ? renderStock() : activeApp?.id === 'novel' ? renderNovel() : activeApp ? renderAppFallback(activeApp) : null),
        h('div', { className: 'dfish-settings-foot' },
          h('span', null, tr('settings.autosave'))));
    }
    // ---------------------------------------------------------------------
    // Plugin wiring
    // ---------------------------------------------------------------------

    let fallbackT = (key) => key;

    const CSS = `
.dfish-root, .dfish-settings {
  --dfish-muted: var(--dsw-alias-label-secondary);
  --dfish-faint: color-mix(in srgb, var(--dsw-alias-label-secondary) 72%, transparent);
  --dfish-idle: var(--dsw-alias-state-idle-primary);
  --dfish-hover: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
  --dfish-selected: color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
}
.dfish-root {
  box-sizing: border-box;
  width: calc(100% - var(--dsh-composer-side-clearance, 16px) - var(--dsh-composer-side-clearance, 16px) - var(--dsh-composer-dock-inset, 8px) - var(--dsh-composer-dock-inset, 8px));
  max-width: calc(var(--dsh-composer-card-max-width, 800px) - var(--dsh-composer-dock-inset, 8px) - var(--dsh-composer-dock-inset, 8px));
  margin: 0 auto;
  padding: 0 var(--dsh-composer-dock-inset, 8px);
  color: var(--dsw-alias-label-secondary);
  font-size: var(--dsh-content-font-size-secondary, 13px);
  line-height: 20px;
  container-type: inline-size;
}
.dfish-root { outline: none; }
.dfish-root:focus-visible .dfish-toggle { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dfish-header { display: flex; align-items: center; gap: 2px; min-width: 0; }
.dfish-toggle {
  flex: 1 1 auto; min-width: 0; height: 24px; display: flex; align-items: center; gap: 0;
  border: 0; padding: 0; margin: 0; background: transparent; color: inherit;
  font: inherit; text-align: left; cursor: pointer; border-radius: 5px; user-select: none;
}
.dfish-root:focus-within .dfish-title { color: var(--dsw-alias-label-primary); }
.dfish-leading { flex: none; display: grid; place-items: center; color: var(--dfish-faint); }
.dfish-title { flex: none; color: var(--dsw-alias-label-secondary); font-weight: 400; font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 20px; }
.dfish-toggle:hover .dfish-title { color: var(--dsw-alias-label-primary); }
.dfish-sep { flex: none; width: 2px; height: 2px; margin: 0 8px; border-radius: 1px; background: var(--dfish-idle); }
.dfish-summary { flex: 1 1 auto; min-width: 0; overflow: hidden; white-space: nowrap; color: var(--dsw-alias-label-secondary); font-size: var(--dsh-content-font-size-secondary, 13px); line-height: 20px; }
.dfish-summary-text { display: block; overflow: hidden; text-overflow: ellipsis; }
.dfish-summary[data-busy="true"] { mask-image: linear-gradient(90deg, #000 calc(100% - 48px), #0000); -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 48px), #0000); }
.dfish-summary[data-busy="true"] .dfish-summary-text {
  background-image: linear-gradient(90deg, var(--dsw-alias-label-secondary) 0%, var(--dsw-alias-label-primary) 45%, var(--dsw-alias-label-secondary) 90%);
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: dfish-shimmer 2.2s linear infinite;
}
.dfish-header-status {
  flex: 0 1 auto; min-width: 0; max-width: 44%; display: inline-flex; align-items: center; gap: 5px;
  overflow: hidden; color: var(--dfish-muted); font-size: 10px; line-height: 16px;
  white-space: nowrap; user-select: none;
}
.dfish-header-status-text { display: inline-block; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.dfish-header-status-extra { color: var(--dfish-faint); }
.dfish-header-status[data-state="error"] .dfish-header-status-text { color: var(--dsw-alias-state-warn-primary); }
.dfish-header-status[data-state="error"] .dfish-header-status-extra { color: var(--dfish-faint); }
.dfish-chevronbtn {
  flex: none; width: 22px; height: 22px; display: grid; place-items: center; padding: 0;
  border: 0; border-radius: 5px; background: transparent; color: var(--dfish-faint); cursor: pointer;
}
.dfish-chevronbtn:hover { background: var(--dfish-hover); color: var(--dsw-alias-label-primary); }
.dfish-chevronbtn:focus-visible { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dfish-chevronbtn svg { transition: transform .15s ease; }
.dfish-root[data-expanded="true"] .dfish-chevronbtn svg { transform: rotate(90deg); }
.dfish-tools { flex: none; display: flex; align-items: center; gap: 2px; opacity: 0; transition: opacity .12s ease; }
.dfish-root[data-expanded="true"] .dfish-tools, .dfish-root:focus-within .dfish-tools, .dfish-tools:focus-within { opacity: 1; }
.dfish-iconbtn {
  width: 22px; height: 22px; display: grid; place-items: center; padding: 0; border: 0;
  border-radius: 5px; background: transparent; color: var(--dfish-faint); cursor: pointer;
}
.dfish-iconbtn:hover:not(:disabled) { background: var(--dfish-hover); color: var(--dsw-alias-label-primary); }
.dfish-iconbtn:disabled { opacity: .45; cursor: default; }
.dfish-iconbtn:focus-visible { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dfish-body { padding: 4px 0 6px 22px; }
.dfish-table { display: flex; flex-direction: column; max-height: 240px; overflow-y: auto; font-size: 12px; line-height: 18px; scrollbar-width: thin; }
.dfish-tr {
  display: grid;
  grid-template-columns: minmax(86px, 1.35fr) minmax(56px, .82fr) minmax(54px, .82fr) minmax(54px, .82fr) minmax(96px, 1.12fr) minmax(70px, .9fr);
  column-gap: 8px; align-items: center;
}
.dfish-thead { position: sticky; top: 0; z-index: 1; height: 22px; padding: 0 8px; background: var(--dsw-alias-bg-base); color: var(--dfish-faint); font-size: 10px; line-height: 16px; letter-spacing: .02em; }
.dfish-thead > span:nth-child(n+2) { text-align: right; }
.dfish-row {
  box-sizing: border-box;
  min-height: 24px; width: 100%; margin: 0; padding: 3px 8px; border: 0; border-radius: 5px;
  background: transparent; color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; line-height: 18px;
  text-align: left; cursor: pointer;
}
.dfish-row:hover { background: var(--dfish-hover); }
.dfish-row[data-focused="true"] { background: var(--dfish-selected); }
.dfish-row:focus-visible { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: -1px; }
.dfish-row > span:nth-child(n+2) { text-align: right; }
.dfish-name { display: flex; align-items: baseline; gap: 6px; min-width: 0; color: var(--dsw-alias-label-primary); }
.dfish-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dfish-code { flex: none; color: var(--dfish-faint); font-size: 10px; font-variant-numeric: tabular-nums; }
.dfish-num { white-space: nowrap; font-variant-numeric: tabular-nums; }
.dfish-up { color: var(--dsw-alias-state-error-primary); }
.dfish-down { color: var(--dsw-alias-state-success-primary); }
.dfish-flat { color: var(--dfish-muted); }
.dfish-neutral { color: var(--dsw-alias-label-secondary); }
.dfish-detail { display: flex; flex-wrap: wrap; gap: 3px 16px; padding: 7px 8px 2px; color: var(--dfish-faint); font-size: 11px; line-height: 16px; }
.dfish-detail-item { white-space: nowrap; }
.dfish-detail b { margin-left: 4px; font-weight: 500; font-variant-numeric: tabular-nums; }
.dfish-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 12px; padding: 6px 8px 0; color: var(--dfish-faint); font-size: 10px; line-height: 16px; }
.dfish-dot { flex: none; width: 5px; height: 5px; border-radius: 50%; background: var(--dfish-idle); }
.dfish-dot[data-state="open"] { background: var(--dsw-alias-state-success-primary); }
.dfish-dot[data-state="error"] { background: var(--dsw-alias-state-error-primary); }
.dfish-dot[data-state="loading"] { background: var(--dsw-alias-brand-primary); animation: dfish-pulse 1s ease-in-out infinite alternate; }
.dfish-keys { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 2px; }
.dfish-kbd {
  display: inline-block; padding: 0 4px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 3px;
  color: var(--dfish-faint); font-size: 10px; line-height: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.dfish-keysep { margin: 0 4px; color: var(--dfish-faint); }
.dfish-empty { color: var(--dfish-muted); }

.dfish-settings { box-sizing: border-box; width: 100%; max-width: 760px; padding: 6px 0 48px; color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; }
.dfish-settings h2 { margin: 0 0 6px; font-size: 20px; line-height: 28px; font-weight: 600; }
.dfish-settings .dfish-lede { margin: 0 0 22px; color: var(--dfish-muted); font-size: 13px; line-height: 20px; }
.dfish-tabs {
  display: flex; align-items: center; gap: 4px; margin: 0 0 2px;
  border-bottom: .5px solid var(--dsw-alias-border-l1);
}
.dfish-tab {
  position: relative; height: 34px; padding: 0 10px; border: 0; background: transparent;
  color: var(--dfish-muted); font: inherit; font-size: 13px; line-height: 20px; cursor: pointer;
}
.dfish-tab:hover { color: var(--dsw-alias-label-primary); }
.dfish-tab[data-active="true"] { color: var(--dsw-alias-label-primary); font-weight: 500; }
.dfish-tab[data-active="true"]::after {
  content: ""; position: absolute; right: 8px; bottom: -1px; left: 8px; height: 2px;
  border-radius: 2px; background: var(--dsw-alias-brand-primary);
}
.dfish-tab:focus-visible { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: -2px; border-radius: 5px; }
.dfish-tabpanel { padding-top: 16px; }
.dfish-panel-lede { margin: 0; color: var(--dfish-muted); font-size: 13px; line-height: 20px; }
.dfish-section { padding: 20px 0; border-top: .5px solid var(--dsw-alias-border-l1); }
.dfish-section-first { border-top: 0; padding-top: 16px; }
.dfish-section-head h3 { margin: 0; font-size: 14px; line-height: 22px; font-weight: 500; }
.dfish-section-head p { margin: 3px 0 0; color: var(--dfish-muted); font-size: 12px; line-height: 18px; }
.dfish-section-head-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dfish-count { flex: none; color: var(--dfish-faint); font-size: 11px; line-height: 22px; font-variant-numeric: tabular-nums; }
.dfish-applist { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.dfish-app { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; background: var(--dsw-alias-bg-layer-1); }
.dfish-app-icon { flex: none; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 8px; background: var(--dfish-hover); color: var(--dsw-alias-brand-primary); }
.dfish-app-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dfish-app-title { display: flex; align-items: center; gap: 8px; font-size: 13px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-primary); }
.dfish-app-desc { color: var(--dfish-muted); font-size: 12px; line-height: 18px; }
.dfish-badge { display: inline-block; padding: 0 6px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 999px; background: var(--dsw-alias-bg-layer-2); color: var(--dfish-muted); font-size: 10px; line-height: 16px; font-weight: 400; }
.dfish-badge[data-on="true"] { color: var(--dsw-alias-state-success-primary); }
.dfish-input-row { display: flex; gap: 8px; margin-top: 12px; }
.dfish-input {
  box-sizing: border-box; flex: 1 1 auto; min-width: 0; height: 34px; padding: 0 10px;
  border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px;
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; outline: none;
}
.dfish-input::placeholder { color: var(--dfish-faint); }
.dfish-input:focus { border-color: var(--dsw-alias-brand-primary); }
.dfish-btn {
  height: 34px; padding: 0 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 13px; white-space: nowrap; cursor: pointer;
}
.dfish-btn:hover { background: var(--dfish-hover); color: var(--dsw-alias-label-primary); }
.dfish-btn:focus-visible { outline: 1px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.dfish-btn-primary { background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); }
.dfish-btn-primary:hover { background: var(--dfish-hover); color: var(--dsw-alias-brand-primary); opacity: 1; }
.dfish-btn-quiet { height: 28px; background: transparent; color: var(--dfish-muted); font-size: 12px; }
.dfish-btn-quiet:hover { background: var(--dfish-hover); color: var(--dsw-alias-label-primary); }
.dfish-form-error { margin: 6px 0 0; color: var(--dsw-alias-state-error-primary); font-size: 12px; line-height: 18px; }
.dfish-presets { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 9px; }
.dfish-presets-label { color: var(--dfish-faint); font-size: 11px; margin-right: 2px; }
.dfish-chip {
  border: .5px solid var(--dsw-alias-border-l1); border-radius: 999px; background: transparent;
  color: var(--dfish-muted); padding: 1px 8px; font: inherit; font-size: 11px; line-height: 18px; cursor: pointer;
}
.dfish-chip:hover { background: var(--dfish-hover); color: var(--dsw-alias-label-primary); }
.dfish-chip[data-added="true"] { opacity: .45; cursor: default; }
.dfish-chip:disabled { opacity: .45; cursor: default; }
.dfish-list { margin-top: 12px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 10px; overflow: hidden; background: var(--dsw-alias-bg-layer-1); }
.dfish-list-empty { padding: 16px 12px; color: var(--dfish-muted); font-size: 12px; }
.dfish-symbol { display: flex; align-items: center; gap: 10px; min-height: 42px; padding: 6px 10px; }
.dfish-symbol + .dfish-symbol { border-top: .5px solid var(--dsw-alias-border-l1); }
.dfish-symbol-code { flex: none; width: 76px; color: var(--dsw-alias-label-primary); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
.dfish-symbol-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dfish-muted); font-size: 12px; }
.dfish-symbol-actions { flex: none; display: flex; align-items: center; gap: 2px; }
.dfish-mini {
  width: 26px; height: 26px; display: grid; place-items: center; padding: 0;
  border: 0; border-radius: 5px; background: transparent; color: var(--dfish-faint);
  font: inherit; font-size: 13px; cursor: pointer;
}
.dfish-mini:hover:not(:disabled) { background: var(--dfish-hover); color: var(--dsw-alias-label-primary); }
.dfish-mini:disabled { opacity: .3; cursor: default; }
.dfish-mini-danger:hover:not(:disabled) { color: var(--dsw-alias-state-error-primary); }
.dfish-rowline { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 0; border-bottom: .5px solid var(--dsw-alias-border-l1); }
.dfish-rowline:last-child { border-bottom: 0; padding-bottom: 0; }
.dfish-section .dfish-rowline:first-child { padding-top: 0; }
.dfish-rowline-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dfish-rowline-title { color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 20px; }
.dfish-rowline-desc { color: var(--dfish-muted); font-size: 12px; line-height: 18px; }
.dfish-shortcut-list { margin-top: 14px; border-top: .5px solid var(--dsw-alias-border-l1); }
.dfish-shortcut-row {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 11px 0; border-bottom: .5px solid var(--dsw-alias-border-l1);
}
.dfish-shortcut-row:last-child { border-bottom: 0; }
.dfish-shortcut-row[data-recording="true"] .dfish-combo {
  border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary);
}
.dfish-shortcut-control { flex: none; display: flex; align-items: center; gap: 8px; }
.dfish-combo {
  display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;
  min-width: 88px; height: 28px; padding: 0 8px; border: .5px solid var(--dsw-alias-border-l1);
  border-radius: 5px; background: var(--dsw-alias-bg-layer-1); color: var(--dfish-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px;
  line-height: 18px; white-space: nowrap;
}
.dfish-btn-small { height: 28px; padding: 0 9px; font-size: 12px; }
.dfish-shortcuts-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; }
.dfish-note { color: var(--dfish-faint); font-size: 11px; line-height: 18px; }
.dfish-more-apps { margin: 20px 0 0; padding-top: 14px; border-top: .5px solid var(--dsw-alias-border-l1); }
.dfish-tab-footer { display: flex; justify-content: flex-end; padding-top: 12px; }
.dfish-select {
  flex: none; height: 34px; padding: 0 8px; border: .5px solid var(--dsw-alias-border-l1); border-radius: 8px;
  background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 13px; cursor: pointer;
}
.dfish-kbd-lg { padding: 2px 7px; font-size: 11px; line-height: 18px; background: var(--dsw-alias-bg-layer-1); border-radius: 5px; }
.dfish-settings-foot { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 18px; border-top: .5px solid var(--dsw-alias-border-l1); color: var(--dfish-faint); font-size: 11px; line-height: 18px; }
.dfish-novel-root { container-type: inline-size; }
.dfish-novel-root:not([data-expanded="true"]) .dfish-tools { opacity: 0; pointer-events: none; }
.dfish-novel-viewport {
  display: block; overflow: hidden; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word;
  color: var(--dsw-alias-label-secondary); user-select: none; cursor: default; outline: none;
  overflow-anchor: none; overscroll-behavior: contain; scrollbar-width: none;
}
.dfish-novel-viewport::-webkit-scrollbar { display: none; }
.dfish-novel-line { flex: 1 1 auto; min-width: 0; }
.dfish-novel-page { width: 100%; }
.dfish-novel-percent {
  flex: none; padding-left: 7px; color: var(--dfish-faint); font-size: 10px; line-height: 16px;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.dfish-novel-body { padding: 4px 0 6px 22px; }
.dfish-novel-meta { display: flex; align-items: baseline; gap: 8px; min-width: 0; padding: 0 8px 4px 0; color: var(--dfish-faint); font-size: 10px; line-height: 16px; }
.dfish-novel-meta-book { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dfish-muted); }
.dfish-novel-meta-chapter { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dfish-novel-meta-percent { flex: none; font-variant-numeric: tabular-nums; }
.dfish-novel-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px 12px; padding: 5px 8px 0 0; color: var(--dfish-faint); font-size: 10px; line-height: 16px; }
.dfish-novel-empty { padding: 10px 8px 8px 0; color: var(--dfish-muted); font-size: 12px; line-height: 18px; }
.dfish-novel-empty-hint { margin-top: 3px; color: var(--dfish-faint); font-size: 11px; line-height: 17px; }
.dfish-novel-library-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 2px 8px 6px 0; color: var(--dfish-faint); font-size: 10px; line-height: 16px; }
.dfish-novel-library-title { color: var(--dfish-muted); font-weight: 500; }
.dfish-novel-library-count { font-variant-numeric: tabular-nums; }
.dfish-novel-library-list { display: flex; flex-direction: column; max-height: 236px; overflow-y: auto; padding-right: 4px; scrollbar-width: thin; }
.dfish-novel-book {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 38px; padding: 5px 8px;
  border: 0; border-radius: 6px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer;
}
.dfish-novel-book:hover, .dfish-novel-book[data-selected="true"] { background: var(--dfish-hover); }
.dfish-novel-book[data-active="true"] .dfish-novel-book-title { color: var(--dsw-alias-label-primary); }
.dfish-novel-book-main { display: flex; flex: 1 1 auto; flex-direction: column; gap: 1px; min-width: 0; }
.dfish-novel-book-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dfish-muted); font-size: 12px; line-height: 18px; }
.dfish-novel-book-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dfish-faint); font-size: 10px; line-height: 16px; }
.dfish-novel-book-open { flex: none; color: var(--dfish-faint); font-size: 10px; line-height: 16px; }
.dfish-novel-import-row { align-items: center; }
.dfish-novel-import-hint { flex: 1 1 auto; min-width: 160px; }
.dfish-novel-settings-list { margin-top: 12px; max-height: 320px; overflow-y: auto; scrollbar-width: thin; }
.dfish-btn:disabled { opacity: .5; cursor: default; }
.dfish-novel-settings-book { display: flex; align-items: center; gap: 12px; min-height: 48px; padding: 7px 10px; }
.dfish-novel-settings-book + .dfish-novel-settings-book { border-top: .5px solid var(--dsw-alias-border-l1); }
.dfish-novel-settings-book[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent); }
.dfish-novel-settings-main { display: flex; flex: 1 1 auto; flex-direction: column; gap: 2px; min-width: 0; }
.dfish-novel-settings-title { display: flex; align-items: center; gap: 7px; min-width: 0; }
.dfish-novel-settings-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-primary); font-size: 12px; line-height: 18px; }
.dfish-novel-settings-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dfish-faint); font-size: 11px; line-height: 17px; }
.dfish-novel-settings-actions { flex: none; display: flex; align-items: center; gap: 6px; }
.dfish-btn-danger { color: var(--dsw-alias-state-error-primary); }
.dfish-btn-danger:hover { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 8%, transparent); color: var(--dsw-alias-state-error-primary); }
@container (max-width: 520px) {
  .dfish-novel-percent { display: none; }
  .dfish-novel-meta-book { display: none; }
  .dfish-novel-body { padding-left: 14px; }
  .dfish-novel-settings-book { align-items: flex-start; flex-direction: column; gap: 6px; }
  .dfish-novel-settings-actions { width: 100%; justify-content: flex-end; }
}
@media (max-width: 640px) {
  .dfish-novel-settings-book { align-items: flex-start; flex-direction: column; gap: 6px; }
  .dfish-novel-settings-actions { width: 100%; justify-content: flex-end; }
  .dfish-novel-import-row { align-items: flex-start; flex-direction: column; }
  .dfish-novel-import-hint { min-width: 0; }
}
.dfish-spin { animation: dfish-rotate .9s linear infinite; }
@keyframes dfish-rotate { to { transform: rotate(360deg); } }
@keyframes dfish-shimmer { 0% { background-position: 120% 0; } 100% { background-position: -120% 0; } }
@keyframes dfish-pulse { from { opacity: .35; } to { opacity: 1; } }
@container (max-width: 660px) {
  .dfish-col-range { display: none; }
  .dfish-header-status-extra { display: none; }
  .dfish-tr { grid-template-columns: minmax(86px, 1.35fr) minmax(56px, .82fr) minmax(54px, .82fr) minmax(54px, .82fr) minmax(70px, .9fr); }
}
@container (max-width: 500px) {
  .dfish-col-amount { display: none; }
  .dfish-tr { grid-template-columns: minmax(78px, 1.3fr) minmax(52px, .8fr) minmax(52px, .8fr) minmax(52px, .8fr); }
  .dfish-body { padding-left: 14px; }
  .dfish-keys { display: none; }
}
@media (max-width: 640px) {
  .dfish-settings { padding-bottom: 32px; }
  .dfish-rowline { align-items: flex-start; flex-direction: column; gap: 8px; }
  .dfish-shortcut-row { align-items: flex-start; flex-direction: column; gap: 8px; }
  .dfish-shortcut-control { width: 100%; justify-content: space-between; }
  .dfish-shortcuts-foot { align-items: flex-start; flex-direction: column; }
  .dfish-select { width: 100%; }
  .dfish-settings-foot { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) {
  .dfish-summary[data-busy="true"] .dfish-summary-text { animation: none; background: none; -webkit-text-fill-color: currentColor; color: var(--dsw-alias-label-secondary); }
  .dfish-spin, .dfish-dot[data-state="loading"] { animation: none; }
}
`;

    function installStyles() {
      for (const existing of document.querySelectorAll('style[data-dsh-fish="styles"]')) existing.remove();
      const style = document.createElement('style');
      style.dataset.dshFish = 'styles';
      style.textContent = CSS;
      document.head.appendChild(style);
      return () => style.remove();
    }

    function installShortcuts() {
      const onKeyDown = (event) => {
        if (event.repeat) return;
        if (shortcutCapture !== null) {
          const handled = shortcutCapture(event);
          if (handled) {
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }
        if (event.isComposing) return;
        const combo = comboFromEvent(event);
        if (combo === null) return;
        const config = getConfig();
        const globalAction = GLOBAL_SHORTCUT_ACTIONS.find((action) => config.shortcuts[action] === combo);
        if (globalAction === 'boss') {
          event.preventDefault();
          event.stopPropagation();
          dismissFishPopup();
          const sessionId = store.currentSession() ?? store.firstActiveSession();
          if (sessionId === null) return;
          const state = store.get(sessionId);
          if (state.hidden) {
            store.restoreForBoss(sessionId);
          } else if (state.app !== null) {
            store.hideForBoss(sessionId);
          }
          return;
        }

        const sessionId = store.currentSession() ?? store.firstActiveSession();
        if (sessionId === null) return;
        const state = store.get(sessionId);
        if (state.app === null || state.hidden) return;
        const controller = appControllers.get(sessionId);
        if (controller === undefined) return;

        if (globalAction === 'toggle') {
          if (typeof controller.toggle !== 'function') return;
          event.preventDefault();
          event.stopPropagation();
          controller.toggle();
          return;
        }

        const appActions = APP_SHORTCUT_ACTIONS[state.app];
        if (!Array.isArray(appActions)) return;
        const appConfig = config.apps?.[state.app];
        const appShortcuts = appConfig !== null && typeof appConfig === 'object' ? appConfig.shortcuts : undefined;
        if (appShortcuts === null || typeof appShortcuts !== 'object') return;
        const appAction = appActions.find((action) => appShortcuts[action] === combo);
        if (appAction === undefined || typeof controller[appAction] !== 'function') return;
        event.preventDefault();
        event.stopPropagation();
        controller[appAction]();
      };
      window.addEventListener('keydown', onKeyDown, true);
      return () => window.removeEventListener('keydown', onKeyDown, true);
    }

    function installStorageSync() {
      const onStorage = (event) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        config = loadConfig();
        for (const listener of [...configListeners]) {
          try {
            listener();
          } catch {
            // Ignore one broken subscriber.
          }
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }

    function registerCommandUi(ctx, t) {
      ctx.inject(['commandUi'], (scope) => {
        const commandUi = scope.get('commandUi');
        if (commandUi === undefined) return;
        commandUiRuntime = commandUi;
        scope.effect(() => commandUi.decorate({
          name: 'fish',
          available: () => true,
          ui: {
            kind: 'popupSelect',
            searchLabels: () => ({
              placeholder: t('cmd.search.placeholder'),
              empty: t('cmd.search.empty'),
              noResults: t('cmd.search.noResults'),
            }),
            options: async (session) => {
              const state = store.get(session.sessionId);
              const appGroup = { name: 'apps', label: t('cmd.group.apps') };
              const controlGroup = { name: 'control', label: t('cmd.group.control') };
              return [
                {
                  id: 'stock',
                  label: t('cmd.stock.label'),
                  detail: t('cmd.stock.detail'),
                  group: appGroup,
                  active: state.app === 'stock',
                },
                {
                  id: 'novel',
                  label: t('cmd.novel.label'),
                  detail: t('cmd.novel.detail'),
                  group: appGroup,
                  active: state.app === 'novel',
                },
                {
                  id: 'off',
                  label: t('cmd.off.label'),
                  detail: t('cmd.off.detail'),
                  group: controlGroup,
                  active: state.app === null,
                },
              ];
            },
            onSelect: async (option, session) => {
              await store.requestApp(session.sessionId, option.id === 'off' ? null : option.id);
            },
          },
        }), 'dsh-fish: /fish popup');
      });
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(installStyles, 'dsh-fish: styles');
        ctx.effect(() => ctx.locale.register(NS, DICT), 'dsh-fish: locale');
        const t = ctx.locale.bind(NS);
        fallbackT = t;

        ctx.effect(installStorageSync, 'dsh-fish: config storage sync');
        ctx.effect(installShortcuts, 'dsh-fish: global shortcuts');

        const FishDockEntry = (props) => h(FishDock, { ...props, t });
        const SettingsEntry = (props) => h(SettingsPage, { ...props, t });

        ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
          name: 'conversation.input.dock',
          id: 'fish',
          order: 5,
          locale: NS,
          label: () => t('dock.title'),
        }, FishDockEntry));

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'fish',
          order: 60,
          locale: NS,
          label: () => t('settings.title'),
        }, SettingsEntry));

        registerCommandUi(ctx, t);
      },
    };
  },
});
