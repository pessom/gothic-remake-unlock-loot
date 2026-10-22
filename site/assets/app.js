/* Решатель UnlockMyLoot: интерфейс, мастер связей, плеер, счётчик - общий код
   для RU и EN. Ядро решателя - в solver.js, тексты - через T() (русская фраза
   = ключ, перевод - в i18n.en.js), склонения - через plural(). */
var I18N = window.UML_I18N || { lang: 'ru', strings: {} };
/* русская фраза -> текст на языке страницы; {name} подставляется из vars.
   Имя T, а не t: локальные переменные t в коде перекрыли бы функцию. */
function T(s, vars) {
  var r = I18N.strings[s];
  if (r == null) r = s;
  if (vars) r = r.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
  return r;
}
/* форма слова по числу: одна / несколько (2-4) / много; правило - из словаря */
function plural(n, one, few, many) {
  return I18N.plural ? I18N.plural(n, T(one), T(few), T(many)) : T(many);
}

/* ===================== UI ===================== */
var N = 6;
var pins = [];
var link = [];
var pinsTouched = false;
var PINS_EDITED = {}; /* индексы штифтов, которые пользователь реально менял (для приглашения к помощнику) */

var SVG_NONE = '<svg width="7" height="7" viewBox="0 0 7 7"><circle cx="3.5" cy="3.5" r="2.6" fill="currentColor" opacity=".55"/></svg>';
var SVG_SAME = '<svg width="17" height="13" viewBox="0 0 15 11"><path d="M1 3h9m0 0L7 .5M10 3 7 5.5M4 8h9m0 0-3-2.5M13 8l-3 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
var SVG_OPP  = '<svg width="17" height="13" viewBox="0 0 15 11"><path d="M14 3H5m0 0 3-2.5M5 3l3 2.5M1 8h9m0 0L7 5.5M10 8l-3 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

/* ночной режим - один crossfade, без анимации сотен свойств */
function applyTheme(next) {
  var root = document.documentElement;
  root.classList.add('theme-changing');
  root.dataset.theme = next;
  try { localStorage.setItem('uml-theme', next); } catch (e) {}
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = next === 'dark' ? '#101214' : '#f7f8f9';
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.remove('theme-changing'); });
  });
}
document.getElementById('themeBtn').onclick = function () {
  var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  if (document.startViewTransition) {
    document.startViewTransition(function () { applyTheme(next); });
  } else {
    applyTheme(next);
  }
};

/* фоновая анимация штифтов за hero */
(function buildHeroBg() {
  var bg = document.getElementById('herobg');
  var rows = [
    { top: 8,  x0: '12vw', dur: 7.2,  del: 0,    op: .8  },
    { top: 20, x0: '78vw', dur: 8.6,  del: .9,   op: .55 },
    { top: 33, x0: '30vw', dur: 6.4,  del: 1.7,  op: .7  },
    { top: 46, x0: '88vw', dur: 9.4,  del: .4,   op: .5  },
    { top: 59, x0: '20vw', dur: 7.8,  del: 2.3,  op: .65 },
    { top: 72, x0: '70vw', dur: 6.9,  del: 1.2,  op: .8  },
    { top: 85, x0: '38vw', dur: 8.1,  del: 2.9,  op: .5  }
  ];
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    var tr = document.createElement('div');
    tr.className = 'bgtrack';
    tr.style.top = row.top + '%';
    var pin = document.createElement('div');
    pin.className = 'bgpin';
    pin.style.setProperty('--x0', row.x0);
    pin.style.setProperty('--dur', row.dur + 's');
    pin.style.setProperty('--del', row.del + 's');
    pin.style.setProperty('--op', row.op);
    tr.appendChild(pin);
    bg.appendChild(tr);
  }
})();

function init(n) {
  N = n;
  PINS_EDITED = {};
  pins = new Array(N).fill(4);
  link = [];
  for (var i = 0; i < N; i++) link.push(new Array(N).fill(0));
  wizMemReset();
  renderCount(); renderPins(); renderDeps();
  document.getElementById('solution').style.display = 'none';
}

function setPlateCount(c) {
  if (c < 3 || c > 8 || c === N) return;
  var oldPins = pins, oldLink = link, oldN = N;
  N = c;
  pins = new Array(N).fill(4);
  link = [];
  for (var i = 0; i < N; i++) link.push(new Array(N).fill(0));
  for (var i2 = 0; i2 < Math.min(oldN, N); i2++) {
    pins[i2] = oldPins[i2];
    for (var j = 0; j < Math.min(oldN, N); j++) link[i2][j] = oldLink[i2][j];
  }
  wizMemReset();
  renderCount(); renderPins(); renderDeps();
}
function renderCount() {
  var row = document.getElementById('countrow');
  row.innerHTML =
    T('<button type="button" class="countstep" id="countMinus" aria-label="Меньше плиток"') + (N <= 3 ? ' disabled' : '') + '>&minus;</button>' +
    '<span class="countval"><b>' + N + '</b> ' + plural(N, T('плитка'), T('плитки'), T('плиток')) + '</span>' +
    T('<button type="button" class="countstep" id="countPlus" aria-label="Больше плиток"') + (N >= 8 ? ' disabled' : '') + '>+</button>';
  document.getElementById('countMinus').onclick = function () { setPlateCount(N - 1); };
  document.getElementById('countPlus').onclick = function () { setPlateCount(N + 1); };
}

/* порядок строк: по умолчанию как в игре - 1 снизу (дальняя → ближняя);
   кнопка переворачивает, выбор запоминается. Ссылки ?lock= на порядок не влияют. */
var FLIP = true;
try {
  var flipPref = localStorage.getItem('uml-flip');
  if (flipPref === '1') FLIP = true;
  else if (flipPref === '0') FLIP = false;
} catch (e) {}

function plateOrder() {
  var order = [];
  for (var i = 0; i < N; i++) order.push(i);
  if (FLIP) order.reverse();
  return order;
}

function rowLabel(i) {
  var side = i === 0 ? T('ближняя') : (i === N - 1 ? T('дальняя') : '');
  return T('<span class="rlbl">плитка </span><b>') + (i + 1) + '</b>' +
    (side ? '<span class="pside">' + side + '</span>' : '');
}

function renderPins() {
  var t = document.getElementById('pins');
  var html = T('<tr><th class="corner">плитка &darr;<br>позиция &rarr;</th>');
  for (var p = 1; p <= 7; p++) html += '<th class="colh">' + p + '</th>';
  html += '</tr>';
  var order = plateOrder();
  for (var k = 0; k < order.length; k++) {
    var i = order[k];
    html += '<tr data-plate="' + i + '"><th class="rowh">' + rowLabel(i) + '</th>';
    for (var p2 = 1; p2 <= 7; p2++) {
      var cls = 'hole' + (p2 === 4 ? ' center' : '') +
        (pins[i] === p2 ? (p2 === 4 ? ' pin atgoal' : ' pin') : '');
      html += '<td><button type="button" class="' + cls + '" data-i="' + i + '" data-p="' + p2 +
        T('" title="Плитка ') + (i + 1) + T(', позиция ') + p2 + '">' + p2 + '</button></td>';
    }
    html += '</tr>';
  }
  t.innerHTML = html;
  updateLinkHelpBtn();
}

/* FLIP-анимация перестановки строк: замеряем позиции до, рендерим,
   возвращаем строки transform'ом на старые места и отпускаем с пружиной */
function animateRowSwap(tableIds, rerender) {
  var reduced = false;
  try {
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}
  var before = {};
  if (!reduced) {
    tableIds.forEach(function (id) {
      var rows = document.querySelectorAll('#' + id + ' tr[data-plate]');
      for (var r = 0; r < rows.length; r++)
        before[id + '-' + rows[r].getAttribute('data-plate')] = rows[r].getBoundingClientRect().top;
    });
  }
  rerender();
  if (reduced) return;
  var animated = [];
  tableIds.forEach(function (id) {
    var rows = document.querySelectorAll('#' + id + ' tr[data-plate]');
    for (var r = 0; r < rows.length; r++) {
      var el = rows[r];
      var key = id + '-' + el.getAttribute('data-plate');
      if (!(key in before)) continue;
      var delta = before[key] - el.getBoundingClientRect().top;
      if (!delta) continue;
      el.style.transition = 'none';
      el.style.transform = 'translateY(' + delta + 'px)';
      animated.push({ el: el, idx: r });
    }
  });
  if (!animated.length) return;
  void document.body.offsetHeight; /* фиксируем стартовые позиции */
  animated.forEach(function (a) {
    a.el.style.transition = 'transform .55s cubic-bezier(.34,1.56,.64,1) ' + (a.idx * 35) + 'ms';
    a.el.style.transform = '';
  });
  setTimeout(function () {
    animated.forEach(function (a) {
      a.el.style.transition = '';
      a.el.style.transform = '';
    });
  }, 900);
}

(function bindPins() {
  document.getElementById('pins').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.hole[data-i]') : null;
    if (!b) return;
    pinsTouched = true;
    PINS_EDITED[+b.dataset.i] = true;
    pins[+b.dataset.i] = +b.dataset.p;
    if (!TRACK_PINS_SENT) { TRACK_PINS_SENT = true; trackEvent('pins_edit'); }
    /* Правка штифтов = новая попытка/замок. Сбрасываем СНИМОК и ПРОГРЕСС
       помощника (base + zero), иначе при след. открытии мастер «продолжит»
       со старой картой известных ячеек (resume) и применит связи прошлого
       замка - отсюда «связи сами сдвигаются». СВЯЗИ НЕ ТРОГАЕМ: они могут
       быть верными (человек просто поправил позицию). Старое решение прячем,
       чтобы оно не вводило в заблуждение - пользователь перевзломает. */
    wizMemReset();
    if (SOL) { SOL = null; document.getElementById('solution').style.display = 'none'; }
    renderPins();
  });
  var fb = document.getElementById('flipBtn');
  fb.onclick = function () {
    FLIP = !FLIP;
    try { localStorage.setItem('uml-flip', FLIP ? '1' : '0'); } catch (e) {}
    updateFlipLabel();
    animateRowSwap(['pins', 'deps'], function () {
      renderPins();
      renderDeps();
    });
  };
  updateFlipLabel();
})();

/* Плавный показ/скрытие подсказки: высота + отступы + лёгкий сдвиг. Анимируем
   и margin/padding, чтобы при сворачивании не оставалось пустого блока, а потом
   резкого прыжка. Меряем реальные значения - работает для любой длины текста. */
function slideClearAnim(el) {
  el.style.maxHeight = ''; el.style.opacity = ''; el.style.transform = '';
  el.style.overflow = ''; el.style.transition = '';
  el.style.marginTop = ''; el.style.marginBottom = '';
  el.style.paddingTop = ''; el.style.paddingBottom = '';
}
function slideToggle(el, show) {
  if (!el) return;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  if (el._slideT) { clearTimeout(el._slideT); el._slideT = 0; }
  var EASE = 'cubic-bezier(.4,0,.2,1)';
  var TR = 'max-height .32s ' + EASE + ', opacity .27s ease, transform .32s ' + EASE +
           ', margin .32s ' + EASE + ', padding .32s ' + EASE;
  if (reduce) { el.hidden = !show; slideClearAnim(el); return; }
  if (show) {
    el.hidden = false;
    el.style.transition = 'none'; el.style.overflow = 'hidden';
    el.style.maxHeight = 'none'; el.style.opacity = '1'; el.style.transform = 'none';
    el.style.marginTop = ''; el.style.marginBottom = ''; el.style.paddingTop = ''; el.style.paddingBottom = '';
    var cs = getComputedStyle(el);
    var h = el.scrollHeight, mt = cs.marginTop, mb = cs.marginBottom, pt = cs.paddingTop, pb = cs.paddingBottom;
    el.style.maxHeight = '0px'; el.style.opacity = '0'; el.style.transform = 'translateY(-6px)';
    el.style.marginTop = '0px'; el.style.marginBottom = '0px'; el.style.paddingTop = '0px'; el.style.paddingBottom = '0px';
    void el.offsetHeight;
    el.style.transition = TR;
    el.style.maxHeight = h + 'px'; el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    el.style.marginTop = mt; el.style.marginBottom = mb; el.style.paddingTop = pt; el.style.paddingBottom = pb;
    el._slideT = setTimeout(function () { el._slideT = 0; if (!el.hidden) slideClearAnim(el); }, 350);
  } else {
    var cs2 = getComputedStyle(el);
    el.style.overflow = 'hidden'; el.style.transition = 'none';
    el.style.maxHeight = el.scrollHeight + 'px'; el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    el.style.marginTop = cs2.marginTop; el.style.marginBottom = cs2.marginBottom;
    el.style.paddingTop = cs2.paddingTop; el.style.paddingBottom = cs2.paddingBottom;
    void el.offsetHeight;
    el.style.transition = TR;
    el.style.maxHeight = '0px'; el.style.opacity = '0'; el.style.transform = 'translateY(-6px)';
    el.style.marginTop = '0px'; el.style.marginBottom = '0px'; el.style.paddingTop = '0px'; el.style.paddingBottom = '0px';
    el._slideT = setTimeout(function () { el._slideT = 0; el.hidden = true; slideClearAnim(el); }, 340);
  }
}
/* «?» у заголовков шагов на главной: разворачивают/прячут описание шага */
(function bindStepHelp() {
  document.addEventListener('click', function (e) {
    var q = e.target.closest ? e.target.closest('.pq') : null;
    if (!q) return;
    var head = q.closest('.phead');
    var desc = head && head.querySelector('.pdesc');
    if (!desc) return;
    var show = desc.hidden;
    slideToggle(desc, show);
    q.classList.toggle('on', show);
    q.setAttribute('aria-expanded', show ? 'true' : 'false');
  });
})();

var DEPSTATE = [
  { v: 0,  cls: '',     icon: SVG_NONE, txt: T('не двигается') },
  { v: 1,  cls: 'same', icon: SVG_SAME, txt: T('в ту же сторону') },
  { v: -1, cls: 'opp',  icon: SVG_OPP,  txt: T('в противоположную') }
];
function depMeta(v) {
  return DEPSTATE.find(function (s) { return s.v === v; });
}

var FILL_CELLS = null; /* карта "i,j"->true: связи, которые только что подставили (для каскадной анимации) */
function renderDeps() {
  var df = 0;
  var t = document.getElementById('deps');
  var html = T('<tr><th class="corner">двигаю &darr;<br>реагирует &rarr;</th>');
  for (var j = 0; j < N; j++) html += '<th class="colh" id="ch' + j + '">' + (j + 1) + '</th>';
  html += '</tr>';
  var order = plateOrder();
  for (var k = 0; k < order.length; k++) {
    var i = order[k];
    html += '<tr data-plate="' + i + '"><th class="rowh" id="rh' + i + '">' + rowLabel(i) + '</th>';
    for (var j2 = 0; j2 < N; j2++) {
      if (i === j2) {
        html += '<td><span class="dep diag"></span></td>';
      } else {
        var st = depMeta(link[i][j2]);
        var fa = (FILL_CELLS && FILL_CELLS[i + ',' + j2]);
        html += '<td><button type="button" class="dep ' + st.cls + (fa ? ' sgfill' : '') + '"' +
          (fa ? ' style="--sgi:' + Math.min(df++, 10) + '"' : '') +
          ' data-i="' + i + '" data-j="' + j2 +
          T('" title="Плитка ') + (i + 1) + T(' двигается - плитка ') + (j2 + 1) + ': ' + st.txt + '">' +
          st.icon + '</button></td>';
      }
    }
    html += '</tr>';
  }
  t.innerHTML = html;
  renderLinkSum();
}

function renderLinkSum() {
  var box = document.getElementById('linksum');
  var html = '', sf = 0;
  for (var i = 0; i < N; i++)
    for (var j = 0; j < N; j++)
      if (i !== j && link[i][j]) {
        var st = depMeta(link[i][j]);
        var fa = (FILL_CELLS && FILL_CELLS[i + ',' + j]);
        html += '<button type="button" class="lchip ' + st.cls + (fa ? ' sgfill' : '') + '"' +
          (fa ? ' style="--sgi:' + Math.min(sf++, 10) + '"' : '') +
          ' data-i="' + i + '" data-j="' + j +
          T('" title="Связь: плитка ') + (i + 1) + T(' тянет плитку ') + (j + 1) + ' ' + st.txt +
          T('. Нажми, чтобы убрать.">') + (i + 1) + '&rarr;' + (j + 1) + ' ' + st.icon +
          '<span class="x">&times;</span></button>';
      }
  box.innerHTML = html ||
    T('<span class="lempty">Связи не отмечены. Если плитки замка двигаются независимо - так и оставь, просто жми &laquo;Взломать&raquo;.</span>');
}

