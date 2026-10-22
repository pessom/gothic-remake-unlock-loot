/* Замок в locks.yaml <-> код для ссылок ?lock=.
   В locks.yaml замок записан явно:
     pins: [6, 3, 2, 1, 7]   - стартовые позиции штифтов (1..7), плитки 1..N
     links:                  - связи: двигаю плитку -> кто едет вместе с ней
       4: +2 -3 -5           - +N в ту же сторону, -N в противоположную
   Код (v2, как на сайте): base64url-поток - 3 бита N-3, 1 бит (устаревший порядок
   строк, всегда 0), по 3 бита на штифт, по 2 бита на связь (1 - та же, 2 - противоположная). */

const CODE_ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const codeBitLen = (n) => 4 + 3 * n + 2 * n * (n - 1);

/* код -> { n, pins, link } или null */
export function decodeLock(code) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]{5,24}$/.test(code)) return null;
  const bits = [];
  for (const ch of code) { const v = CODE_ABC.indexOf(ch); for (let b = 5; b >= 0; b--) bits.push((v >> b) & 1); }
  let pos = 0;
  const read = (w) => { let v = 0; for (let b = 0; b < w; b++) v = (v << 1) | bits[pos++]; return v; };
  const n = read(3) + 3;
  if (code.length !== Math.ceil(codeBitLen(n) / 6)) return null;
  read(1); // бит порядка строк - устарел
  const pins = [];
  for (let i = 0; i < n; i++) { const p = read(3); if (p > 6) return null; pins.push(p + 1); }
  const link = [];
  for (let i = 0; i < n; i++) {
    link.push(new Array(n).fill(0));
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const t = read(2);
      if (t > 2) return null;
      link[i][j] = t === 1 ? 1 : t === 2 ? -1 : 0;
    }
  }
  return { n, pins, link };
}

/* pins + матрица связей -> код (тот же, что собирает сайт) */
export function encodeLock(pins, link) {
  const n = pins.length, bits = [];
  const push = (v, w) => { for (let b = w - 1; b >= 0; b--) bits.push((v >> b) & 1); };
  push(n - 3, 3);
  push(0, 1);
  for (const p of pins) push(p - 1, 3);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j) push(link[i][j] === 1 ? 1 : link[i][j] === -1 ? 2 : 0, 2);
  let out = '';
  for (let k = 0; k < bits.length; k += 6) {
    let v = 0;
    for (let b = 0; b < 6; b++) v = (v << 1) | (k + b < bits.length ? bits[k + b] : 0);
    out += CODE_ABC[v];
  }
  return out;
}

/* pins/links из locks.yaml -> { pins, link } ; ошибки складывает в errs */
export function parseLock(rawPins, rawLinks, errs) {
  if (!Array.isArray(rawPins) || rawPins.length < 3 || rawPins.length > 8) {
    errs.push('pins: нужен список из 3-8 позиций, например [6, 3, 2, 1, 7]');
    return null;
  }
  const n = rawPins.length;
  if (rawPins.some((p) => !Number.isInteger(p) || p < 1 || p > 7)) errs.push('pins: позиции - целые числа от 1 до 7');
  const link = Array.from({ length: n }, () => new Array(n).fill(0));
  if (rawLinks != null && (typeof rawLinks !== 'object' || Array.isArray(rawLinks))) {
    errs.push('links: нужен список плиток вида «4: +2 -3»');
    return null;
  }
  for (const [key, val] of Object.entries(rawLinks || {})) {
    const i = Number(key);
    if (!Number.isInteger(i) || i < 1 || i > n) { errs.push(`links: плитки ${key} нет (их ${n})`); continue; }
    /* YAML читает «+4» и «-5» как числа - принимаем и число, и строку «+2 -3» */
    const tokens = typeof val === 'number' ? [String(val)] : String(val ?? '').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) errs.push(`links.${i}: пусто - удали строку или укажи связи`);
    for (const t of tokens) {
      const m = t.replace('−', '-').match(/^([+-]?)(\d)$/);
      const j = m && Number(m[2]);
      if (!m || j < 1 || j > n) { errs.push(`links.${i}: «${t}» - нужно +N или -N, где N - плитка 1..${n}`); continue; }
      if (j === i) { errs.push(`links.${i}: плитка не связана сама с собой`); continue; }
      if (link[i - 1][j - 1]) { errs.push(`links.${i}: плитка ${j} указана дважды`); continue; }
      link[i - 1][j - 1] = m[1] === '-' ? -1 : 1;
    }
  }
  return { pins: rawPins.slice(), link };
}

/* матрица связей -> строки «4: +2 -3 -5» для locks.yaml */
export function linksYaml(link, indent = '    ') {
  const rows = [];
  link.forEach((row, i) => {
    const t = row.map((v, j) => (v ? (v > 0 ? '+' : '-') + (j + 1) : '')).filter(Boolean);
    if (t.length) rows.push(`${indent}${i + 1}: ${t.join(' ')}`);
  });
  return rows;
}
