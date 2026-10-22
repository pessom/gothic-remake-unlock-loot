#!/usr/bin/env node
/* Сборка каталога замков из locks.yaml (единственный источник списка замков).
   Пишет (всё это не хранится в git, собирается при деплое):
   - locks/locks-data.js            - список для решателя (подсказка) и каталога
   - locks/<slug>/, en/locks/<slug>/ - страницы замков + редиректы со старых адресов
   - locks/index.html, en/locks/index.html - каталог из tools/templates/catalog.*.html
   - sitemap.xml
   Число плиток, штифты, ходы и связи считаются по коду замка решателем из index.html.
   Запуск: npm run build:locks */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import YAML from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname;
const SITE = 'https://unlockmyloot.com';
const ASSET_V = 'scroll-bg-20260617-2'; /* сброс кэша lock-page.css/js - менять вместе с ними */
const LANGS = ['ru', 'en'];

/* ---------- данные ---------- */
const LOCKS = YAML.parse(readFileSync(join(ROOT, 'locks.yaml'), 'utf8'));

/* решатель берём из index.html, чтобы ходы в каталоге совпадали с сайтом */
function loadSolver() {
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/\/\* solver-start[\s\S]*?\/\* solver-end \*\//);
  if (!m) throw new Error('index.html: не найдены маркеры solver-start/solver-end');
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(m[0] + '; this.solveLock = solveLock;', ctx);
  return ctx.solveLock;
}
const solveLock = loadSolver();

const CODE_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function decodeLock(code) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{5,24}$/.test(code)) return null;
  const bits = [];
  for (const ch of code) { const v = CODE_ABC.indexOf(ch); for (let b = 5; b >= 0; b--) bits.push((v >> b) & 1); }
  let pos = 0;
  const read = (w) => { let v = 0; for (let b = 0; b < w; b++) v = (v << 1) | bits[pos++]; return v; };
  const n = read(3) + 3;
  if (code.length !== Math.ceil((4 + 3 * n + 2 * n * (n - 1)) / 6)) return null;
  read(1); // flip - на каталог не влияет
  const pins = [];
  for (let i = 0; i < n; i++) { const p = read(3); if (p > 6) return null; pins.push(p + 1); }
  const link = [];
  let links = 0;
  for (let i = 0; i < n; i++) {
    link.push(new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const t = read(2);
      if (t > 2) return null;
      if (t) { links++; link[i][j] = t === 1 ? 1 : -1; }
    }
  }
  return { n, pins, link, links };
}

/* ---------- проверка locks.yaml ---------- */
const errors = [];
const err = (L, msg) => errors.push(`${(L && (L.slug || L.code)) || '?'}: ${msg}`);
const seen = { code: {}, slug: {}, fp: {} };
if (!Array.isArray(LOCKS)) throw new Error('locks.yaml: ожидается список замков');
for (const L of LOCKS) {
  const dec = decodeLock(L.code);
  if (!dec) { err(L, `неверный код замка «${L.code}»`); continue; }
  const seq = solveLock(dec.pins.slice(), dec.link);
  if (!seq) { err(L, 'замок не решается - проверь код'); continue; }
  Object.assign(L, { n: dec.n, pins: dec.pins, links: dec.links, moves: seq.length, fp: dec.n + '.' + dec.pins.join('') });
  if (seen.code[L.code]) err(L, 'код повторяется');
  seen.code[L.code] = true;
  if (L.suggest !== false) {
    if (seen.fp[L.fp]) err(L, `те же штифты (${L.fp}), что у «${seen.fp[L.fp]}» - подсказка неоднозначна, у одного поставь suggest: false`);
    seen.fp[L.fp] = L.ru && L.ru.name;
  }
  for (const s of [L.slug, ...(L.aliases || [])].filter(Boolean)) {
    if (!/^[a-z0-9-]+$/.test(s)) err(L, `адрес «${s}»: только латиница, цифры и дефис`);
    if (seen.slug[s]) err(L, `адрес «${s}» уже занят`);
    seen.slug[s] = true;
  }
  if (L.aliases && !L.slug) err(L, 'aliases без slug - некуда перенаправлять');
  for (const lang of LANGS) {
    const t = L[lang];
    if (!t || !t.name || !t.card) { err(L, `${lang}: нужны name и card`); continue; }
    if (L.slug) {
      for (const f of ['title', 'desc', 'lead', 'where', 'inside'])
        if (!t[f]) err(L, `${lang}.${f}: обязательно для замка со страницей`);
      if (!Array.isArray(t.faq) || !t.faq.length || t.faq.some((q) => !q.q || !q.a))
        err(L, `${lang}.faq: нужен список вопросов {q, a}`);
    }
    for (const f of ['title', 'desc', 'card']) if (t[f] && t[f].includes('"')) err(L, `${lang}.${f}: двойные кавычки ломают атрибут - используй «ёлочки»`);
  }
  if (L.credit) for (const lang of LANGS) if (!L.credit[lang] || !L.credit[lang].by) err(L, `credit.${lang}.by: кто нашёл`);
}
if (errors.length) {
  console.error('locks.yaml: ошибки\n - ' + errors.join('\n - '));
  process.exit(1);
}