(function bindDeps() {
  var t = document.getElementById('deps');
  t.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.dep[data-i]') : null;
    if (!b) return;
    var i = +b.dataset.i, j = +b.dataset.j;
    var idx = DEPSTATE.findIndex(function (s) { return s.v === link[i][j]; });
    var st = DEPSTATE[(idx + 1) % 3];
    link[i][j] = st.v;
    syncLinkManualZero(i, j, st.v);
    b.className = 'dep ' + st.cls;
    b.innerHTML = st.icon;
    b.title = T('Плитка ') + (i + 1) + T(' двигается - плитка ') + (j + 1) + ': ' + st.txt;
    renderLinkSum();
  });
  t.addEventListener('mouseover', function (e) {
    var b = e.target.closest ? e.target.closest('.dep[data-i]') : null;
    if (!b) return;
    var ch = document.getElementById('ch' + b.dataset.j);
    var rh = document.getElementById('rh' + b.dataset.i);
    if (ch) ch.classList.add('hl');
    if (rh) rh.classList.add('hl');
  });
  t.addEventListener('mouseout', function (e) {
    var b = e.target.closest ? e.target.closest('.dep[data-i]') : null;
    if (!b) return;
    var ch = document.getElementById('ch' + b.dataset.j);
    var rh = document.getElementById('rh' + b.dataset.i);
    if (ch) ch.classList.remove('hl');
    if (rh) rh.classList.remove('hl');
  });
  document.getElementById('linksum').addEventListener('click', function (e) {
    var c = e.target.closest ? e.target.closest('.lchip') : null;
    if (!c) return;
    link[+c.dataset.i][+c.dataset.j] = 0;
    wizEnsureZero();
    WIZ_MEM.zero[+c.dataset.i][+c.dataset.j] = false;
    renderDeps();
  });
})();

/* ---------- мастер безопасного поиска связей ---------- */
var LINK_WIZ = null;
/* память мастера между открытиями: подтверждённые "нет связи", исходные позиции
   замка (для R) и ячейки из подсказки, которые ещё не сверены с игрой (unv) */
var WIZ_MEM = { zero: null, base: null, unv: null };
function wizMemReset() {
  WIZ_MEM.zero = null;
  WIZ_MEM.base = null;
  WIZ_MEM.unv = null;
}
function wizEnsureZero() {
  if (!WIZ_MEM.zero || WIZ_MEM.zero.length !== N) WIZ_MEM.zero = wizMk2d(false);
}
function wizEnsureUnv() {
  if (!WIZ_MEM.unv || WIZ_MEM.unv.length !== N) WIZ_MEM.unv = wizMk2d(false);
}
/* ячейка матрицы известна: явная связь или подтверждённое «нет связи» */
function linkCellKnown(i, j) {
  if (link[i][j] !== 0) return true;
  return !!(WIZ_MEM.zero && WIZ_MEM.zero[i][j]);
}
function matrixUnknownCount() {
  var n = 0;
  for (var i = 0; i < N; i++)
    for (var j = 0; j < N; j++)
      if (i !== j && !linkCellKnown(i, j)) n++;
  return n;
}
function matrixNeedsSuggest() {
  return pinsConfigured() && matrixUnknownCount() > 0;
}
function syncLinkManualZero(i, j, v) {
  wizEnsureZero();
  WIZ_MEM.zero[i][j] = (v === 0);
  if (WIZ_MEM.unv && WIZ_MEM.unv.length === N) WIZ_MEM.unv[i][j] = false; /* ручная отметка - решение пользователя */
}
function wizSyncPins(wiz) {
  for (var i = 0; i < N; i++) pins[i] = wiz.sim[i];
  pinsTouched = true;
  renderPins();
}
var WIZ_SVG_L = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M14 6H6v8M6 6l10 10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var WIZ_SVG_CHECK = '<svg class="wizchip-check" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5 5.6 10.6 11.5 3.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var WIZ_SVG_ARR_L = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M19 12H5m0 0 6-6m-6 6 6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var WIZ_SVG_ARR_R = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var WIZ_SVG_R = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M10 6h8v8M18 6 8 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function pinsConfigured() {
  return pinsTouched && pins.length === N;
}
/* приглашение - только когда пользователь поменял минимум 2 РАЗНЫХ штифта
   (после одного - рано). Не привязываемся к числу штифтов на 4: комбинации
   разные, ряды не обязательно все заполнены. */
function pinsEnteredEnough() {
  if (!pinsConfigured()) return false;
  var n = 0;
  for (var k in PINS_EDITED) if (PINS_EDITED[k]) n++;
  return n >= 2;
}
function updateLinkHelpBtn() {
  var b = document.getElementById('linkHelpBtn');
  if (!b) return;
  var ok = pinsConfigured();
  b.disabled = !ok;
  b.title = ok
    ? T('Пошагово найти связи без удара в стену')
    : T('Сначала укажи позиции штифтов на шаге 02');
}
function plateMoveLabel(d) {
  return d > 0 ? T('ВЛЕВО') : T('ВПРАВО');
}
/* wiz-core-start
   Механика игры: если связанная плитка упёрлась бы в стену (штифт за [1,7]),
   весь ход НЕ происходит - она дёргается на месте, отмычка теряет прочность,
   позиции не меняются. Если все связанные в пределах - ход проходит, они
   съезжают на link[i][j]*d. Удачная проба закрывает всю строку i; неудачная
   даёт связь только по дёрнувшимся - к плитке возвращаемся позже, когда
   блокирующую уведут от стены другие ходы. */
function wizMk2d(fill) {
  var a = [];
  for (var i = 0; i < N; i++) { a[i] = []; for (var j = 0; j < N; j++) a[i][j] = fill; }
  return a;
}
/* строку нужно пробовать, пока в ней есть неизвестные ячейки или ячейки из
   подсказки, не сверенные с игрой: по непроверенной строке нельзя ни решать,
   ни делать вспомогательные ходы - при ошибке в подсказке позиции разъедутся. */
function wizRowNeedsProbe(wiz, i) {
  for (var j = 0; j < N; j++) {
    if (j === i) continue;
    if (link[i][j] === 0 && !wiz.confirmedZero[i][j]) return true;
    if (wiz.unverified && wiz.unverified[i][j]) return true;
  }
  return false;
}
function wizRowsLeft(wiz) {
  var n = 0;
  for (var i = 0; i < N; i++) if (wizRowNeedsProbe(wiz, i)) n++;
  return n;
}
function wizKnownJerksAt(sim, i, d) {
  var n = 0;
  for (var j = 0; j < N; j++) {
    if (j === i || !link[i][j]) continue;
    var p = sim[j] + link[i][j] * d;
    if (p < 1 || p > 7) n++;
  }
  return n;
}
function wizPickDirAt(sim, i) {
  var best = null, bestScore = Infinity;
  for (var di = 0; di < 2; di++) {
    var d = di === 0 ? 1 : -1;
    var p = sim[i] + d;
    if (p < 1 || p > 7) continue;
    if (wizKnownJerksAt(sim, i, d) > 0) continue;
    var score = Math.abs(p - 4);
    if (score < bestScore) { bestScore = score; best = d; }
  }
  return best;
}
function wizSimKnownMove(sim, i, d) {
  var nxt = sim.slice();
  nxt[i] += d;
  for (var j = 0; j < N; j++) {
    if (j === i || !link[i][j]) continue;
    nxt[j] += link[i][j] * d;
  }
  return nxt;
}
function wizPredictKnownMovers(wiz, cmd) {
  var i = cmd.driver, d = cmd.d;
  var movers = [];
  for (var j = 0; j < N; j++) {
    if (j === i) continue;
    var L = link[i][j];
    if (!L) continue;
    movers.push({ plate: j, link: L, jerk: false });
  }
  return movers;
}
function wizFindHelper(wiz) {
  /* BFS по безопасным ходам уже проверенных плиток: ищем кратчайший путь до
     состояния, где какую-то незавершённую строку снова можно безопасно пробовать
     (увести блокирующие плитки от стены может потребоваться за несколько ходов).
     Возвращаем ПЕРВЫЙ ход пути - wizNextCmd пересчитает и продолжит.
     Двигаем только полностью проверенные плитки, поэтому отмычка не ломается. */
  var probed = [];
  for (var k = 0; k < N; k++) if (!wizRowNeedsProbe(wiz, k)) probed.push(k);
  if (!probed.length) return null;
  var seen = {};
  seen[wiz.sim.join(',')] = 1;
  var queue = [{ sim: wiz.sim, first: null }];
  var guard = 0;
  while (queue.length && guard++ < 6000) {
    var cur = queue.shift();
    for (var pi = 0; pi < probed.length; pi++) {
      var p = probed[pi];
      for (var di = 0; di < 2; di++) {
        var d = di === 0 ? 1 : -1;
        if (cur.sim[p] + d < 1 || cur.sim[p] + d > 7) continue;
        if (wizKnownJerksAt(cur.sim, p, d) > 0) continue;
        var nxt = wizSimKnownMove(cur.sim, p, d);
        var key = nxt.join(',');
        if (seen[key]) continue;
        seen[key] = 1;
        var first = cur.first || { driver: p, d: d, helper: true };
        for (var i = 0; i < N; i++) {
          if (wizRowNeedsProbe(wiz, i) && wizPickDirAt(nxt, i) !== null) return first;
        }
        queue.push({ sim: nxt, first: first });
      }
    }
  }
  return null;
}
function wizNextCmd(wiz) {
  for (var i = 0; i < N; i++) {
    if (!wizRowNeedsProbe(wiz, i)) continue;
    var d = wizPickDirAt(wiz.sim, i);
    if (d !== null) return { driver: i, d: d };
  }
  if (wizRowsLeft(wiz) > 0) return wizFindHelper(wiz);
  return null;
}
function wizMoverOptions(oldPin, d) {
  var opts = [];
  for (var s = 0; s < 2; s++) {
    var L = s === 0 ? 1 : -1;
    var p = oldPin + L * d;
    var jerk = p < 1 || p > 7;
    opts.push({ link: L, pos: jerk ? oldPin : p, jerk: jerk });
  }
  return opts;
}
function wizApplyOutcome(wiz, cmd, movers) {
  var i = cmd.driver, d = cmd.d;
  var failed = false;
  for (var m = 0; m < movers.length; m++) if (movers[m].jerk) failed = true;
  for (var m2 = 0; m2 < movers.length; m2++) {
    if (failed && !movers[m2].jerk) continue;
    link[i][movers[m2].plate] = movers[m2].link;
    if (wiz.unverified) wiz.unverified[i][movers[m2].plate] = false;
  }
  if (!failed) {
    if (wiz.unverified) for (var u = 0; u < N; u++) wiz.unverified[i][u] = false;
    var nxt = wiz.sim.slice();
    nxt[i] += d;
    var seen = {};
    for (var m3 = 0; m3 < movers.length; m3++) {
      var j = movers[m3].plate;
      seen[j] = true;
      nxt[j] += movers[m3].link * d;
    }
    for (var k = 0; k < N; k++) {
      if (k === i || seen[k]) continue;
      link[i][k] = 0;
      wiz.confirmedZero[i][k] = true;
    }
    wiz.sim = nxt;
  }
  wiz.step++;
  return failed;
}
/* известные связи, которые пользователь не отметил при успешном ходе. Перед тем
   как записать «нет связи», переспрашиваем: одна пропущенная отметка иначе молча
   стирает связь, и позиции мастера расходятся с игрой. */
function wizDroppedKnown(wiz, cmd, movers) {
  var seen = {};
  for (var m = 0; m < movers.length; m++) {
    if (movers[m].jerk) return [];
    seen[movers[m].plate] = true;
  }
  var out = [];
  for (var j = 0; j < N; j++)
    if (j !== cmd.driver && link[cmd.driver][j] && !seen[j]) out.push(j);
  return out;
}
/* wiz-core-end */
function wizFlashDeps(driver, movers) {
  for (var m = 0; m < movers.length; m++) {
    var b = document.querySelector('.dep[data-i="' + driver + '"][data-j="' + movers[m].plate + '"]');
    if (b) {
      b.classList.remove('wizflash');
      void b.offsetWidth;
      b.classList.add('wizflash');
    }
  }
}
function wizApplyReport(wiz, cmd, movers) {
  var failed = wizApplyOutcome(wiz, cmd, movers);
  renderDeps();
  wizFlashDeps(cmd.driver, movers);
  return failed;
}
function wizRenderPinsBar(st, hi) {
  var html = '<div class="wizpins">';
  for (var i = 0; i < N; i++) {
    var wall = st[i] === 1 || st[i] === 7;
    var cls = 'wizpin' + (wall ? ' wall' : '') + (hi === i ? ' on' : '');
    html += '<span class="' + cls + '"><b>' + (i + 1) + '</b>→' + st[i] + '</span>';
  }
  return html + '</div>';
}
function wizProgress(wiz) {
  var el = document.getElementById('linkWizProg');
  var bar = document.getElementById('linkWizProgBar');
  if (!el || !bar) return;
  el.hidden = false;
  var left = wizRowsLeft(wiz);
  var pct = wiz.rows0 ? Math.min(100, Math.round((1 - left / wiz.rows0) * 100)) : 100;
  bar.style.width = pct + '%';
}
function wizRenderIntro() {
  var wiz = LINK_WIZ;
  document.getElementById('linkWizTitle').textContent = T('Безопасный поиск связей');
  document.getElementById('linkWizSub').textContent =
    T('Обычно один ход на плитку. Сдвинул в игре и отметил, кто дёрнулся. Дальше считаем сами.');
  wizHelpInline();
  document.getElementById('linkWizProg').hidden = true;
  document.getElementById('linkWizBody').innerHTML =
    '<div id="wizSuggest"></div>' +
    T('<p class="wizwhy">Откатывать ходы не нужно: следующая команда учитывает новые позиции. Найденные связи остаются, даже если случайно сбросишь замок.</p>') +
    wizRenderPinsBar(wiz.sim);
  document.getElementById('linkWizBody').classList.remove('dir-left');
  document.getElementById('linkWizFoot').innerHTML =
    '<div class="wizfoot-actions">' +
    T('<button class="btn ghost" type="button" id="wizCancelIntro">Отмена</button>') +
    T('<button class="btn primary" type="button" id="wizStart">Начать</button></div>');
  document.getElementById('wizStart').onclick = function () { wizRenderStep(); };
  document.getElementById('wizCancelIntro').onclick = closeLinkWizard;
  wizMaybeSuggest();
  wizSyncPanelMode();
}
/* подсказка связей из копилки прямо в помощнике: если расстановку уже вскрывали,
   предлагаем подставить известные связи и добить остальное пробами. */
