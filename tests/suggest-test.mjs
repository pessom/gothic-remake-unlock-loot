// Тесты подсказок: merge applySuggestedLinks, lockBasePins, linkCellKnown,
// поиск известного замка из locks-data.js (knownLockFor).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// пути к сайту - от корня репозитория, откуда бы ни запускали
process.chdir(new URL('..', import.meta.url).pathname);

function loadSuggest(file) {
  const html = readFileSync(file, 'utf8');
  const grab = (re) => {
    const m = html.match(re);
    if (!m) throw new Error('block not found in ' + file + ': ' + re);
    return m[0];
  };
  const src = [
    grab(/var CODE_ABC[\s\S]*?function decodeConfigV2\(code, silent\)[\s\S]*?\n  return true;\n\}/),
    grab(/function normalizeConfigCode[\s\S]*?\n\}/),
    grab(/function decodeConfig\(code, silent\)[\s\S]*?\n  return true;\n\}/),
    grab(/function wizEnsureZero[\s\S]*?function syncLinkManualZero[\s\S]*?\n\}/),
    grab(/function pinsKeyOf[^\n]*\n/),
    grab(/function lockBasePins[\s\S]*?function applySuggestedLinks[\s\S]*?\n  return applied;\n\}/),
  ].join('\n');
  const ctx = {
    N: 0, pins: [], link: [], FLIP: false, pinsTouched: false,
    WIZ_MEM: { zero: null, base: null },
    SUGGESTED_CODE: null,
    // как locks/locks-data.js: Скатти + безымянная расстановка с suggest: false
    window: { UML_LOCKS: [
      { code: 'SojAgCBDQA', fp: '5.63217', slug: 'scatty-chest', ru: { name: 'Сундук Скатти' }, en: { name: "Scatty's chest" } },
      { code: 'TAmBLEwMAE', fp: '5.71225', suggest: false, ru: { name: 'Популярный замок' }, en: { name: 'Popular lock' } },
    ] },
    localStorage: { setItem() {}, getItem() { return null; } },
    wizMemReset() { ctx.WIZ_MEM.zero = null; ctx.WIZ_MEM.base = null; },
    wizMk2d(fill) {
      const a = [];
      for (let i = 0; i < ctx.N; i++) {
        a[i] = [];
        for (let j = 0; j < ctx.N; j++) a[i][j] = fill;
      }
      return a;
    },
    updateFlipLabel() {}, renderCount() {}, renderPins() {}, renderDeps() {},
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(
    src + '\n;this.encodeConfig=encodeConfig;this.decodeConfig=decodeConfig;' +
    'this.applySuggestedLinks=applySuggestedLinks;this.lockBasePins=lockBasePins;' +
    'this.linkCellKnown=linkCellKnown;this.matrixUnknownCount=matrixUnknownCount;' +
    'this.syncLinkManualZero=syncLinkManualZero;this.knownLockFor=knownLockFor;',
    ctx,
  );
  return ctx;
}

for (const file of ['site/index.html', 'site/en/index.html']) {
  const ctx = loadSuggest(file);

  // encodeConfig(base) не включает сдвинутые штифты
  ctx.N = 4;
  ctx.pins = [2, 3, 4, 5];
  ctx.WIZ_MEM.base = [7, 6, 5, 4];
  ctx.link = Array.from({ length: 4 }, () => new Array(4).fill(0));
  ctx.link[0][1] = 1;
  ctx.FLIP = false;
  ctx.pinsTouched = true;
  const baseCode = ctx.encodeConfig(ctx.lockBasePins());
  const curCode = ctx.encodeConfig();
  if (baseCode === curCode) throw new Error(file + ': base and shifted pins should differ');
  ctx.decodeConfig(baseCode);
  if (JSON.stringify(ctx.pins) !== '[7,6,5,4]')
    throw new Error(file + ': base code should encode original pins');

  // merge: ручные ячейки не перезаписываются
  ctx.N = 3;
  ctx.pins = [4, 4, 4];
  ctx.WIZ_MEM.base = null;
  ctx.WIZ_MEM.zero = null;
  ctx.link = [
    [0, 1, 0],
    [0, 0, -1],
    [0, 0, 0],
  ];
  ctx.syncLinkManualZero(2, 0, 0); // подтверждённое «нет связи»
  const full = ctx.encodeConfig();
  ctx.link = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  ctx.WIZ_MEM.zero = null;
  const n = ctx.applySuggestedLinks(full);
  if (n !== 6) throw new Error(file + ': expected 6 filled cells, got ' + n);
  if (ctx.link[0][1] !== 1) throw new Error(file + ': should fill 0->1');
  if (ctx.link[1][2] !== -1) throw new Error(file + ': should fill 1->2');
  if (!ctx.WIZ_MEM.zero[2][0]) throw new Error(file + ': zero cell should be marked');
  // уже известная ячейка до merge — не трогаем (симулируем ручной ввод)
  ctx.link = [[0, -1, 0], [0, 0, 0], [0, 0, 0]];
  ctx.WIZ_MEM.zero = null;
  ctx.syncLinkManualZero(0, 1, -1);
  const n2 = ctx.applySuggestedLinks(full);
  if (ctx.link[0][1] !== -1) throw new Error(file + ': manual cell overwritten');
  if (n2 !== 5) throw new Error(file + ': expected 5 merges with one preset, got ' + n2);

  // matrixUnknownCount
  ctx.link = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  ctx.WIZ_MEM.zero = null;
  if (ctx.matrixUnknownCount() !== 6) throw new Error(file + ': all unknown');
  ctx.syncLinkManualZero(0, 1, 0);
  if (ctx.matrixUnknownCount() !== 5) throw new Error(file + ': zero counts as known');

  // известный замок - из locks-data.js и только по ИСХОДНЫМ штифтам
  ctx.N = 5;
  ctx.pins = [6, 3, 2, 1, 7];
  ctx.WIZ_MEM.base = null;
  const k = ctx.knownLockFor();
  if (!k || k.code !== 'SojAgCBDQA' || !/Скатти|Scatty/.test(k.name)) throw new Error(file + ': known lock by pins not found');
  ctx.WIZ_MEM.base = [6, 3, 2, 1, 6]; // пробы сдвинули штифты в расстановку Скатти - это другой замок
  if (ctx.knownLockFor()) throw new Error(file + ': must not match by shifted pins');
  ctx.WIZ_MEM.base = null;
  ctx.pins = [7, 1, 2, 2, 5];
  if (ctx.knownLockFor()) throw new Error(file + ': suggest: false must not be suggested');

  console.log(file + ': suggest merge + lockBasePins + known locks OK');
}
console.log('OK');