/* ---------- общие куски ---------- */
function plural(n, one, few, many) {
  const m = n % 10, h = n % 100;
  if (h >= 11 && h <= 14) return many;
  if (m === 1) return one;
  if (m >= 2 && m <= 4) return few;
  return many;
}
const META = {
  ru: (L) => `${L.n} ${plural(L.n, 'плитка', 'плитки', 'плиток')} · ${L.moves} ${plural(L.moves, 'ход', 'хода', 'ходов')} · ${L.links} ${plural(L.links, 'связь', 'связи', 'связей')}`,
  en: (L) => `${L.n} plates · ${L.moves} ${L.moves === 1 ? 'move' : 'moves'} · ${L.links} ${L.links === 1 ? 'link' : 'links'}`,
};
const prefix = (lang) => (lang === 'en' ? '/en' : '');
const pageUrl = (lang, slug) => `${prefix(lang)}/locks/${slug}/`;
const solverUrl = (lang, code) => `${prefix(lang)}/?lock=${code}`;

function pinsHtml(pins) {
  let html = '<div class="lc-pins">';
  for (let i = 0; i < pins.length; i++) {
    html += '<div class="lc-row"><span class="n">' + (i + 1) + '</span>';
    for (let p = 1; p <= 7; p++) {
      const cls = 'lc-hole' + (p === 4 ? ' c' : '') + (pins[i] === p ? (p === 4 ? ' pg' : ' p') : '');
      html += '<span class="' + cls + '"></span>';
    }
    html += '</div>';
  }
  return html + '</div>';
}

/* ---------- страница замка ---------- */
function creditHtml(lang, L) {
  if (!L.credit || !L.credit[lang].label) return '';
  const c = L.credit[lang];
  const by = L.credit.url ? `<a href="${L.credit.url}">${c.by}</a>` : c.by;
  return `\n    <p class="credit">${c.label}: <b>${by}</b></p>`;
}