function wizMaybeSuggest() {
  var slot = document.getElementById('wizSuggest');
  if (!slot || !matrixNeedsSuggest()) return;
  suggestLookup(function (d) {
    if (!d || !d.found || !LINK_WIZ) return;
    var el = document.getElementById('wizSuggest');
    if (!el || !matrixNeedsSuggest()) return;
    var unk = matrixUnknownCount();
    var lc = LOCK_COUNTS[d.code];
    var lcStr = (typeof lc === 'number') ? T(' Открыт <b>') + lc + T('</b> раз.') : '';
    var lead = d.name
      ? T('Похоже на замок: <b>') + d.name + '</b>.' + lcStr + T(' <b>Важно:</b> связи верны только без прокачанного навыка взлома. Проверь матрицу, а если ход не совпал - напиши в комментариях на DTF или в личку.')
      : T('Эту расстановку уже вскрывали <b>') + d.count + T('</b> раз. <b>Важно:</b> связи верны только без прокачанного навыка взлома. Проверь матрицу, а если ход не совпал - напиши в комментариях на DTF или в личку.');
    el.innerHTML = '<div class="wizsuggest">' +
      T('<div class="wizsuggest-head"><span class="beta-chip">Бета</span><p>') + lead + ' ' +
      T('(сейчас неизвестно <b>{n}</b> {links})', { n: unk, links: plural(unk, T('связь'), T('связи'), T('связей')) }) + '</p></div>' +
      T('<button class="btn primary" type="button" id="wizSgYes">Подставить связи и продолжить</button></div>');
    document.getElementById('wizSgYes').onclick = function () {
      var n = applySuggestedLinks(d.code);
      if (n < 0) { trackEvent('suggest_apply_fail'); return; }
      trackEvent('suggest_apply_ok');
      LINK_WIZ.sim = pins.slice();
      LINK_WIZ.confirmedZero = WIZ_MEM.zero;
      LINK_WIZ.unverified = WIZ_MEM.unv;
      LINK_WIZ.rows0 = wizRowsLeft(LINK_WIZ);
      /* подсказка - только ожидание: каждую подставленную строку мастер сверит
         одной пробой, ожидаемые плитки будут отмечены заранее */
      toast(SUGGEST_CONFLICTS
        ? T('Подставлено: ') + n + T(', но ') + SUGGEST_CONFLICTS + T(' яч. отличались от твоих отметок')
        : T('Подставлено связей: ') + n + T(' - сверим их пробами, ожидаемое отмечу заранее'));
      wizRenderStep();
    };
  });
}
function wizFinishStep(wiz, c, movers, lockReset) {
  if (c.helper) {
    trackEvent('wizard_helper');
    // вспомогательный ход: связи этой плитки уже известны - применяем их сами,
    // чтобы случайное «Дальше» без отметок не стёрло найденные связи.
    movers = wizPredictKnownMovers(wiz, c);
    lockReset = false;
  } else trackEvent(movers.length ? 'wizard_step_marked' : 'wizard_step_none');
  var failed = wizApplyReport(wiz, c, movers);
  if (lockReset) {
    wiz.sim = WIZ_MEM.base.slice();
    toast(T('Связь записана. Замок сбросился: штифты вернулись к исходным'));
  } else if (failed) {
    toast(T('Ход не прошёл. Связь записана, к этой плитке вернёмся позже'));
  }
  wizSyncPins(wiz);
  wiz.cmd = null;
  wizRenderStep();
}
/* ===== визуальный режим мастера: тот же мозг (movers/links), другой вид ===== */
var WIZ_VIEW = 'visual';
try { if (localStorage.getItem('uml-wizmode') === 'text') WIZ_VIEW = 'text'; } catch (e) {}
var WV_SVG_L = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M11 5l-7 7 7 7M4 12h16" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var WV_SVG_R = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 5l7 7-7 7M20 12H4" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function wizSyncModeBtns() {
  var bs = document.querySelectorAll('#linkWizMode .wizmode-b');
  for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-m') === WIZ_VIEW);
}
function wizSyncPanelMode() {
  var panel = document.querySelector('#linkWizBack .wizpanel');
  if (!panel) return;
  panel.classList.toggle('wizpanel--visual', WIZ_VIEW === 'visual' && !!LINK_WIZ && !!LINK_WIZ.cmd);
}
function wizSetView(v, render) {
  WIZ_VIEW = (v === 'text') ? 'text' : 'visual';
  try { localStorage.setItem('uml-wizmode', WIZ_VIEW); } catch (e) {}
  wizSyncModeBtns();
  wizSyncPanelMode();
  if (render && LINK_WIZ && LINK_WIZ.cmd) wizRenderStep();
}
(function () {
  var m = document.getElementById('linkWizMode');
  if (m) m.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.wizmode-b') : null;
    if (b) wizSetView(b.getAttribute('data-m'), true);
  });
  var hb = document.getElementById('wizHelpBtn');
  if (hb) hb.addEventListener('click', function () {
    var sub = document.getElementById('linkWizSub');
    if (!sub) return;
    var show = sub.hidden;
    slideToggle(sub, show);
    hb.classList.toggle('on', show);
    hb.setAttribute('aria-expanded', show ? 'true' : 'false');
  });
})();
/* сброс инлайн-стилей анимации (чтобы при смене шага поповер не «залип») */
function wizSubClearAnim(sub) {
  if (!sub) return;
  if (sub._slideT) { clearTimeout(sub._slideT); sub._slideT = 0; }
  slideClearAnim(sub);
}
/* Экран ШАГА: описание/подсказку прячем за «?» рядом с заголовком (компактно). */
function wizHelpStep() {
  var sub = document.getElementById('linkWizSub'), hb = document.getElementById('wizHelpBtn');
  if (sub) { wizSubClearAnim(sub); sub.classList.add('wizsub-pop'); sub.hidden = true; }
  if (hb) { hb.hidden = false; hb.classList.remove('on'); hb.setAttribute('aria-expanded', 'false'); }
}
/* Экран интро/итога: текст показываем обычным образом, «?» прячем. */
function wizHelpInline() {
  var sub = document.getElementById('linkWizSub'), hb = document.getElementById('wizHelpBtn');
  if (sub) { wizSubClearAnim(sub); sub.classList.remove('wizsub-pop'); sub.hidden = false; }
  if (hb) hb.hidden = true;
}
/* для каждой не-драйверной плитки: вариант «плитка влево» и «плитка вправо» */
function wvOptsFor(wiz, j, d) {
  var opts = wizMoverOptions(wiz.sim[j], d), L = null, R = null;
  for (var s = 0; s < opts.length; s++) {
    var o = opts[s];
    if (o.link * d > 0) L = o; else R = o;   // штифт вправо (link*d>0) = плитка влево
  }
  return { l: L, r: R };
}
var WMAP_PW = 118, WMAP_MARG = 11, WMAP_CENTER = 4, WMAP_STEP = (WMAP_PW - 2 * WMAP_MARG) / 6;
function wizMapPlateShift(pin) { return (WMAP_CENTER - pin) * WMAP_STEP; }
function wizMapPinLeft(pin) { return (WMAP_MARG + WMAP_STEP * (pin - 1)) + 'px'; }
function wizRenderSchematic(wiz, driver, d) {
  var moveLeft = d > 0;
  var dirCls = moveLeft ? 'wizmap--left' : 'wizmap--right';
  var capMove = moveLeft ? T('влево') : T('вправо');
  var scale = Math.max(0.68, Math.min(1.1, 5.94 / N)) * 1.5;
  var sceneH = Math.round(Math.max(226, 141 + N * 24));
  var layers = '';
  for (var p = 0; p < N; p++) {
    var active = p === driver;
    var pin = wiz.sim[p];
    var holes = '';
    for (var k = 0; k < 7; k++) {
      holes += '<span class="wizmap-hole' + (k === 3 ? ' wizmap-hole--c' : '') + '" style="left:' +
        (WMAP_MARG + WMAP_STEP * k) + 'px"></span>';
    }
    var arrow = active
      ? '<span class="wizmap-arrow wizmap-arrow--' + (moveLeft ? 'left' : 'right') + '" aria-hidden="true">' +
        (moveLeft ? WIZ_SVG_ARR_L : WIZ_SVG_ARR_R) + '</span>'
      : '';
    layers += '<div class="wizmap-layer" data-plate="' + p + '" style="--s:' + p + '"><div class="wizmap-plate' +
      (active ? ' active' : '') + '" data-j="' + p + '" style="--shift:' + wizMapPlateShift(pin) + 'px">' +
      '<span class="wizmap-num">' + (p + 1) + '</span><div class="wizmap-track"></div>' + holes +
      '<span class="wizmap-pin' + (pin === 4 ? ' lit' : '') + '" style="left:' + wizMapPinLeft(pin) + '"></span>' +
      '<span class="wizmap-react" hidden aria-hidden="true"></span>' + arrow + '</div></div>';
  }
  return '<div class="wizmap ' + dirCls + T('" id="linkWizMap" role="img" aria-label="Схема замка: сдвинь плитку ') +
    (driver + 1) + ' ' + capMove + '">' +
    '<div class="wizmap-scene" style="--wmap-n:' + N + ';height:' + sceneH + 'px">' +
    '<div class="wizmap-lock" style="--wmap-n:' + N + ';--wmap-scale:' + scale.toFixed(3) + '">' +
    layers + '</div></div></div>';
}
/* вспомогательный ход: связи плитки уже известны - не просим отмечать, просто
   показываем «сдвинь эту плитку (и кто за ней поедет) → Дальше»; связи мастер
   применит сам (wizFinishStep видит c.helper). */
function wizRenderHelperVisual(wiz, c) {
  var i = c.driver, d = c.d, dl = d > 0;
  var movers = wizPredictKnownMovers(wiz, c);
  var names = movers.map(function (m) { return (m.plate + 1); });
  document.getElementById('linkWizTitle').textContent = T('Плитка ') + (i + 1);
  document.getElementById('linkWizSub').innerHTML = T('Вспомогательный ход: уводим плитки от стены. Связи запишутся сами.');
  wizHelpStep();
  wizProgress(wiz);
  var wvBody = document.getElementById('linkWizBody');
  wvBody.classList.remove('dir-left'); wvBody.classList.add('wv-body');
  wizSyncPanelMode();
  var coText = movers.length
    ? T('Вместе с ней поедут <b>') + (movers.length > 1 ? T('плитки ') : T('плитка ')) + names.join(', ') + T('</b> - это уже известно, отмечать ничего не нужно.')
    : T('Никто за ней не потянется.');
  wvBody.innerHTML =
    '<div class="wv">' +
    wizRenderSchematic(wiz, i, d) +
    T('<p class="wv-helpnote">Это <b>уже проверенная плитка</b>. Сдвинь её <b>') + (dl ? T('влево') : T('вправо')) + T('</b> в игре, чтобы освободить другую. ') + coText + T(' Просто жми «Дальше».</p>') +
    '</div>';
  document.getElementById('linkWizFoot').innerHTML =
    '<div class="wizfoot-actions wizfoot-actions--single">' +
    T('<button class="btn primary" type="button" id="wizConfirm">Дальше</button></div>') +
    T('<p class="wizfoot-aside"><button type="button" id="wizGameReset">Случайно сбросил замок</button></p>');
  movers.forEach(function (m) {
    var layer = wvBody.querySelector('.wizmap-layer[data-plate="' + m.plate + '"]');
    var pl = layer && layer.querySelector('.wizmap-plate');
    if (!pl) return;
    var pin = pl.querySelector('.wizmap-pin'), react = pl.querySelector('.wizmap-react');
    var newPin = wiz.sim[m.plate] + m.link * d, moveLeft = (m.link * d > 0);
    pl.classList.add('shifted', moveLeft ? 'shift-left' : 'shift-right');
    if (pin) { pin.style.left = wizMapPinLeft(newPin); pin.classList.toggle('lit', newPin === 4); }
    pl.style.setProperty('--shift', wizMapPlateShift(newPin) + 'px');
    if (react) { react.hidden = false; react.className = 'wizmap-react wizmap-react--' + (moveLeft ? 'left' : 'right'); react.innerHTML = moveLeft ? WIZ_SVG_ARR_L : WIZ_SVG_ARR_R; }
  });
  document.getElementById('wizConfirm').onclick = function () { wizFinishStep(wiz, c, [], false); };
  document.getElementById('wizGameReset').onclick = function () {
    trackEvent('wizard_reset'); wiz.sim = WIZ_MEM.base.slice(); wizSyncPins(wiz); wiz.cmd = null;
    toast(T('Штифты вернулись к исходным, найденные связи сохранены')); wizRenderStep();
  };
}
function wizRenderStepVisual(wiz, c) {
  if (c.helper) { wizRenderHelperVisual(wiz, c); return; }
  var i = c.driver, d = c.d, dl = d > 0;          // dl = плитка-цель едет влево
  // плитки-ответы в естественном порядке; раскладку по колонкам делает CSS
  function seg(j, order) {
    var o = wvOptsFor(wiz, j, d);
    var lWall = o.l && o.l.jerk, rWall = o.r && o.r.jerk;
    return '<div class="wv-opt" data-j="' + j + '" style="--wi:' + order + '">' +
      '<div class="wv-tile-id"><b>' + (j + 1) + '</b><span>' + wiz.sim[j] + '</span></div>' +
      '<div class="wv-seg" data-j="' + j + '">' +
      '<button type="button" class="wv-b l' + (lWall ? ' wall' : '') + '" data-d="l">' + (lWall ? '!' : '←') + '</button>' +
      '<button type="button" class="wv-b c on" data-d="c">—</button>' +
      '<button type="button" class="wv-b r' + (rWall ? ' wall' : '') + '" data-d="r">' + (rWall ? '!' : '→') + '</button></div></div>';
  }
  var opts = '', order = 0;
  for (var j = 0; j < N; j++) { if (j === i) continue; opts += seg(j, order++); }
  document.getElementById('linkWizTitle').textContent = T('Плитка ') + (i + 1);
  document.getElementById('linkWizSub').innerHTML = c.helper
    ? T('Вспомогательный ход: увести плитку от стены. Связи уже известны.')
    : T('Сдвинь в игре <span class="wv-dir ') + (dl ? 'l' : 'r') + '">' + (dl ? T('влево') : T('вправо')) + T('</span> и отметь, какие плитки дёрнулись вместе с ней. Кнопка <b>!</b> — плитка упёрлась в стену.');
  wizHelpStep();
  wizProgress(wiz);
  var wvBody = document.getElementById('linkWizBody');
  wvBody.classList.remove('dir-left');
  wvBody.classList.add('wv-body');
  wizSyncPanelMode();
  wvBody.innerHTML =
    '<div class="wv">' +
    wizRenderSchematic(wiz, i, d) +
    '<div class="wv-opts">' + opts + '</div>' +
    wizPrefillNote(wiz, c) +
    '<label class="wv-reset" id="wvReset" hidden><input type="checkbox" id="wvResetCb">' +
    T('<span>Это была последняя ошибка: <b>замок сбросился</b>. Связь всё равно запишем, а штифты вернём к исходным позициям.</span></label>') +
    '</div>';
  document.getElementById('linkWizFoot').innerHTML =
    '<div class="wizfoot-actions wizfoot-actions--single">' +
    T('<button class="btn primary" type="button" id="wizConfirm">Дальше</button></div>') +
    T('<p class="wizfoot-aside"><button type="button" id="wizGameReset">Случайно сбросил замок</button></p>');
  wizBindVisualActions(wiz, c);
}
/* пояснение к заранее отмеченным плиткам: по известным связям (в т.ч. из подсказки) */
function wizPrefillNote(wiz, c) {
  var js = wizPredictKnownMovers(wiz, c).map(function (m) { return m.plate + 1; });
  if (!js.length) return '';
  return T('<p class="wizhelpnote">Заранее отмечено по известным связям: ') +
    (js.length > 1 ? T('плитки') : T('плитка')) + ' <b>' + js.join(', ') + T('</b>. Сверь с игрой и исправь, если что-то не так.</p>');
}
/* true - можно записывать; false - предупредили о снятой известной связи и ждём
   повторного нажатия (guard помнит, о каких плитках уже спросили) */
function wizCheckDropped(wiz, c, movers, guard) {
  var dropped = wizDroppedKnown(wiz, c, movers);
  if (!dropped.length) return true;
  var key = dropped.join(',');
  if (guard.key === key) return true;
  guard.key = key;
  var names = dropped.map(function (j) { return j + 1; }).join(', ');
  toast(dropped.length > 1
    ? T('Плитки ') + names + T(' по известным связям должны были сдвинуться. Если не двигались - нажми ещё раз')
    : T('Плитка ') + names + T(' по известной связи должна была сдвинуться. Если не двигалась - нажми ещё раз'));
  return false;
}
function wizBindVisualActions(wiz, c) {
  var i = c.driver, d = c.d;
  var state = {};                                 // j -> 'c'|'l'|'r'
  var pre = {};                                   // j -> заранее отмеченное направление
  var guard = {};
  for (var j = 0; j < N; j++) if (j !== i) state[j] = 'c';
  wizPredictKnownMovers(wiz, c).forEach(function (m) {
    pre[m.plate] = state[m.plate] = (m.link * d > 0) ? 'l' : 'r'; // штифт вправо = плитка влево
  });
  var body = document.getElementById('linkWizBody');
  function paint() {
    body.querySelectorAll('.wv-seg').forEach(function (s) {
      var j = +s.dataset.j;
      s.querySelectorAll('.wv-b').forEach(function (b) { b.classList.toggle('on', state[j] === b.dataset.d); });
    });
    body.querySelectorAll('.wizmap-layer').forEach(function (layer) {
      var j = +layer.dataset.plate; if (j === i) return;
      var pl = layer.querySelector('.wizmap-plate'); if (!pl) return;
      var pin = pl.querySelector('.wizmap-pin'), react = pl.querySelector('.wizmap-react');
      var basePin = wiz.sim[j];
      pl.classList.remove('shifted', 'shift-left', 'shift-right', 'shift-wall');
      if (react) { react.hidden = true; react.className = 'wizmap-react'; react.innerHTML = ''; }
      if (pin) { pin.style.left = wizMapPinLeft(basePin); pin.classList.toggle('lit', basePin === 4); }
      pl.style.setProperty('--shift', wizMapPlateShift(basePin) + 'px');
      var o = wvOptsFor(wiz, j, d);
      var opt = state[j] === 'l' ? o.l : (state[j] === 'r' ? o.r : null);
      if (!opt) return;
      var moveLeft = state[j] === 'l';
      pl.classList.add('shifted');
      if (react) react.hidden = false;
      if (opt.jerk) {
        pl.classList.add('shift-wall');
        if (react) { react.className = 'wizmap-react wizmap-react--wall'; react.textContent = '!'; }
      } else {
        pl.classList.add(moveLeft ? 'shift-left' : 'shift-right');
        if (pin) { pin.style.left = wizMapPinLeft(opt.pos); pin.classList.toggle('lit', opt.pos === 4); }
        pl.style.setProperty('--shift', wizMapPlateShift(opt.pos) + 'px');
        if (react) { react.className = 'wizmap-react wizmap-react--' + (moveLeft ? 'left' : 'right'); react.innerHTML = moveLeft ? WIZ_SVG_ARR_L : WIZ_SVG_ARR_R; }
      }
    });
    var anyWall = false;
    for (var k in state) { if (state[k] === 'l' && wvJerk(k, 'l')) anyWall = true; if (state[k] === 'r' && wvJerk(k, 'r')) anyWall = true; }
    var rb = document.getElementById('wvReset'); if (rb) { rb.hidden = !anyWall; if (!anyWall) document.getElementById('wvResetCb').checked = false; }
  }
  function wvJerk(j, dir) { var o = wvOptsFor(wiz, +j, d); return dir === 'l' ? (o.l && o.l.jerk) : (o.r && o.r.jerk); }
  body.querySelector('.wv-opts').onclick = function (e) {
    var b = e.target.closest ? e.target.closest('.wv-b') : null; if (!b) return;
    state[+b.closest('.wv-seg').dataset.j] = b.dataset.d; paint();
  };
  document.getElementById('wizConfirm').onclick = function () {
    var movers = [], jerks = 0, slides = 0, ownSlides = 0;
    for (var j = 0; j < N; j++) {
      if (j === i || state[j] === 'c') continue;
      var o = wvOptsFor(wiz, j, d), opt = state[j] === 'l' ? o.l : o.r;
      if (!opt) continue;
      if (opt.jerk) jerks++; else { slides++; if (pre[j] !== state[j]) ownSlides++; }
      movers.push({ plate: j, link: opt.link, jerk: opt.jerk });
    }
    /* ход упёрся - заранее отмеченные «съезды» не случились, их просто отбрасываем */
    if (jerks > 0 && ownSlides > 0) { toast(T('Если кто-то упёрся в стену, ход не прошёл - съехать никто не мог. Проверь отметки')); return; }
    if (jerks > 0 && slides > 0) movers = movers.filter(function (m) { return m.jerk; });
    if (!jerks && !wizCheckDropped(wiz, c, movers, guard)) return;
    var lockReset = jerks > 0 && document.getElementById('wvResetCb').checked;
    wizFinishStep(wiz, c, movers, lockReset);
  };
  document.getElementById('wizGameReset').onclick = function () {
    trackEvent('wizard_reset'); wiz.sim = WIZ_MEM.base.slice(); wizSyncPins(wiz); wiz.cmd = null;
    toast(T('Штифты вернулись к исходным, найденные связи сохранены')); wizRenderStep();
  };
  paint();
}
function wizBindStepActions(wiz, c, chipsEl, moversEl) {
  function wizSyncLockReset() {
    var box = document.getElementById('wizLockReset');
    if (!box) return;
    var hasJerk = !!moversEl.querySelector('.wizpos.on[data-jerk="1"]');
    box.hidden = !hasJerk;
    if (!hasJerk) document.getElementById('wizLockResetCb').checked = false;
  }
  function wizSyncMovers() {
    chipsEl.querySelectorAll('.wizchip').forEach(function (lab) {
      var j = +lab.dataset.j;
      var on = lab.querySelector('input').checked;
      lab.classList.toggle('on', on);
      var panel = document.getElementById('wizMover' + j);
      if (panel) panel.classList.toggle('show', on);
      if (!on) moversEl.querySelectorAll('.wizpos[data-j="' + j + '"]').forEach(function (b) { b.classList.remove('on'); });
    });
    wizSyncLockReset();
  }
  chipsEl.onchange = function (e) {
    if (!e.target.matches('input')) return;
    wizSyncMovers();
  };
  moversEl.onclick = function (e) {
    var btn = e.target.closest ? e.target.closest('.wizpos') : null;
    if (!btn) return;
    var j = btn.dataset.j;
    moversEl.querySelectorAll('.wizpos[data-j="' + j + '"]').forEach(function (b) { b.classList.remove('on'); });
    btn.classList.add('on');
    wizSyncLockReset();
  };
  /* заранее отмечаем плитки с известными связями (в т.ч. из подсказки) */
  var pre = {}, guard = {};
  wizPredictKnownMovers(wiz, c).forEach(function (m) {
    var lab = chipsEl.querySelector('.wizchip[data-j="' + m.plate + '"]');
    var pos = moversEl.querySelector('.wizpos[data-j="' + m.plate + '"][data-l="' + m.link + '"]');
    if (!lab || !pos) return;
    lab.querySelector('input').checked = true;
    pos.classList.add('on');
    pre[m.plate] = m.link;
  });
  wizSyncMovers();
  function wizFinish(movers, lockReset) { wizFinishStep(wiz, c, movers, lockReset); }
  document.getElementById('wizNone').onclick = function () {
    if (!wizCheckDropped(wiz, c, [], guard)) return;
    wizFinish([], false);
  };
  document.getElementById('wizConfirm').onclick = function () {
    var movers = [], bad = false, jerks = 0, slides = 0, ownSlides = 0;
    chipsEl.querySelectorAll('.wizchip input:checked').forEach(function (inp) {
      var j = +inp.closest('.wizchip').dataset.j;
      var sel = moversEl.querySelector('.wizpos.on[data-j="' + j + '"]');
      if (!sel) {
        toast(T('Отметь, что стало с плиткой ') + (j + 1));
        bad = true;
        return;
      }
      var jerk = sel.dataset.jerk === '1';
      if (jerk) jerks++; else { slides++; if (pre[j] !== +sel.dataset.l) ownSlides++; }
      movers.push({ plate: j, link: +sel.dataset.l, jerk: jerk });
    });
    if (bad) return;
    if (jerks > 0 && ownSlides > 0) {
      toast(T('Если кто-то упёрся в стену, ход не прошёл и съехать никто не мог. Проверь отметки'));
      return;
    }
    /* ход упёрся - заранее отмеченные «съезды» не случились, их просто отбрасываем */
    if (jerks > 0 && slides > 0) movers = movers.filter(function (m) { return m.jerk; });
    if (!jerks && !wizCheckDropped(wiz, c, movers, guard)) return;
    var lockReset = jerks > 0 && document.getElementById('wizLockResetCb').checked;
    wizFinish(movers, lockReset);
  };
  document.getElementById('wizGameReset').onclick = function () {
    trackEvent('wizard_reset');
    wiz.sim = WIZ_MEM.base.slice();
    wizSyncPins(wiz);
    wiz.cmd = null;
    toast(T('Штифты вернулись к исходным, найденные связи сохранены'));
    wizRenderStep();
  };
}
function wizMoverPanel(wiz, j, d) {
  var old = wiz.sim[j];
  var opts = wizMoverOptions(old, d);
  var btnL = '', btnR = '';
  for (var s = 0; s < opts.length; s++) {
    var o = opts[s];
    var pinD = o.link * d;
    var left = pinD > 0; // штифт вправо = плитка едет влево
    var dir = left
      ? WIZ_SVG_ARR_L + T('<span>ВЛЕВО</span>')
      : T('<span>ВПРАВО</span>') + WIZ_SVG_ARR_R;
    var sub = o.jerk
      ? T('штифт ') + old + T(' &rarr; <b class="wall">&times;</b> (упор в стену)')
      : T('штифт ') + old + ' &rarr; <b>' + o.pos + '</b>';
    var html = '<button type="button" class="wizpos' + (left ? ' dir-l' : ' dir-r') + (o.jerk ? ' jerk' : '') + '" style="--nudge:' + (left ? '-2px' : '2px') + '"' +
      ' data-j="' + j + '" data-l="' + o.link + '" data-jerk="' + (o.jerk ? 1 : 0) + '">' +
      '<span class="wizpos-dir">' + dir + '</span>' +
      '<span class="wizpos-sub">' + sub + '</span></button>';
    if (left) btnL = html; else btnR = html;
  }
  return '<div class="wizmover" id="wizMover' + j + '" data-j="' + j + '">' +
    T('<div class="wizmover-head">Плитка <b>') + (j + 1) + T('</b>: куда дёрнулась?</div>') +
    '<div class="wizposrow">' + btnL + btnR + '</div></div>';
}
/* текстовый вид вспомогательного хода: команда + что поедет, без отметок */
function wizRenderHelperText(wiz, c) {
  var i = c.driver, d = c.d;
  var movers = wizPredictKnownMovers(wiz, c);
  var names = movers.map(function (m) { return (m.plate + 1); });
  document.getElementById('linkWizTitle').textContent = T('Плитка ') + (i + 1);
  document.getElementById('linkWizSub').textContent = T('Вспомогательный ход: уводим плитки от стены. Связи запишутся сами.');
  wizHelpStep();
  wizProgress(wiz);
  var coText = movers.length
    ? T('Вместе с ней поедут <b>') + (names.length > 1 ? T('плитки ') : T('плитка ')) + names.join(', ') + T('</b>. Это уже известно - отмечать ничего не нужно, просто сделай ход.')
    : T('Никто за ней не потянется. Просто сделай ход.');
  document.getElementById('linkWizBody').innerHTML =
    wizRenderPinsBar(wiz.sim, i) +
    T('<div class="wizcmd"><div class="lbl">Сдвинь в игре</div>') +
    T('<div class="plate">плитка <b>') + (i + 1) + '</b></div>' +
    '<div class="move ' + (d > 0 ? 'dir-l' : 'dir-r') + '">' + (d > 0 ? WIZ_SVG_L : WIZ_SVG_R) + plateMoveLabel(d) + '</div>' +
    T('<p class="wizmeta">штифт ') + wiz.sim[i] + ' → <b>' + (wiz.sim[i] + d) + T('</b> · откатывать не нужно</p></div>') +
    T('<p class="wizhelpnote">Это <b>уже проверенная плитка</b>. ') + coText + '</p>';
  document.getElementById('linkWizBody').classList.remove('wv-body');
  document.getElementById('linkWizBody').classList.toggle('dir-left', d > 0);
  document.getElementById('linkWizFoot').innerHTML =
    '<div class="wizfoot-actions wizfoot-actions--single">' +
    T('<button class="btn primary" type="button" id="wizConfirm">Дальше</button></div>') +
    T('<p class="wizfoot-aside"><button type="button" id="wizGameReset">Случайно сбросил замок</button></p>');
  document.getElementById('wizConfirm').onclick = function () { wizFinishStep(wiz, c, [], false); };
  document.getElementById('wizGameReset').onclick = function () {
    trackEvent('wizard_reset'); wiz.sim = WIZ_MEM.base.slice(); wizSyncPins(wiz); wiz.cmd = null;
    toast(T('Штифты вернулись к исходным, найденные связи сохранены')); wizRenderStep();
  };
}
function wizRenderStep() {
  var wiz = LINK_WIZ;
  if (!wiz.cmd) {
    wiz.cmd = wizNextCmd(wiz);
    if (!wiz.cmd) {
      wizRenderDone();
      return;
    }
  }
  var c = wiz.cmd, i = c.driver, d = c.d;
  wizSyncModeBtns();
  wizSyncPanelMode();
  if (WIZ_VIEW === 'visual') { wizRenderStepVisual(wiz, c); return; }
  if (c.helper) { wizRenderHelperText(wiz, c); return; }
  var chips = '', moversHtml = '';
  for (var j = 0; j < N; j++) {
    if (j === i) continue;
    chips += '<label class="wizchip" data-j="' + j + T('"><input type="checkbox">плитка<b>') + (j + 1) + '</b></label>';
    moversHtml += wizMoverPanel(wiz, j, d);
  }
  document.getElementById('linkWizTitle').textContent = T('Плитка ') + (i + 1);
  document.getElementById('linkWizSub').textContent = c.helper
    ? T('Вспомогательный ход: увести плитку от стены. Связи этой плитки уже известны.')
    : T('Шаг ') + (wiz.step + 1) + T(' · сдвинь плитку в игре и отметь, какие плитки дёрнулись вместе с ней. Откатывать ходы не нужно.');
  wizHelpStep();
  wizProgress(wiz);
  document.getElementById('linkWizBody').innerHTML =
    wizRenderPinsBar(wiz.sim, i) +
    T('<div class="wizcmd"><div class="lbl">Сдвинь в игре</div>') +
    T('<div class="plate">плитка <b>') + (i + 1) + '</b></div>' +
    '<div class="move ' + (d > 0 ? 'dir-l' : 'dir-r') + '">' + (d > 0 ? WIZ_SVG_L : WIZ_SVG_R) + plateMoveLabel(d) + '</div>' +
    T('<p class="wizmeta">штифт ') + wiz.sim[i] + ' → <b>' + (wiz.sim[i] + d) + T('</b> · откатывать не нужно</p></div>') +
    wizPrefillNote(wiz, c) +
    T('<p class="wizpick">Кто дёрнулся вместе с плиткой <b>') + (i + 1) + '</b>?</p>' +
    '<div class="wizchips" id="wizChips">' + chips + '</div>' +
    '<div class="wizmovers" id="wizMovers">' + moversHtml + '</div>' +
    '<label class="wizlockreset" id="wizLockReset" hidden><input type="checkbox" id="wizLockResetCb">' +
    T('<span>Это была последняя ошибка: <b>замок сбросился</b>. Связь всё равно запишем, а штифты вернём к исходным позициям.</span></label>');
  document.getElementById('linkWizBody').classList.remove('wv-body');
  document.getElementById('linkWizBody').classList.toggle('dir-left', d > 0);
  wizSyncPanelMode();
  document.getElementById('linkWizFoot').innerHTML =
    '<div class="wizfoot-actions">' +
    T('<button class="btn" type="button" id="wizNone">Никто не дёрнулся</button>') +
    T('<button class="btn primary" type="button" id="wizConfirm">Дальше</button></div>') +
    T('<p class="wizfoot-aside"><button type="button" id="wizGameReset">Случайно сбросил замок</button></p>');
  wizBindStepActions(wiz, c, document.getElementById('wizChips'), document.getElementById('wizMovers'));
}
function wizRenderDone() {
  var left = wizRowsLeft(LINK_WIZ);
  trackEvent(left > 0 ? 'wizard_done_partial' : 'wizard_done');
  document.getElementById('linkWizProg').hidden = true;
  document.getElementById('linkWizTitle').textContent = left > 0 ? T('Не все связи проверены') : T('Готово');
  document.getElementById('linkWizSub').textContent = left > 0
    ? T('Часть связей не проверить, не ударившись в стену.')
    : T('Матрица обновлена. Перепроверь связи и жми «Взломать».');
  wizHelpInline();
  document.getElementById('linkWizBody').innerHTML =
    '<p class="wizwhy">' + (left > 0
      ? T('Плитки у стены заблокировали оставшиеся пробы. <b>Эти связи не записаны или не сверены с игрой</b> - если решить замок сейчас, ход может удариться в стену. Отметь их в матрице вручную или сдвинь блокирующую плитку в игре и запусти мастер заново.')
      : T('Если что-то не сходится с игрой, поправь ячейки вручную или запусти мастер заново.')) + '</p>' +
    wizRenderPinsBar(LINK_WIZ.sim) +
    T('<p class="wizhelpnote"><b>Вернуть штифты</b> - если выйдешь из взлома в игре и зайдёшь снова: замок сбросится к исходным позициям. <b>Просто закрыть</b> - если продолжаешь с текущих позиций.</p>');
  document.getElementById('linkWizBody').classList.remove('dir-left');
  document.getElementById('linkWizFoot').innerHTML =
    '<div class="wizfoot-actions">' +
    T('<button class="btn ghost" type="button" id="wizRestore">Вернуть штифты и закрыть</button>') +
    T('<button class="btn primary" type="button" id="wizDone">Просто закрыть</button></div>');
  document.getElementById('wizDone').onclick = closeLinkWizard;
  document.getElementById('wizRestore').onclick = function () { wizRestorePins(); closeLinkWizard(); };
  toast(left > 0 ? T('Часть связей не проверена - впиши вручную') : T('Связи записаны в матрицу'));
  wizSyncPanelMode();
}
function openLinkWizard() {
  if (!pinsConfigured()) return;
  var resume = !!(WIZ_MEM.zero && WIZ_MEM.zero.length === N);
  if (!resume) { WIZ_MEM.zero = wizMk2d(false); WIZ_MEM.unv = null; }
  wizEnsureUnv();
  if (!WIZ_MEM.base || WIZ_MEM.base.length !== N) WIZ_MEM.base = pins.slice();
  LINK_WIZ = {
    sim: pins.slice(),
    cmd: null,
    step: 0,
    confirmedZero: WIZ_MEM.zero,
    unverified: WIZ_MEM.unv,
    rows0: 0
  };
  LINK_WIZ.rows0 = wizRowsLeft(LINK_WIZ);
  trackEvent('wizard_open');
  var back = document.getElementById('linkWizBack');
  back.classList.add('open');
  back.setAttribute('aria-hidden', 'false');
  if (resume) wizRenderStep();
  else wizRenderIntro();
}
function closeLinkWizard() {
  var back = document.getElementById('linkWizBack');
  back.classList.remove('open');
  back.setAttribute('aria-hidden', 'true');
  wizSyncPanelMode();
  LINK_WIZ = null;
}
/* после мастера штифты часто сдвинуты пробами - вернуть к исходным (из снимка). */
function wizRestorePins() {
  var b = lockBasePins();
  if (b && b.length === N) { pins = b.slice(); pinsTouched = true; renderPins(); }
}
(function bindLinkWizard() {
  var btn = document.getElementById('linkHelpBtn');
  var back = document.getElementById('linkWizBack');
  var close = document.getElementById('linkWizClose');
  if (btn) btn.onclick = openLinkWizard;
  if (close) close.onclick = closeLinkWizard;
  if (back) back.addEventListener('click', function (e) { if (e.target === back) closeLinkWizard(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && LINK_WIZ) closeLinkWizard();
    if (e.key === 'Escape' && document.getElementById('linkHelpAnn').classList.contains('open')) closeLinkHelpAnnounce();
  });
  updateLinkHelpBtn();
})();