function pageHtml(lang, L) {
  const c = L[lang];
  const name = c.pageName || c.name;
  const home = prefix(lang) + '/';
  const catalog = prefix(lang) + '/locks/';
  const canonical = SITE + pageUrl(lang, L.slug);
  const solver = solverUrl(lang, L.code);
  const ru = lang === 'ru';
  const params = '<span>' + META[lang](L).split(' · ').join('</span><span>') + '</span>';
  const T = ru
    ? { pinNote: 'Стартовые позиции штифтов (1-7 слева направо, цель - центр, 4). Зелёный - уже в центре.', faq: 'Частые вопросы', footSolver: 'Открыть в решателе &rarr;', footAll: 'Все замки каталога', cta: 'Открыть этот замок в решателе &rarr;', cat: 'Каталог', sol: 'Решатель', where: 'Где находится', inside: 'Что внутри', stats: 'Параметры замка', foot: 'UnlockMyLoot - решатель и каталог замков Gothic 1 Remake.' }
    : { pinNote: 'Starting pin positions (1-7 left to right, goal is the centre, 4). Green = already centred.', faq: 'FAQ', footSolver: 'Open in solver &rarr;', footAll: 'All catalog locks', cta: 'Open this lock in the solver &rarr;', cat: 'Catalog', sol: 'Solver', where: 'Where it is', inside: "What's inside", stats: 'Lock stats', foot: 'UnlockMyLoot - Gothic 1 Remake lockpick solver and lock catalog.' };
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: T.sol, item: SITE + home },
          { '@type': 'ListItem', position: 2, name: T.cat, item: SITE + catalog },
          { '@type': 'ListItem', position: 3, name, item: canonical },
        ],
      },
      {
        '@type': 'Article',
        headline: c.title,
        description: c.desc,
        inLanguage: lang,
        url: canonical,
        isPartOf: { '@type': 'WebSite', name: 'UnlockMyLoot', url: SITE + '/' },
        about: 'Gothic 1 Remake',
      },
    ],
  };
  const faq = c.faq.map((q) => `<details><summary>${q.q}</summary><p>${q.a}</p></details>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${c.title} | UnlockMyLoot</title>
<meta name="description" content="${c.desc}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="ru" href="${SITE + pageUrl('ru', L.slug)}">
<link rel="alternate" hreflang="en" href="${SITE + pageUrl('en', L.slug)}">
<link rel="alternate" hreflang="x-default" href="${SITE + pageUrl('ru', L.slug)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${c.title}">
<meta property="og:description" content="${c.desc}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:site_name" content="UnlockMyLoot">
<meta name="theme-color" content="#101214">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48 64x64">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>(function(){var t=null;try{t=localStorage.getItem('uml-theme');}catch(e){}document.documentElement.dataset.theme=(t==='light'||t==='dark')?t:'dark';})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/locks/lock-page.css?v=${ASSET_V}">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<div class="pagebg" id="pagebg" aria-hidden="true"></div>
<div class="wrap page">
  <header class="top">
    <a class="wordmark" href="${home}"><span class="dot"></span>UnlockMyLoot</a>
    <nav class="nav"><a href="${catalog}">${T.cat}</a><a href="${home}">${T.sol}</a></nav>
  </header>
  <nav class="crumb" aria-label="breadcrumb"><a href="${home}">${T.sol}</a><span>/</span><a href="${catalog}">${T.cat}</a><span>/</span><span>${name}</span></nav>
  <main class="article">
    <h1>${c.title}</h1>
    <p class="lead">${c.lead}</p>
    <a class="cta" href="${solver}">${T.cta}</a>
    <h2>${T.where}</h2>
    <p>${c.where}</p>
    <h2>${T.inside}</h2>
    <p>${c.inside}</p>
    <h2>${T.stats}</h2>
    <div class="params">${params}</div>
    ${pinsHtml(L.pins)}
    <p class="pinnote">${T.pinNote}</p>${creditHtml(lang, L)}
    <h2>${T.faq}</h2>
    <div class="faq">${faq}</div>
    <p class="footacts"><a href="${solver}">${T.footSolver}</a><span>·</span><a href="${catalog}">${T.footAll}</a></p>
  </main>
  <footer class="foot">${T.foot}</footer>
</div>
<script src="/locks/lock-page.js?v=${ASSET_V}" defer></script>
</body>
</html>
`;
}