var LINK_HELP_ANN_KEY = 'uml-linkhelp-intro-v1';
/* 50k celebration + confetti (off)
(function bindFixNote() {
  document.getElementById('fixNoteClose').onclick = closeCelebrationNote;
})();
var MILESTONE_50K = 50000;
var MILESTONE_50K_KEY = 'uml-milestone-50k-v1';
var celebrationTimer = 0;
function closeCelebrationNote() {
  clearTimeout(celebrationTimer);
  var el = document.getElementById('fixNote');
  if (!el) return;
  el.classList.remove('show');
  setTimeout(function () { el.hidden = true; }, 450);
  try { localStorage.setItem(MILESTONE_50K_KEY, '1'); } catch (e) {}
}
function launchConfetti(ms) {
  var canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.hidden = false;
  var colors = ['#34a883', '#2a6b52', '#f0c040', '#e8a838', '#6ab0ff', '#e85d6a', '#c4f0dc'];
  var pieces = [];
  for (var i = 0; i < 180; i++) {
    pieces.push({
      x: Math.random() * W,
      y: -30 - Math.random() * H * 0.6,
      vy: 2.5 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 2,
      a: Math.random() * Math.PI * 2,
      va: (Math.random() - 0.5) * 0.25,
      w: 5 + Math.random() * 9,
      h: 3 + Math.random() * 7,
      c: colors[i % colors.length]
    });
  }
  var t0 = performance.now();
  function frame(t) {
    var elapsed = t - t0;
    var fade = elapsed > ms - 900 ? Math.max(0, (ms - elapsed) / 900) : 1;
    ctx.clearRect(0, 0, W, H);
    for (var j = 0; j < pieces.length; j++) {
      var p = pieces[j];
      p.vy += 0.04;
      p.y += p.vy;
      p.x += p.vx + Math.sin(elapsed * 0.003 + j * 0.7) * 1.4;
      p.a += p.va;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (elapsed < ms) requestAnimationFrame(frame);
    else {
      canvas.hidden = true;
      ctx.clearRect(0, 0, W, H);
    }
  }
  requestAnimationFrame(frame);
}
function openCelebrationNote(n) {
  try { if (localStorage.getItem(MILESTONE_50K_KEY)) return; } catch (e) {}
  var title = document.getElementById('fixNoteTitle');
  if (title) title.textContent = fmtNum(n) + ' замков взломано!';
  var el = document.getElementById('fixNote');
  el.hidden = false;
  requestAnimationFrame(function () { el.classList.add('show'); });
  launchConfetti(5200);
  try { localStorage.setItem(MILESTONE_50K_KEY, '1'); } catch (e) {}
  celebrationTimer = setTimeout(closeCelebrationNote, 5000);
}
function maybeCelebrate50k(n, approx) {
  if (approx || n < MILESTONE_50K) return;
  try { if (localStorage.getItem(MILESTONE_50K_KEY)) return; } catch (e) {}
  setTimeout(function () {
    if (LINK_WIZ) return;
    openCelebrationNote(n);
  }, 1200);
}
*/

function markLinkHelpAnnSeen() {
  try { localStorage.setItem(LINK_HELP_ANN_KEY, '1'); } catch (e) {}
}
function closeLinkHelpAnnounce() {
  var el = document.getElementById('linkHelpAnn');
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  markLinkHelpAnnSeen();
}
function scrollToLinkHelpBtn() {
  closeLinkHelpAnnounce();
  var hb = document.getElementById('linkHelpBtn');
  if (!hb) return;
  /* скроллим к самой кнопке «Помощь» по центру экрана, а не к верху решателя -
     иначе на мобиле кнопка (шаг 03) остаётся ниже экрана */
  setTimeout(function () {
    hb.scrollIntoView({ behavior: 'smooth', block: 'center' });
    hb.classList.add('pulse');
    setTimeout(function () { hb.classList.remove('pulse'); }, 3600);
  }, 120);
}
function maybeShowLinkHelpAnnounce() {
  try { if (localStorage.getItem(LINK_HELP_ANN_KEY)) return; } catch (e) {}
  if (extractConfigCode()) return;
  setTimeout(function () {
    if (LINK_WIZ) return;
    var el = document.getElementById('linkHelpAnn');
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }, 850);
}
(function bindLinkHelpAnnounce() {
  var ann = document.getElementById('linkHelpAnn');
  document.getElementById('linkHelpAnnOk').onclick = closeLinkHelpAnnounce;
  document.getElementById('linkHelpAnnGo').onclick = scrollToLinkHelpBtn;
  document.getElementById('linkHelpAnnClose').onclick = closeLinkHelpAnnounce;
  ann.addEventListener('click', function (e) { if (e.target === ann) closeLinkHelpAnnounce(); });
})();

/* ---------- решение ---------- */
function groupSteps(seq) {
  var groups = [];
  for (var t = 0; t < seq.length; t++) {
    var last = groups[groups.length - 1];
    if (last && last.plate === seq[t].plate && last.d === seq[t].d) {
      last.count++; last.endIdx = t;
    } else {
      groups.push({ plate: seq[t].plate, d: seq[t].d, count: 1, endIdx: t });
    }
  }
  return groups;
}

function miniTracks(state) {
  var html = '<div class="mini">';
  for (var i = 0; i < state.length; i++) {
    html += '<div class="minilock"><span class="lbl">' + (i + 1) + '</span><span class="minitrack">';
    for (var p = 1; p <= 7; p++) {
      var cls = 'minihole' + (p === 4 ? ' c' : '');
      if (state[i] === p) cls += p === 4 ? ' pg' : ' p';
      html += '<span class="' + cls + '"></span>';
    }
    html += '</span></div>';
  }
  return html + '</div>';
}

function solveNow() {
  var body = document.getElementById('solbody');
  var panel = document.getElementById('solution');
  var sbtn = document.getElementById('solveBtn');
  sbtn.classList.remove('open');
  sbtn.classList.add('picking');
  panel.style.display = 'block';
  body.innerHTML =
    T('<div class="sol-head"><span class="sol-title">Решение</span><span class="sol-meta">перебираю состояния&hellip;</span></div>') +
    '<div class="skel"></div><div class="skel" style="animation-delay:.15s"></div><div class="skel" style="animation-delay:.3s"></div>';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  setTimeout(function () {
    var t0 = performance.now();
    var seq = solveLock(pins.slice(), link);
    var dt = Math.round(performance.now() - t0);

    sbtn.classList.remove('picking');
    if (seq !== null) {
      sbtn.classList.add('open');
      setTimeout(function () { sbtn.classList.remove('open'); }, 2000);
    }

    if (seq === null) {
      trackEvent('solve_fail');
      body.innerHTML =
        T('<div class="sol-head"><span class="sol-title">Решение</span></div>') +
        T('<div class="msg err"><b>Безопасного решения не существует</b> для этой конфигурации. ') +
        T('Почти наверняка ошибка во вводе: перепроверь стартовые позиции и связи - особенно направление ') +
        T('«та же / противоположная» и односторонние связи. Подробнее в разделе ниже.</div>');
      return;
    }
    if (seq.length === 0) {
      trackEvent('solve_empty');
      body.innerHTML =
        T('<div class="sol-head"><span class="sol-title">Решение</span></div>') +
        T('<div class="msg ok">Все штифты уже в центре - замок открыт. Ходов не нужно.</div>') +
        solFeedbackHtml();
      resetSolFeedback();
      bindSolFeedback();
      vpSyncFeedback(true);
      return;
    }

    var check = verifySolution(pins.slice(), link, seq);
    if (!check.ok) {
      trackEvent('solve_verify_err');
      body.innerHTML = T('<div class="msg err">Внутренняя ошибка проверки решения - сообщите автору сайта.</div>');
      return;
    }

    if (SKIP_METRICS_ONCE) {
      SKIP_METRICS_ONCE = false;
      PENDING_REPORT = null;
    } else {
      trackEvent('solve_ok');
      counterBump();
      PENDING_REPORT = captureLockReport();
    }

    SOL = { seq: seq, check: check, dt: dt };
    renderSolution(true);
  }, 350);
}

/* отрисовка решения. Решатель внутри считает движение ШТИФТА,
   но пластина в игре едет в противоположную сторону. По умолчанию
   показываем, куда двигать пластину (= какую кнопку жать). */
var SOL = null;
var PLATE_MODE = true;
var PV_ON = true;
try { PLATE_MODE = localStorage.getItem('uml-dirmode') !== 'pin'; } catch (e) {}

/* визуальный пошаговый режим («Показ») */
var SOL_MODE = 'play';
try {
  var solModePref = localStorage.getItem('uml-solmode');
  var solModeExplicit = localStorage.getItem('uml-solmode-explicit') === '1';
  if (solModePref === 'play') SOL_MODE = 'play';
  else if (solModePref === 'list' && solModeExplicit) SOL_MODE = 'list';
} catch (e) {}
var vpIdx = 0, vpLayers = [], vpPlates = [], vpPins = [], vpGroups = [], vpStates = [];
var VP_PW = 150, VP_MARG = 14, VP_CENTER = 4, VP_STEP = (VP_PW - 2 * VP_MARG) / 6;

function dirChipHtml(d) {
  var shown = PLATE_MODE ? -d : d;
  return shown === -1
    ? T('<span class="dirchip L">&larr; ВЛЕВО</span>')
    : T('<span class="dirchip R">ВПРАВО &rarr;</span>');
}

function solFeedbackHtml() {
  return '<div class="vp-feedback sol-feedback" id="vpFeedback" hidden>' +
    T('<p class="vp-fb-q">Сайт помог?</p>') +
    '<div class="vp-fb-vote" id="vpFbAct">' +
      T('<button class="vp-fb-btn vp-fb-up" id="vpFbUp" type="button">Да</button>') +
      T('<button class="vp-fb-btn vp-fb-down" id="vpFbDn" type="button">Нет</button>') +
    '</div>' +
    '<div class="vp-fb-detail" id="vpFbDown" hidden>' +
      T('<p class="vp-fb-dq">Что не так? Можно несколько</p>') +
      '<div class="vp-fb-chips" id="vpFbChips">' +
        T('<button type="button" class="vp-fb-chip" data-r="wrong_solution">Решение неверное</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="wizard_confusing">Помощник запутал</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="suggest_wrong">Подсказка неверная</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="input_unclear">Не понял ввод</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="slow_bug">Тормозит / глючит</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="old_ui_better">Старая схема лучше</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="still_bad">Всё равно неудобно</button>') +
        T('<button type="button" class="vp-fb-chip" data-r="other">Другое</button>') +
      '</div>' +
      '<div class="vp-fb-field">' +
        T('<label class="vp-fb-lbl" for="vpFbNote">Комментарий <span>(необязательно)</span></label>') +
        T('<textarea class="vp-fb-note" id="vpFbNote" rows="2" maxlength="280" placeholder="Что ещё стоит улучшить?"></textarea>') +
        T('<p class="vp-fb-err" id="vpFbNoteErr" hidden>Комментарий с грубыми словами не сохранили - но оценку и причины приняли, спасибо.</p>') +
      '</div>' +
      '<div class="vp-fb-down-act">' +
        T('<button class="btn primary" type="button" id="vpFbDownSend">Отправить</button>') +
        T('<button class="btn ghost" type="button" id="vpFbDownSkip">Пропустить</button>') +
      '</div>' +
    '</div>' +
    T('<p class="vp-fb-hint" id="vpFbHint" hidden>Оценку можно изменить</p>') +
    T('<p class="vp-fb-thanks" id="vpFbThanks">Спасибо!</p>') +
  '</div>';
}
function bindSolFeedback() {
  var up = document.getElementById('vpFbUp');
  var dn = document.getElementById('vpFbDn');
  if (up) up.onclick = function () { vpSubmitFeedback('up'); };
  if (dn) dn.onclick = function () { vpShowDownDetail(); };
  var chips = document.getElementById('vpFbChips');
  if (chips) chips.onclick = function (e) {
    var b = e.target.closest ? e.target.closest('.vp-fb-chip') : null;
    if (!b) return;
    b.classList.toggle('on');
  };
  var send = document.getElementById('vpFbDownSend');
  if (send) send.onclick = function () { vpSubmitDownFeedback(false); };
  var skip = document.getElementById('vpFbDownSkip');
  if (skip) skip.onclick = function () { vpSubmitDownFeedback(true); };
  var noteEl = document.getElementById('vpFbNote');
  if (noteEl) noteEl.oninput = vpClearNoteErr;
}
function resetSolFeedback() {
  vpFbChecked = false;
  vpCurrentVote = null;
  vpFbSubmitted = false;
  vpApplyReasons([]);
  var noteEl = document.getElementById('vpFbNote');
  if (noteEl) noteEl.value = '';
  vpClearNoteErr();
  var root = document.getElementById('vpFeedback');
  if (root) root.classList.remove('vp-feedback--detail', 'vp-feedback--flash');
  var hint = document.getElementById('vpFbHint');
  if (hint) hint.hidden = true;
}

function renderSolution(fresh) {
  if (!SOL) return;
  var body = document.getElementById('solbody');
  var seq = SOL.seq, check = SOL.check, dt = SOL.dt;
  var doneMap = {};
  if (!fresh) {
    var olds = document.querySelectorAll('.step.done');
    for (var k0 = 0; k0 < olds.length; k0++) doneMap[olds[k0].getAttribute('data-g')] = true;
  }
  var groups = groupSteps(seq);
  var html =
    T('<div class="sol-head"><span class="sol-title">Решение</span>') +
    '<span class="sol-meta"><b>' + seq.length + T('</b> ходов &middot; ') + groups.length +
    T(' действий &middot; ') + dt + T(' мс &middot; без ударов о стену</span></div>') +
    '<div class="solmode" role="tablist">' +
      '<button class="solmode-b' + (SOL_MODE === 'play' ? '' : ' on') + T('" data-mode="list" type="button">Список</button>') +
      '<button class="solmode-b' + (SOL_MODE === 'play' ? ' on' : '') + '" data-mode="play" type="button">' +
        T('<svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M2 1.3v8.4l7-4.2z"/></svg>Показ по шагам</button>') +
    '</div>' +
    '<div id="solList"' + (SOL_MODE === 'play' ? ' style="display:none"' : '') + '>' +
    '<label class="pvtoggle"><input type="checkbox" id="pvToggle"' + (PV_ON ? ' checked' : '') + T('> позиции штифтов после каждого шага</label>') +
    '<label class="pvtoggle"><input type="checkbox" id="invToggle"' + (PLATE_MODE ? ' checked' : '') + T('> направления показывают, куда двигать пластину (какую кнопку жать); выключи - будет движение штифта</label>') +
    '<div class="steps">';

  for (var g = 0; g < groups.length; g++) {
    var gr = groups[g];
    var after = check.states[gr.endIdx + 1];
    html += '<div class="step' + (doneMap[g] ? ' done' : '') + '" data-g="' + g + '" style="--i:' + (fresh ? g : 0) + '" onclick="this.classList.toggle(\'done\')">' +
      '<div class="stephead"><span class="stepnum">' + String(g + 1).padStart(2, '0') + '</span>' +
      T('<span class="stepmove">Плитка <b>') + (gr.plate + 1) + '</b> ' + dirChipHtml(gr.d) +
      (gr.count > 1 ? ' <span class="mult">&times;' + gr.count + '</span>' : '') +
      '</span></div>' +
      '<div class="steppv"' + (PV_ON ? '' : ' style="display:none"') + '>' + miniTracks(after) + '</div>' +
      '</div>';
  }
  html += T('</div><div class="msg ok">После последнего шага все штифты встанут в центр - замок откроется. ') +
    T('Решение проверено симуляцией перед выводом. Кликай по шагам, чтобы отмечать выполненные.</div></div>') +
    '<div id="solPlayer"' + (SOL_MODE === 'play' ? '' : ' style="display:none"') + '></div>' +
    '<div class="sol-foot">' +
      '<button class="btn primary" type="button" id="solNewLock">' +
        '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
        T('Новый замок</button>') +
      solFeedbackHtml() +
    '</div>';
  body.innerHTML = html;
  var solNL = document.getElementById('solNewLock');
  if (solNL) solNL.onclick = newLockAndScroll;
  document.getElementById('pvToggle').onchange = function () {
    PV_ON = this.checked;
    var pvs = document.querySelectorAll('.steppv');
    for (var k = 0; k < pvs.length; k++) pvs[k].style.display = this.checked ? '' : 'none';
  };
  document.getElementById('invToggle').onchange = function () {
    PLATE_MODE = this.checked;
    try { localStorage.setItem('uml-dirmode', PLATE_MODE ? 'plate' : 'pin'); } catch (e) {}
    renderSolution(false);
  };
  var mbs = body.querySelectorAll('.solmode-b');
  for (var mi = 0; mi < mbs.length; mi++) mbs[mi].onclick = function () { setSolMode(this.getAttribute('data-mode'), true); };
  if (fresh) vpIdx = 0;
  buildPlayer();
  setSolMode(SOL_MODE, false);
  resetSolFeedback();
  bindSolFeedback();
  vpSyncFeedback(SOL_MODE === 'list');
}

/* ---------- визуальный пошаговый режим («Показ») ---------- */
function setSolMode(mode, explicit) {
  SOL_MODE = (mode === 'play') ? 'play' : 'list';
  if (explicit) {
    try {
      localStorage.setItem('uml-solmode', SOL_MODE);
      localStorage.setItem('uml-solmode-explicit', '1');
    } catch (e) {}
  }
  var list = document.getElementById('solList'), play = document.getElementById('solPlayer');
  var bs = document.querySelectorAll('.solmode-b');
  for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-mode') === SOL_MODE);
  if (list) list.style.display = SOL_MODE === 'play' ? 'none' : '';
  if (play) {
    play.style.display = SOL_MODE === 'play' ? '' : 'none';
    if (SOL_MODE === 'play') {
      playerRender();
      var vp = play.querySelector('.vp');
      if (vp) { vp.classList.remove('show'); void vp.offsetWidth; vp.classList.add('show'); }
    }
  }
  if (SOL) vpSyncFeedback(SOL_MODE === 'list' || vpIdx >= vpGroups.length);
}

function buildPlayer() {
  var play = document.getElementById('solPlayer');
  if (!play || !SOL) return;
  play.innerHTML =
    '<div class="vp">' +
      '<div class="vp-scene"><div class="vp-lock" id="vpLock"></div></div>' +
      '<div class="vp-info">' +
        '<div class="vp-row"><span id="vpStep"></span><span id="vpMoves" class="vp-muted"></span></div>' +
        '<div class="vp-bar"><i id="vpFill"></i></div>' +
        '<div id="vpMove" class="vp-move"></div>' +
      '</div>' +
      '<div class="vp-ctrl">' +
        T('<button id="vpPrev" class="btn" type="button">&larr; Назад</button>') +
        T('<button id="vpNext" class="btn primary" type="button">Далее &rarr;</button>') +
      '</div>' +
    '</div>';
  var lockEl = document.getElementById('vpLock');
  lockEl.style.setProperty('--vty', ((N - 1) * 15 + 6) + 'px');
  lockEl.style.setProperty('--vtx', (-(N - 1) * 6 - 6) + 'px');
  vpLayers = []; vpPlates = []; vpPins = [];
  for (var i = 0; i < N; i++) {
    var ly = document.createElement('div'); ly.className = 'vp-layer'; ly.style.setProperty('--s', i);
    var pl = document.createElement('div'); pl.className = 'vp-plate';
    var num = document.createElement('span'); num.className = 'vp-num'; num.textContent = (i + 1); pl.appendChild(num);
    var tr = document.createElement('div'); tr.className = 'vp-track'; pl.appendChild(tr);
    for (var k = 0; k < 7; k++) { var hd = document.createElement('div'); hd.className = 'vp-hole'; hd.style.left = (VP_MARG + VP_STEP * k) + 'px'; pl.appendChild(hd); }
    var pin = document.createElement('div'); pin.className = 'vp-pin';
    ly.appendChild(pl); ly.appendChild(pin); lockEl.appendChild(ly);
    vpLayers.push(ly); vpPlates.push(pl); vpPins.push(pin);
  }
  vpGroups = groupSteps(SOL.seq);
  vpStates = [SOL.check.states[0]];
  for (var g = 0; g < vpGroups.length; g++) vpStates.push(SOL.check.states[vpGroups[g].endIdx + 1]);
  if (vpIdx > vpGroups.length) vpIdx = vpGroups.length;
  document.getElementById('vpPrev').onclick = function () { if (vpIdx > 0) { vpIdx--; playerRender(); } };
  document.getElementById('vpNext').onclick = function () { if (vpIdx < vpGroups.length) { vpIdx++; playerRender(); } };
}

var vpFbChecked = false;
var vpCurrentVote = null;
var vpFbFlashTimer = 0;
var vpFbSubmitted = false;
var VP_FB_BANNED = [
  'хуй', 'хуя', 'хуе', 'хуи', 'хуйн', 'пизд', 'еба', 'ебл', 'ебан', 'ебу', 'ебт', 'ебн',
  'бля', 'бляд', 'сука', 'сукин', 'мудил', 'мудо', 'пидор', 'пидар', 'педик', 'гандон',
  'шлюх', 'долбое', 'долбо', 'ублюд', 'мраз', 'гавно', 'говно', 'zaebal', 'заеб',
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'nigger', 'faggot'
];

function vpNormalizeProfanity(s) {
  return String(s || '').toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/0/g, 'o').replace(/1/g, 'i').replace(/\$/g, 's')
    .replace(/[^a-z\u0400-\u04ff]/g, '');
}

function vpNoteBlocked(s) {
  var n = vpNormalizeProfanity(s);
  if (!n) return false;
  for (var i = 0; i < VP_FB_BANNED.length; i++) {
    if (n.indexOf(VP_FB_BANNED[i]) >= 0) return true;
  }
  return false;
}

function vpClearNoteErr() {
  var err = document.getElementById('vpFbNoteErr');
  var noteEl = document.getElementById('vpFbNote');
  if (err) err.hidden = true;
  if (noteEl) noteEl.classList.remove('vp-fb-note-err');
}

function vpShowNoteErr() {
  var err = document.getElementById('vpFbNoteErr');
  var noteEl = document.getElementById('vpFbNote');
  if (err) err.hidden = false;
  if (noteEl) {
    noteEl.classList.add('vp-fb-note-err');
    noteEl.focus();
  }
}

function vpSelectedReasons() {
  var out = [];
  document.querySelectorAll('#vpFbChips .vp-fb-chip.on').forEach(function (b) {
    if (b.dataset.r) out.push(b.dataset.r);
  });
  return out;
}

function vpApplyReasons(reasons) {
  document.querySelectorAll('#vpFbChips .vp-fb-chip').forEach(function (b) {
    b.classList.toggle('on', reasons && reasons.indexOf(b.dataset.r) >= 0);
  });
}

function vpApplyVote(vote) {
  vpCurrentVote = vote || null;
  var up = document.getElementById('vpFbUp');
  var dn = document.getElementById('vpFbDn');
  var hint = document.getElementById('vpFbHint');
  var down = document.getElementById('vpFbDown');
  if (up) up.classList.toggle('vp-fb-btn--sel', vote === 'up');
  if (dn) dn.classList.toggle('vp-fb-btn--sel', vote === 'down');
  if (hint) hint.hidden = !vpFbSubmitted;
  if (down && vote !== 'down') down.hidden = true;
}

function vpShowDownDetail() {
  var down = document.getElementById('vpFbDown');
  var el = document.getElementById('vpFeedback');
  if (down) down.hidden = false;
  if (el) {
    el.classList.remove('vp-feedback--flash');
    el.classList.add('vp-feedback--detail');
  }
  var hint = document.getElementById('vpFbHint');
  if (hint) hint.hidden = true;
}

function vpHideFeedback() {
  var el = document.getElementById('vpFeedback');
  if (!el) return;
  el.hidden = true;
  el.classList.remove('vp-feedback--flash', 'vp-feedback--detail');
  var down = document.getElementById('vpFbDown');
  if (down) down.hidden = true;
}

function vpShowFeedback() {
  var el = document.getElementById('vpFeedback');
  if (!el) return;
  el.hidden = false;
}

function vpFlashThanks() {
  var el = document.getElementById('vpFeedback');
  if (!el) return;
  var down = document.getElementById('vpFbDown');
  if (down) down.hidden = true;
  vpFbSubmitted = true;
  clearTimeout(vpFbFlashTimer);
  el.classList.remove('vp-feedback--detail');
  el.classList.add('vp-feedback--flash');
  var hint = document.getElementById('vpFbHint');
  if (hint) hint.hidden = false;
  vpFbFlashTimer = setTimeout(function () { el.classList.remove('vp-feedback--flash'); }, 1400);
}

function vpPostFeedback(vote, reasons, note) {
  fetch(COUNTER_API + '/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vote: vote, reasons: reasons || [], note: note || '' }),
    keepalive: true
  }).then(function (r) { return r.json(); })
    .then(function (j) {
      if (j && j.ok && j.vote) {
        vpApplyVote(j.vote);
        if (j.reasons) vpApplyReasons(j.reasons);
      }
    })
    .catch(function () {});
}

function vpSubmitFeedback(vote) {
  vpApplyVote(vote);
  if (vote === 'up') reportLockConfig(PENDING_REPORT);
  vpPostFeedback(vote, [], '');
  vpFlashThanks();
}

function vpSubmitDownFeedback(skipReasons) {
  var noteEl = document.getElementById('vpFbNote');
  var note = noteEl ? noteEl.value.trim() : '';
  /* грубый коммент НЕ блокирует отправку: оценку и причины записываем всегда,
     просто отбрасываем сам текст и показываем мягкое уведомление. */
  var dropped = false;
  if (note && vpNoteBlocked(note)) { note = ''; dropped = true; }
  var reasons = skipReasons ? [] : vpSelectedReasons();
  vpApplyVote('down');
  vpPostFeedback('down', reasons, note);
  if (dropped) vpShowNoteErr(); else vpClearNoteErr();
  vpFlashThanks();
}

function vpSyncFeedback(done) {
  var el = document.getElementById('vpFeedback');
  if (!el) return;
  if (!done) { vpHideFeedback(); return; }
  vpShowFeedback();
  if (!vpFbChecked) {
    vpFbChecked = true;
    fetch(COUNTER_API + '/feedback')
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.voted && j.vote) {
          vpFbSubmitted = true;
          vpApplyVote(j.vote);
          if (j.reasons) vpApplyReasons(j.reasons);
          if (j.note) {
            var noteEl = document.getElementById('vpFbNote');
            if (noteEl) noteEl.value = j.note;
          }
        }
      })
      .catch(function () {});
  }
}

function vpMoveText(gr) {
  var shown = PLATE_MODE ? -gr.d : gr.d;
  var left = shown === -1;
  return T('Плитка <b>') + (gr.plate + 1) + '</b> <span class="vp-dir ' + (left ? 'l' : 'r') + '">' +
    (left ? T('&larr; влево') : T('вправо &rarr;')) + '</span>' +
    (gr.count > 1 ? ' <b>&times;' + gr.count + '</b>' : '');
}

function playerRender() {
  if (!SOL || !vpStates.length) return;
  var st = vpStates[vpIdx];
  for (var p = 0; p < vpPlates.length; p++) {
    vpPlates[p].style.setProperty('--shift', ((VP_CENTER - st[p]) * VP_STEP) + 'px');
    vpPlates[p].classList.remove('active');
    vpPins[p].classList.toggle('lit', st[p] === 4);
  }
  var done = vpIdx >= vpGroups.length;
  if (!done) vpPlates[vpGroups[vpIdx].plate].classList.add('active');
  document.getElementById('vpStep').textContent = done ? T('Готово - замок открыт') : (T('Действие ') + (vpIdx + 1) + T(' из ') + vpGroups.length);
  var mv = 0; for (var k = 0; k < vpIdx; k++) mv += vpGroups[k].count;
  document.getElementById('vpMoves').textContent = T('ход ') + mv + T(' из ') + SOL.seq.length;
  document.getElementById('vpFill').style.width = (vpGroups.length ? (vpIdx / vpGroups.length * 100) : 100) + '%';
  document.getElementById('vpMove').innerHTML = done ? T('Все штифты в центре') : vpMoveText(vpGroups[vpIdx]);
  document.getElementById('vpPrev').disabled = vpIdx === 0;
  document.getElementById('vpNext').disabled = done;
  vpSyncFeedback(done);
}

/* ---------- ссылки / пресеты / сброс ---------- */
function updateFlipLabel() {
  var el = document.getElementById('flipLbl');
  if (el) el.textContent = FLIP ? T('1 снизу, как в игре') : T('1 сверху');
}
/* Компактный код замка (v2): битовый поток в base64url.
   3 бита N-3, 1 бит (был порядок строк, теперь всегда 0 - код не зависит от
   вида таблицы), по 3 бита на штифт, по 2 бита на связь.
   Для 6 плиток - 14 символов вместо ~45 у старого v1. */