/* старый адрес -> актуальная страница */
function redirectHtml(lang, L) {
  const to = pageUrl(lang, L.slug);
  const ru = lang === 'ru';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${ru ? 'Перенаправление…' : 'Redirecting…'}</title>
<meta name="robots" content="noindex, follow">
<link rel="canonical" href="${SITE + to}">
<meta http-equiv="refresh" content="0;url=${to}">
<script>location.replace('${to}');</script>
</head>
<body><p><a href="${to}">${ru ? 'Страница переехала: ' + L.ru.name : 'Moved: ' + L.en.name}</a></p></body>
</html>
`;
}

/* ---------- каталог ---------- */
const SVG_CHECK = '<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5.5 4 8l4.5-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW = '<svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M1 6.5h11M8 2l4.5 4.5L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CARD_T = {
  ru: { badge: 'проверен', by: 'нашёл', open: 'в решатель', stats: 'конфигурация сверена с игрой' },
  en: { badge: 'verified', by: 'found by', open: 'to solver', stats: 'configuration matched against the game' },
};

/* та же разметка, что у card() в шаблоне каталога («Живой топ») */
function cardHtml(lang, L, idx) {
  const t = L[lang], T = CARD_T[lang];
  const href = L.slug ? pageUrl(lang, L.slug) : solverUrl(lang, encodeURIComponent(L.code));
  const by = L.credit && L.credit[lang].by;
  return '<a class="lockcard" style="--i:' + idx + '" href="' + href + '" title="' + t.card + '">' +
    '<div class="lc-top"><span class="lc-name">' + t.name + '</span>' +
    '<span class="lc-badge">' + SVG_CHECK + T.badge + '</span></div>' +
    '<span class="lc-meta">' + META[lang](L) + '</span>' +
    '<span class="lc-desc">' + t.card + '</span>' +
    (by ? '<span class="lc-by">' + T.by + ': <b>' + by + '</b></span>' : '') +
    pinsHtml(L.pins) +
    '<div class="lc-foot"><span class="lc-stats">' + T.stats + '</span>' +
    '<span class="lc-open">' + T.open + ' ' + ARROW + '</span></div></a>';
}

function catalogHtml(lang) {
  const tpl = readFileSync(join(ROOT, 'tools/templates', `catalog.${lang}.html`), 'utf8');
  const items = LOCKS.map((L, i) => JSON.stringify({
    '@type': 'ListItem', position: i + 1, name: L[lang].card,
    url: SITE + (L.slug ? pageUrl(lang, L.slug) : solverUrl(lang, L.code)),
  }));
  const cards = LOCKS.map((L, i) => '      ' + cardHtml(lang, L, i));
  if (!tpl.includes('@@ITEMLIST@@') || !tpl.includes('@@CARDS@@')) throw new Error(`catalog.${lang}.html: нет меток @@ITEMLIST@@ / @@CARDS@@`);
  return tpl.replace('@@ITEMLIST@@', '\n' + items.join(',\n')).replace('@@CARDS@@', cards.join('\n'));
}

/* ---------- sitemap ---------- */
function sitemapXml() {
  const url = (loc, ru, en, freq, prio) => `  <url>
    <loc>${SITE + loc}</loc>
    <xhtml:link rel="alternate" hreflang="ru" href="${SITE + ru}"/>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE + en}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE + ru}"/>
    <changefreq>${freq}</changefreq>
    <priority>${prio}</priority>
  </url>`;
  const out = [
    url('/', '/', '/en/', 'weekly', '1.0'),
    url('/en/', '/', '/en/', 'weekly', '0.9'),
    url('/locks/', '/locks/', '/en/locks/', 'weekly', '0.7'),
    url('/en/locks/', '/locks/', '/en/locks/', 'weekly', '0.7'),
  ];
  for (const L of LOCKS) if (L.slug) for (const lang of LANGS)
    out.push(url(pageUrl(lang, L.slug), pageUrl('ru', L.slug), pageUrl('en', L.slug), 'monthly', '0.6'));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${out.join('\n')}
</urlset>
`;
}

/* ---------- данные для браузера ---------- */
function dataJs() {
  const rows = LOCKS.map((L) => {
    const r = { code: L.code, fp: L.fp };
    if (L.slug) r.slug = L.slug;
    if (L.suggest === false) r.suggest = false;
    r.ru = { name: L.ru.name };
    r.en = { name: L.en.name };
    return '  ' + JSON.stringify(r);
  });
  return '/* Сгенерировано tools/build-locks.mjs из locks.yaml - не править вручную. */\n' +
    'window.UML_LOCKS = [\n' + rows.join(',\n') + '\n];\n';
}

/* ---------- запись ---------- */
for (const lang of LANGS) {
  const dir = join(ROOT, prefix(lang).slice(1), 'locks');
  mkdirSync(dir, { recursive: true }); /* en/locks/ целиком собираемая - в чистом клоне её нет */
  /* каждая подпапка locks/ - сгенерированная страница: чистим, чтобы удалённые замки не оставались */
  for (const e of readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) rmSync(join(dir, e.name), { recursive: true });
  for (const L of LOCKS) {
    if (!L.slug) continue;
    mkdirSync(join(dir, L.slug), { recursive: true });
    writeFileSync(join(dir, L.slug, 'index.html'), pageHtml(lang, L));
    for (const a of L.aliases || []) {
      mkdirSync(join(dir, a), { recursive: true });
      writeFileSync(join(dir, a, 'index.html'), redirectHtml(lang, L));
    }
  }
  writeFileSync(join(dir, 'index.html'), catalogHtml(lang));
}
writeFileSync(join(ROOT, 'locks/locks-data.js'), dataJs());
writeFileSync(join(ROOT, 'sitemap.xml'), sitemapXml());

const pages = LOCKS.filter((L) => L.slug).length;
console.log(`locks.yaml: ${LOCKS.length} замков, ${pages} страниц (x2 языка), ${LOCKS.filter((L) => L.aliases).length} редиректов - готово`);