var CODE_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function codeBitLen(n) { return 4 + 3 * n + 2 * n * (n - 1); }
function encodeConfig(pinsOverride) {
  var ps = (pinsOverride && pinsOverride.length === N) ? pinsOverride : pins;
  var bits = [];
  function push(v, w) { for (var b = w - 1; b >= 0; b--) bits.push((v >> b) & 1); }
  push(N - 3, 3);
  push(0, 1);
  for (var i = 0; i < N; i++) push(ps[i] - 1, 3);
  for (var i2 = 0; i2 < N; i2++)
    for (var j = 0; j < N; j++)
      if (i2 !== j) push(link[i2][j] === 1 ? 1 : (link[i2][j] === -1 ? 2 : 0), 2);
  var out = '';
  for (var k = 0; k < bits.length; k += 6) {
    var v = 0;
    for (var b2 = 0; b2 < 6; b2++) v = (v << 1) | (k + b2 < bits.length ? bits[k + b2] : 0);
    out += CODE_ABC[v];
  }
  return out;
}
function decodeConfigV2(code, silent) {
  if (!/^[A-Za-z0-9_-]{5,24}$/.test(code)) return false;
  var bits = [];
  for (var c = 0; c < code.length; c++) {
    var v = CODE_ABC.indexOf(code[c]);
    if (v < 0) return false;
    for (var b = 5; b >= 0; b--) bits.push((v >> b) & 1);
  }
  var pos = 0;
  function read(w) { var v2 = 0; for (var b2 = 0; b2 < w; b2++) v2 = (v2 << 1) | bits[pos++]; return v2; }
  var n = read(3) + 3;
  if (n < 3 || n > 8 || code.length !== Math.ceil(codeBitLen(n) / 6)) return false;
  read(1); /* бит порядка строк: устарел, порядок задаёт сам пользователь */
  var ps = [];
  for (var i = 0; i < n; i++) {
    var p = read(3);
    if (p > 6) return false;
    ps.push(p + 1);
  }
  var lk = [];
  for (var i2 = 0; i2 < n; i2++) {
    lk.push(new Array(n).fill(0));
    for (var j = 0; j < n; j++) {
      if (i2 === j) continue;
      var t = read(2);
      if (t > 2) return false;
      lk[i2][j] = t === 1 ? 1 : (t === 2 ? -1 : 0);
    }
  }
  N = n; pins = ps; link = lk;
  pinsTouched = true;
  wizMemReset();
  if (!silent) renderCount(); renderPins(); renderDeps();
  return true;
}
function normalizeConfigCode(raw) {
  if (!raw) return '';
  raw = String(raw).trim();
  var qi = raw.indexOf('lock=');
  if (qi >= 0) {
    raw = raw.slice(qi + 5);
    var end = raw.length;
    var amp = raw.indexOf('&'), hash = raw.indexOf('#');
    if (amp >= 0) end = Math.min(end, amp);
    if (hash >= 0) end = Math.min(end, hash);
    raw = raw.slice(0, end);
    try { raw = decodeURIComponent(raw.replace(/\+/g, ' ')); } catch (e) {}
  } else if (raw.indexOf('#') >= 0) {
    raw = raw.slice(raw.indexOf('#') + 1);
  }
  if (raw.charAt(0) === '#') raw = raw.slice(1);
  try { raw = decodeURIComponent(raw.trim()); } catch (e) { raw = raw.trim(); }
  return raw.trim();
}
function extractConfigCode() {
  try {
    var q = new URLSearchParams(location.search).get('lock');
    if (q) return q;
  } catch (e) {}
  if (location.hash.length > 1) return location.hash.slice(1);
  return '';
}
function decodeConfig(code, silent) {
  code = normalizeConfigCode(code);
  var m = /^v1\.(\d)\.(\d+)\.([SO-]+)(?:\.f([01]))?$/i.exec(code);
  if (!m) return decodeConfigV2(code, silent);
  var n = parseInt(m[1], 10);
  if (n < 3 || n > 8 || m[2].length !== n || m[3].length !== n * (n - 1)) return false;
  var ps = m[2].split('').map(Number);
  if (ps.some(function (p) { return p < 1 || p > 7; })) return false;
  var lk = [], c = 0;
  for (var i = 0; i < n; i++) {
    lk.push(new Array(n).fill(0));
    for (var j = 0; j < n; j++) {
      if (i === j) continue;
      var ch = m[3][c++].toUpperCase();
      lk[i][j] = ch === 'S' ? 1 : (ch === 'O' ? -1 : 0);
    }
  }
  N = n; pins = ps; link = lk;
  pinsTouched = true;
  wizMemReset();
  if (!silent) renderCount(); renderPins(); renderDeps();
  return true;
}
function configShareUrl() {
  return location.origin + location.pathname + '?lock=' + encodeURIComponent(encodeConfig(lockBasePins()));
}
function bootConfigFromUrl() {
  var raw = '', fromQuery = false;
  try { var q = new URLSearchParams(location.search).get('lock'); if (q) { raw = q; fromQuery = true; } } catch (e) {}
  if (!raw && location.hash.length > 1) raw = location.hash.slice(1);
  if (!raw) return false;
  if (decodeConfig(raw)) {
    history.replaceState(null, '', location.pathname + '?lock=' + encodeURIComponent(encodeConfig(lockBasePins())));
    trackEvent('lock_url_ok');
    toast(T('Замок загружен из ссылки'));
    var solver = document.getElementById('solver');
    if (solver) solver.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }
  /* ошибку показываем только для явной ссылки ?lock=, а не для якорей вроде #faq / #solver */
  if (fromQuery) {
    trackEvent('lock_url_fail');
    toast(T('Не удалось прочитать ссылку - скопируйте её целиком'));
  }
  return false;
}
function toast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 2200);
}

document.getElementById('solveBtn').onclick = solveNow;
var DEMO_LOCK = {
  n: 6,
  pins: [1, 2, 7, 7, 6, 5],
  links: [[0,1,-1],[0,2,-1],[0,4,-1],[1,3,1],[1,5,1],[2,1,1],[2,5,-1],[4,0,-1],[5,2,1],[5,4,1]]
};
var SKIP_METRICS_ONCE = false;
function loadDemo() {
  SKIP_METRICS_ONCE = true;
  N = DEMO_LOCK.n;
  pins = DEMO_LOCK.pins.slice();
  link = [];
  for (var i = 0; i < N; i++) link.push(new Array(N).fill(0));
  DEMO_LOCK.links.forEach(function (l) { link[l[0]][l[1]] = l[2]; });
  pinsTouched = true;
  wizMemReset();
  renderCount(); renderPins(); renderDeps();
  updateLinkHelpBtn();
  toast(T('Реальный замок: дверь башни Старого Лагеря'));
  solveNow();
}
document.getElementById('demoBtn').onclick = loadDemo;

/* ===== Обучающий тур: авто-демо, ведёт через помощника на готовом замке ===== */
(function tourModule() {
  var mask = document.createElement('div');
  mask.className = 'tourmask'; mask.hidden = true;
  var pop = document.createElement('div');
  pop.className = 'tourpop'; pop.hidden = true;
  pop.innerHTML =
    '<div class="tourpop-tag" id="tourTag"></div>' +
    '<div class="tourpop-body" id="tourBody"></div>' +
    T('<div class="tourpop-foot"><button class="tourpop-skip" id="tourSkip" type="button">Пропустить</button>') +
    T('<button class="btn primary" id="tourNextBtn" type="button">Дальше</button></div>');
  document.body.appendChild(mask);
  document.body.appendChild(pop);
  var elBody = pop.querySelector('#tourBody'), elTag = pop.querySelector('#tourTag'), elNext = pop.querySelector('#tourNextBtn');
  var idx = -1, prevView = 'visual', hlEl = null, active = false;

  function highlight(el) {
    if (hlEl) hlEl.classList.remove('tour-hl');
    hlEl = el || null;
    if (hlEl) hlEl.classList.add('tour-hl');
  }
  /* грузим реальный замок, но связи плиток 4 и 6 (индексы 3 и 5) оставляем
     неизвестными - их и «дозаполним» помощником в туре. */
  function setupDemo() {
    N = DEMO_LOCK.n;
    pins = DEMO_LOCK.pins.slice();
    link = []; for (var a = 0; a < N; a++) link.push(new Array(N).fill(0));
    WIZ_MEM.zero = wizMk2d(false);
    DEMO_LOCK.links.forEach(function (l) { if (l[0] === 3 || l[0] === 5) return; link[l[0]][l[1]] = l[2]; });
    for (var i = 0; i < N; i++) for (var j = 0; j < N; j++)
      if (i !== j && i !== 3 && i !== 5 && link[i][j] === 0) WIZ_MEM.zero[i][j] = true;
    pinsTouched = true; WIZ_MEM.base = pins.slice(); SOL = null;
    document.getElementById('solution').style.display = 'none';
    renderCount(); renderPins(); renderDeps(); updateLinkHelpBtn();
  }
  function openWiz() {
    prevView = WIZ_VIEW; WIZ_VIEW = 'visual';
    WIZ_MEM.zero = WIZ_MEM.zero || wizMk2d(false);
    LINK_WIZ = { sim: pins.slice(), cmd: null, step: 0, confirmedZero: WIZ_MEM.zero, rows0: 0 };
    LINK_WIZ.rows0 = wizRowsLeft(LINK_WIZ);
    var back = document.getElementById('linkWizBack');
    back.classList.add('open'); back.setAttribute('aria-hidden', 'false');
    wizSyncPanelMode();
  }
  /* вынужденный шаг помощника + заранее выбранные ответы; и кнопка помощника,
     и кнопка тура ведут через advance текущего шага */
  function wizStep(driver, d, answers) {
    LINK_WIZ.cmd = { driver: driver, d: d, helper: false };
    wizRenderStepVisual(LINK_WIZ, LINK_WIZ.cmd);
    (answers || []).forEach(function (a) {
      var btn = document.querySelector('.wv-seg[data-j="' + a.j + '"] .wv-b[data-d="' + a.dir + '"]');
      if (btn) btn.click();
    });
    var adv = function () { var s = STEPS[idx]; if (s && s.advance) s.advance(); };
    var cf = document.getElementById('wizConfirm'); if (cf) cf.onclick = adv;
    var gr = document.getElementById('wizGameReset'); if (gr) gr.onclick = adv;
    highlight(cf);
    // подсказку тура показываем ВНУТРИ помощника, чтобы не перекрывать его шапку
    var st = STEPS[idx], body = document.getElementById('linkWizBody');
    if (st && body) {
      var ban = document.createElement('div');
      ban.className = 'wiztour';
      ban.innerHTML = '<div class="wiztour-tag">' + st.tag + '</div>' +
        '<div class="wiztour-body">' + st.body + '</div>' +
        T('<button class="wiztour-skip" type="button">Пропустить тур</button>');
      body.insertBefore(ban, body.firstChild);
      ban.querySelector('.wiztour-skip').onclick = doSkip;
    }
  }
  function applyWizReport(d, answers) {
    var movers = (answers || []).map(function (a) {
      var o = wvOptsFor(LINK_WIZ, a.j, d), opt = a.dir === 'l' ? o.l : o.r;
      return { plate: a.j, link: opt.link, jerk: opt.jerk };
    });
    wizApplyReport(LINK_WIZ, LINK_WIZ.cmd, movers);
    wizSyncPins(LINK_WIZ);
  }

  /* плитка 6 (индекс 5) тянет плитки 3 и 5 (индексы 2,4); плитка 4 (индекс 3) изолирована.
     Штифты плиток у края, поэтому помощник ведёт их к центру (d=-1 = вправо). */
  var A1 = [{ j: 2, dir: 'r' }, { j: 4, dir: 'r' }];
  var STEPS = [
    { tag: T('Демо'), mask: false, next: T('Открыть помощника'),
      body: T('Покажу на готовом примере. Положение штифтов уже введено, и <b>половина связей</b> известна. Дозаполним матрицу - это можно сделать вручную или <b>помощником</b>. Открою помощника.'),
      enter: function () { setupDemo(); },
      advance: function () { go(1); } },
    { tag: T('Помощник · шаг 1'), wiz: true,
      body: T('Помощник просит сдвинуть <b>плитку 6 вправо</b>. Двигаю её в игре - вместе с ней вправо поехали <b>плитки 3 и 5</b>, я их отметил. Жми <b>«Дальше»</b>.'),
      enter: function () { openWiz(); wizStep(5, -1, A1); },
      advance: function () { applyWizReport(-1, A1); go(2); } },
    { tag: T('Помощник · шаг 2'), wiz: true,
      body: T('Теперь <b>плитка 4</b>. Сдвинул её - <b>никто не дёрнулся</b>. Значит связей у неё нет: просто жми <b>«Дальше»</b>.'),
      enter: function () { wizStep(3, -1, []); },
      advance: function () { applyWizReport(-1, []); go(3); } },
    { tag: T('Готово'), mask: true, next: T('Взломать'),
      body: T('Матрица заполнена полностью. Закрываем помощника - осталось нажать <b>«Взломать»</b>.'),
      enter: function () {
        closeLinkWizard(); WIZ_VIEW = prevView;
        pins = DEMO_LOCK.pins.slice(); pinsTouched = true; renderPins(); renderDeps();
        highlight(document.getElementById('solveBtn'));
      },
      advance: function () { SKIP_METRICS_ONCE = true; solveNow(); setTimeout(function () { go(4); }, 450); } },
    { tag: T('Решение'), mask: false, next: T('Понятно'),
      body: T('Готово - вот <b>безопасный путь</b>: порядок ходов, который откроет замок и не сломает отмычку. Так же решается любой твой замок - введи штифты, заполни связи (сам или помощником) и жми «Взломать».'),
      enter: function () { highlight(null); var s = document.getElementById('solution'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
      advance: function () { stop(); } }
  ];

  function render() {
    var s = STEPS[idx];
    if (s.wiz) { pop.hidden = true; mask.hidden = true; return; } // подсказка внутри помощника
    elTag.textContent = s.tag;
    elBody.innerHTML = s.body;
    mask.hidden = !s.mask;
    if (s.next) { elNext.hidden = false; elNext.textContent = s.next; } else { elNext.hidden = true; }
    pop.hidden = false;
  }
  function go(n) {
    if (n >= STEPS.length) { stop(); return; }
    idx = n;
    if (STEPS[idx].enter) STEPS[idx].enter();
    render();
  }
  function start() {
    if (active) return;
    active = true; idx = -1;
    trackEvent('tour_start');
    document.getElementById('solver').scrollIntoView({ behavior: 'auto', block: 'start' });
    go(0);
  }
  function stop() {
    active = false; highlight(null);
    pop.hidden = true; mask.hidden = true;
    trackEvent('tour_end');
  }
  function doSkip() {
    trackEvent('tour_skip');
    if (LINK_WIZ) { closeLinkWizard(); WIZ_VIEW = prevView; }
    stop();
  }
  elNext.onclick = function () { var s = STEPS[idx]; if (s && s.advance) s.advance(); };
  pop.querySelector('#tourSkip').onclick = doSkip;
  var cta = document.getElementById('exampleCtaBtn');
  if (cta) cta.onclick = function () { trackEvent('example_cta'); start(); };
})();
function resetAll() {
  pinsTouched = false;
  init(6);
  history.replaceState(null, '', location.pathname);
}
document.getElementById('resetBtn').onclick = resetAll;
/* «Новый замок» из панели решения: сбросить и уехать к началу решателя */
function newLockAndScroll() {
  resetAll();
  trackEvent('new_lock');
  var s = document.getElementById('solver');
  if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.getElementById('shareBtn').onclick = function () {
  var code = encodeConfig(lockBasePins());
  var url = location.origin + location.pathname + '?lock=' + encodeURIComponent(code);
  history.replaceState(null, '', location.pathname + '?lock=' + encodeURIComponent(code));
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject())
    .then(function () { toast(T('Ссылка на замок скопирована')); })
    .catch(function () { prompt(T('Скопируй ссылку:'), url); });
};
window.addEventListener('hashchange', function () {
  if (extractConfigCode()) bootConfigFromUrl();
});
/* ---------- счётчик взломанных замков ---------- */
var COUNTER_API = window.UML_API || ''; /* адрес - в assets/config.js */
var lastCounted = 0;

/* воронка UX: батч в /events, без PII (только короткий sid сессии) */
var TRACK_EVENTS = {
  solve_ok: 1, solve_fail: 1, solve_empty: 1, solve_verify_err: 1,
  wizard_open: 1, wizard_step_none: 1, wizard_step_marked: 1,
  wizard_helper: 1, wizard_done: 1, wizard_done_partial: 1, wizard_reset: 1,
  suggest_show: 1, suggest_apply_ok: 1, suggest_apply_fail: 1, suggest_skip: 1,
  lock_url_ok: 1, lock_url_fail: 1,
  pins_edit: 1, new_lock: 1
};
var TRACK_SID = (function () {
  try {
    var k = 'uml-track-sid', s = sessionStorage.getItem(k);
    if (!s) {
      s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
      sessionStorage.setItem(k, s);
    }
    return s;
  } catch (e) { return 'anon'; }
})();
var TRACK_Q = [], TRACK_TIMER = 0, TRACK_PINS_SENT = false;
var TRACK_FLUSH_NOW = { solve_ok: 1, solve_fail: 1, solve_empty: 1, wizard_open: 1, wizard_done: 1, wizard_done_partial: 1 };
function trackEvent(name) {
  if (!TRACK_EVENTS[name]) return;
  TRACK_Q.push({ e: name, t: Date.now() });
  if (TRACK_Q.length >= 8 || TRACK_FLUSH_NOW[name]) trackFlush();
  else if (!TRACK_TIMER) TRACK_TIMER = setTimeout(trackFlush, 4000);
}
function trackFlush() {
  clearTimeout(TRACK_TIMER);
  TRACK_TIMER = 0;
  if (!TRACK_Q.length) return;
  var batch = TRACK_Q.splice(0, 24);
  fetch(COUNTER_API + '/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid: TRACK_SID, events: batch }),
    keepalive: true
  }).catch(function () {});
}
try {
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') trackFlush();
  });
  window.addEventListener('pagehide', trackFlush);
} catch (e) {}

function fmtNum(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
function showCounter(n, approx) {
  var box = document.getElementById('lockstat');
  var num = document.getElementById('lockstatN');
  var w = document.getElementById('lockstatW');
  box.classList.add('on');
  box.title = approx ? T('Не меньше этого числа - точное сейчас недоступно') : '';
  var suf = approx ? '+' : '';
  w.textContent = plural(n, T('замок уже взломан'), T('замка уже взломано'), T('замков уже взломано'));
  var from = parseInt(num.dataset.v || String(num.textContent).replace(/\D/g, '') || '0', 10), t0 = performance.now();
  function tick(t) {
    var p = Math.min(1, (t - t0) / 900);
    p = 1 - Math.pow(1 - p, 3);
    num.textContent = fmtNum(Math.round(from + (n - from) * p)) + suf;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  num.dataset.v = n;
  // maybeCelebrate50k(n, approx);
}
function counterJson(r) {
  if (!r.ok) throw new Error('counter http ' + r.status);
  return r.json();
}
/* Резерв счётчика: если API недоступен (нет VPN, 429, сбой) - показываем
   "N+" вместо пустоты. Счётчик только растёт, поэтому последнее известное
   число (или базовое COUNT_BASE) - честная нижняя граница. Подбивать при деплоях. */
var COUNT_BASE = 525000;
function cachedCount() {
  try { var o = JSON.parse(localStorage.getItem('uml-count') || 'null');
    return o && typeof o.v === 'number' ? o.v : null; } catch (e) { return null; }
}
function saveCount(n) {
  try { localStorage.setItem('uml-count', JSON.stringify({ v: n, t: Date.now() })); } catch (e) {}
}
function offlineCount() {
  var c = cachedCount();
  return Math.max(c != null ? c : 0, COUNT_BASE);
}
function counterLoad() {
  showCounter(offlineCount(), true);
  fetch(COUNTER_API + '/count')
    .then(counterJson)
    .then(function (d) { if (typeof d.opened === 'number') { showCounter(d.opened, false); saveCount(d.opened); } })
    .catch(function () {});
}
var REPORTED_LOCKS = {};
var SUGGESTED_CODE = null;
var SUGGEST_CONFLICTS = 0;
function pinsKeyOf(arr) { return N + '.' + arr.join(''); }
/* исходная расстановка замка: до того как помощник сдвинул штифты (wizSyncPins).
   WIZ_MEM.base снимается при открытии мастера и обнуляется при ручной правке. */
function lockBasePins() {
  return (WIZ_MEM.base && WIZ_MEM.base.length === N) ? WIZ_MEM.base : pins;
}
/* Копилка: конфигурацию снимаем в момент решения, а отправляем только после
   «Сайт помог? Да» - иначе неверно введённые связи попадают в подсказки другим. */
var PENDING_REPORT = null;
function captureLockReport() {
  try {
    var base = lockBasePins();
    /* канонический код замка = ИСХОДНЫЕ штифты + найденные связи, а не сдвинутое
       помощником состояние (иначе в каталог попадёт недорешённый замок). */
    var code = encodeConfig(base);
    if (!code || code === SUGGESTED_CODE) return null; /* связи из подсказки - не голосуем сами за себя */
    /* копилка - только статистика (подсказки сайт берёт из locks.yaml);
       штифты - исходные: сдвинутые пробами могут совпасть с чужим замком */
    return { code: code, pins: pinsKeyOf(base) };
  } catch (e) { return null; }
}
function reportLockConfig(rep) {
  if (!rep || REPORTED_LOCKS[rep.code]) return;
  REPORTED_LOCKS[rep.code] = true;
  fetch(COUNTER_API + '/lock?code=' + encodeURIComponent(rep.code) +
    '&pins=' + encodeURIComponent(rep.pins), { method: 'POST' }).catch(function () {});
}

/* Подсказка связей: если эту расстановку уже вскрывали, предлагаем матрицу */
var SUGGEST_DISMISSED = false;
var HELP_NUDGE_DISMISSED = false;
var suggestTimer = 0;
function matrixEmpty() {
  for (var i = 0; i < N; i++)
    for (var j = 0; j < N; j++)
      if (link[i][j]) return false;
  return true;
}
/* Известные замки - из locks.yaml (tools/build-locks.mjs -> locks/locks-data.js).
   Подсказку связей даём только по ним: совпали стартовые штифты - предлагаем
   связи этого замка (мастер всё равно сверит их пробами). suggest: false - не
   подсказывать (безымянные расстановки). fp = N + '.' + штифты. */
var KNOWN_LOCKS = (window.UML_LOCKS || []).filter(function (l) { return l.suggest !== false; })
  .map(function (l) { return { fp: l.fp, code: l.code, name: l[I18N.lang].name }; });
var LOCK_COUNTS = {};
function loadLockCounts() {
  fetch(COUNTER_API + '/locks?limit=100')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && d.locks) for (var i = 0; i < d.locks.length; i++) LOCK_COUNTS[d.locks[i].code] = d.locks[i].count;
    })
    .catch(function () {});
}
/* только по ИСХОДНОЙ расстановке: сдвинутые пробами штифты одного замка могут
   совпасть с исходными другого (Альберто 1211 -> 1311 = тронный зал Гомеза) */
function knownLockFor() {
  var fps = {};
  fps[pinsKeyOf(lockBasePins())] = 1;
  for (var i = 0; i < KNOWN_LOCKS.length; i++)
    if (fps[KNOWN_LOCKS[i].fp])
      return { found: true, known: true, code: KNOWN_LOCKS[i].code, name: KNOWN_LOCKS[i].name };
  return null;
}
/* подсказка - только из списка известных замков, по исходной расстановке */
function suggestLookup(cb) {
  cb(knownLockFor());
}
/* подставляет связи из кода подсказки в неизвестные ячейки, сохраняя штифты
   пользователя, текущий N и снимок WIZ_MEM.base. Возвращает число
   заполненных ячеек или -1 при неудаче. */
function applySuggestedLinks(code) {
  var savedPins = pins.slice(), savedLink = link.map(function (r) { return r.slice(); }),
      savedN = N, savedBase = WIZ_MEM.base,
      savedZero = WIZ_MEM.zero ? WIZ_MEM.zero.map(function (r) { return r.slice(); }) : null,
      savedUnv = WIZ_MEM.unv,
      savedTouched = pinsTouched;
  if (!decodeConfig(code)) return -1;
  if (N !== savedN) {
    N = savedN; pins = savedPins; link = savedLink; pinsTouched = savedTouched;
    WIZ_MEM.base = savedBase; WIZ_MEM.zero = savedZero; WIZ_MEM.unv = savedUnv;
    renderCount(); renderPins(); renderDeps();
    return -1;
  }
  var decodedLink = link.map(function (r) { return r.slice(); });
  WIZ_MEM.unv = savedUnv;
  wizEnsureZero();
  wizEnsureUnv();
  var applied = 0, filled = {}, conflicts = 0;
  for (var i = 0; i < N; i++) {
    for (var j = 0; j < N; j++) {
      if (i === j) continue;
      var known = savedLink[i][j] !== 0 ||
        (savedZero && savedZero[i][j]);
      var v = decodedLink[i][j];
      if (known) {
        if (savedLink[i][j] !== v) conflicts++;
        continue;
      }
      savedLink[i][j] = v;
      WIZ_MEM.zero[i][j] = (v === 0);
      WIZ_MEM.unv[i][j] = true; /* из подсказки - мастер сверит пробой */
      if (v !== 0) filled[i + ',' + j] = true;
      applied++;
    }
  }
  link = savedLink;
  pins = savedPins; pinsTouched = savedTouched;
  WIZ_MEM.base = savedBase;
  SUGGESTED_CODE = code;
  SUGGEST_CONFLICTS = conflicts;
  FILL_CELLS = filled;
  renderCount(); renderPins(); renderDeps();
  FILL_CELLS = null;
  return applied;
}
function maybeSuggestLinks() {
  var box = document.getElementById('suggestBox');
  if (!box) return;
  if (SUGGEST_DISMISSED || !matrixNeedsSuggest()) {
    box.innerHTML = '';
    var stEl = document.getElementById('suggestTop'); if (stEl) stEl.innerHTML = '';
    return;
  }
  clearTimeout(suggestTimer);
  suggestTimer = setTimeout(function () {
    if (SUGGEST_DISMISSED || !matrixNeedsSuggest()) return;
    suggestLookup(function (d) {
      if (!matrixNeedsSuggest() || SUGGEST_DISMISSED) return;
      if (d && d.found) { renderSuggestBox(d); return; }
      maybeShowHelpNudge();
    });
  }, 600);
}
function renderSuggestBox(d) {
  var box = document.getElementById('suggestBox');
  var cnt = LOCK_COUNTS[d.code];
  var cntStr = (typeof cnt === 'number') ? T(' Открыт <b>') + cnt + T('</b> раз.') : '';
  var msg;
  if (d.name) {
    msg = T('Похоже на замок: <b>') + d.name + '</b>.' + cntStr + T(' <b>Важно:</b> связи верны только без прокачанного навыка взлома. Проверь матрицу, а если ход не совпал - напиши в комментариях на DTF или в личку.');
  } else {
    msg = T('Эту расстановку уже вскрывали <b>') + d.count + T('</b> раз. <b>Важно:</b> связи верны только без прокачанного навыка взлома. Проверь матрицу, а если ход не совпал - напиши в комментариях на DTF или в личку.');
  }
  trackEvent('suggest_show');
  box.innerHTML = '<div class="suggest">' +
    T('<span class="suggest-main"><span class="beta-chip">Бета</span><span class="suggest-copy">') + msg + '</span></span>' +
    '<span class="sg-act">' +
    T('<button class="btn" type="button" id="sgYes">Подставить</button>') +
    T('<button class="btn ghost" type="button" id="sgNo">Сам введу</button>') +
    '</span></div>';
  box.querySelector('#sgYes').onclick = function () {
    var n = applySuggestedLinks(d.code);
    if (n < 0) { trackEvent('suggest_apply_fail'); return; }
    trackEvent('suggest_apply_ok');
    if (n >= 0) {
      box.innerHTML = '';
      toast(SUGGEST_CONFLICTS
        ? T('Есть отличия от твоих отметок: {n} яч. Проверь матрицу', { n: SUGGEST_CONFLICTS })
        : T('Связи подставлены - проверь матрицу и жми «Взломать»'));
    }
  };
  box.querySelector('#sgNo').onclick = function () {
    trackEvent('suggest_skip');
    SUGGEST_DISMISSED = true;
    box.innerHTML = '';
  };
}
/* приглашение к помощнику: показываем, когда штифты заданы, матрица пуста и
   автоподсказки по базе нет - чтобы человек не вводил связи вслепую. */
function helpAnnounceOpen() {
  var a = document.getElementById('linkHelpAnn');
  return !!(a && a.classList.contains('open'));
}
function clearHelpNudge() {
  ['suggestBox', 'suggestTop'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b && b.querySelector('.helpnudge')) b.innerHTML = '';
  });
}
/* раскрытие/скрытие гоним ТОЛЬКО инлайн-стилями (без класса) - иначе инлайн
   max-height перебивает класс и высота не анимируется -> матрица прыгает. */
var nudgeTimer = 0;
function nudgeReduced() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
}
function expandNudge(card) {
  if (!card) return;
  clearTimeout(nudgeTimer);
  if (nudgeReduced()) return;
  var full = card.offsetHeight;
  card.style.overflow = 'hidden';
  card.style.maxHeight = '0px'; card.style.opacity = '0';
  card.style.transform = 'translateY(-8px) scale(.98)';
  card.style.marginTop = '0'; card.style.marginBottom = '0';
  card.style.paddingTop = '0'; card.style.paddingBottom = '0';
  void card.offsetHeight;
  requestAnimationFrame(function () {
    card.style.maxHeight = full + 'px'; card.style.opacity = '';
    card.style.transform = ''; card.style.marginTop = ''; card.style.marginBottom = '';
    card.style.paddingTop = ''; card.style.paddingBottom = '';
  });
  nudgeTimer = setTimeout(function () { card.style.maxHeight = ''; }, 470);
}
function collapseNudge(card, done) {
  clearTimeout(nudgeTimer);
  if (!card || nudgeReduced()) { done(); return; }
  card.style.overflow = 'hidden';
  card.style.maxHeight = card.scrollHeight + 'px';
  void card.offsetHeight;
  requestAnimationFrame(function () {
    card.style.maxHeight = '0px'; card.style.opacity = '0';
    card.style.transform = 'translateY(-8px) scale(.98)';
    card.style.marginTop = '0'; card.style.marginBottom = '0';
    card.style.paddingTop = '0'; card.style.paddingBottom = '0';
  });
  setTimeout(done, 470);
}
function maybeShowHelpNudge() {
  return; /* приглашение к помощнику временно отключено (см. историю: таргетинг/память отказа/копирайт) */
  if (HELP_NUDGE_DISMISSED || LINK_WIZ || helpAnnounceOpen() || !pinsEnteredEnough() || !matrixEmpty()) {
    clearHelpNudge();
    return;
  }
  /* приглашение всегда НАД матрицей (#suggestTop) - и на ПК, и на мобилке */
  var box = document.getElementById('suggestTop');
  var other = document.getElementById('suggestBox');
  if (other && other.querySelector('.helpnudge')) other.innerHTML = '';
  if (!box || box.querySelector('.helpnudge')) return;
  box.innerHTML =
    '<div class="helpnudge">' +
      '<div class="hn-ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v3M12 18v3M4.5 4.5l2 2M17.5 17.5l2 2M3 12h3M18 12h3M19.5 4.5l-2 2M6.5 17.5l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>' +
      '<div class="hn-body">' +
        T('<div class="hn-title">Вашей расстановки ещё нет в базе</div>') +
        T('<div class="hn-sub">Это нормально - большинство замков уникальны. Не вводи связи вслепую: помощник найдёт их по шагам - двигаешь плитку, отмечаешь кто дёрнулся. Без ударов в стену, это проще.</div>') +
        '<div class="hn-act">' +
          T('<button class="btn primary" type="button" id="hnGo">Открыть помощника</button>') +
          T('<button class="hn-skip" type="button" id="hnNo">Введу сам</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  box.querySelector('#hnGo').onclick = function () { clearHelpNudge(); openLinkWizard(); };
  box.querySelector('#hnNo').onclick = function () {
    HELP_NUDGE_DISMISSED = true;
    collapseNudge(box.querySelector('.helpnudge'), clearHelpNudge);
  };
  expandNudge(box.querySelector('.helpnudge'));
}
try { window.matchMedia('(max-width: 560px)').addEventListener('change', maybeShowHelpNudge); } catch (e) {}
/* хуки: проверяем подсказку при каждом изменении штифтов или матрицы */
var _origRenderPins = renderPins;
renderPins = function () { _origRenderPins(); maybeSuggestLinks(); };
var _origRenderLinkSum = renderLinkSum;
renderLinkSum = function () { _origRenderLinkSum(); maybeSuggestLinks(); };
function counterBump() {
  var now = Date.now();
  if (now - lastCounted < 8000) return;
  lastCounted = now;
  fetch(COUNTER_API + '/opened', { method: 'POST' })
    .then(counterJson)
    .then(function (d) { if (typeof d.opened === 'number') { showCounter(d.opened, false); saveCount(d.opened); } })
    .catch(function () {});
}
try { counterLoad(); } catch (e) {}
try { loadLockCounts(); } catch (e) {}

if (!bootConfigFromUrl()) init(6);
maybeShowLinkHelpAnnounce();

var REVERT_NOTE_KEY = 'uml-note-visual-2026-06';
function closeRevertNote() {
  var el = document.getElementById('revertNote');
  if (!el) return;
  el.classList.remove('show');
  setTimeout(function () { el.hidden = true; }, 450);
  try { localStorage.setItem(REVERT_NOTE_KEY, '1'); } catch (e) {}
}
function maybeShowRevertNote() {
  var force = /[?&]note=1(\b|&|$)/.test(location.search); /* ?note=1 - превью без записи флага */
  try { if (!force && localStorage.getItem(REVERT_NOTE_KEY)) return; } catch (e) {}
  var el = document.getElementById('revertNote');
  if (!el) return;
  setTimeout(function () {
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('show'); });
    /* показали один раз - больше не показываем (даже без закрытия) */
    if (!force) { try { localStorage.setItem(REVERT_NOTE_KEY, '1'); } catch (e) {} }
  }, 1200);
}
(function bindRevertNote() {
  var btn = document.getElementById('revertNoteClose');
  if (btn) btn.onclick = closeRevertNote;
})();
maybeShowRevertNote();
