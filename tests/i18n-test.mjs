// Тест переводов: каждая русская фраза в app.js обёрнута в T() и переведена в i18n.en.js,
// в словаре нет лишнего, подстановки {name} совпадают.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// пути к сайту - от корня репозитория, откуда бы ни запускали
process.chdir(new URL('..', import.meta.url).pathname);

const src = readFileSync('site/assets/app.js', 'utf8');
const CYR = /[а-яё]/i;
// фильтр грубых слов в комментариях (список слов и замена ё -> е) - не интерфейс, переводить не нужно
const NOT_UI = new Set(JSON.parse('[' + src.match(/var VP_FB_BANNED = \[([\s\S]*?)\];/)[1].replace(/'/g, '"') + ']'));
NOT_UI.add('е');

/* строковые литералы JS вне комментариев: { value, wrapped } - wrapped, если литерал - первый аргумент T( */
function literals(js) {
  const out = [];
  let i = 0, prev = '';
  while (i < js.length) {
    const c = js[i];
    if (js.startsWith('/*', i)) { i = js.indexOf('*/', i + 2) + 2; continue; }
    if (js.startsWith('//', i) && js[i - 1] !== ':' && js[i - 1] !== '\\') { const j = js.indexOf('\n', i); i = j < 0 ? js.length : j; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < js.length && js[j] !== c) j += js[j] === '\\' ? 2 : 1;
      const value = vm.runInNewContext(js.slice(i, j + 1));
      out.push({ value, wrapped: /(^|[^\w$.])T\( ?$/.test(prev) });
      prev = ''; i = j + 1; continue;
    }
    prev = (prev + (/\s/.test(c) ? ' ' : c)).replace(/ +/g, ' ').slice(-4); // хвост кода перед литералом
    i++;
  }
  return out;
}

const lits = literals(src).filter((l) => CYR.test(l.value) && !NOT_UI.has(l.value));
const unwrapped = [...new Set(lits.filter((l) => !l.wrapped).map((l) => l.value))];
const used = new Set(lits.map((l) => l.value)); // фразы для plural() тоже уходят в T()

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(readFileSync('site/assets/i18n.en.js', 'utf8'), ctx);
const en = ctx.window.UML_I18N;
const missing = [...used].filter((s) => !(s in en.strings));
const extra = Object.keys(en.strings).filter((s) => !used.has(s));
const vars = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
const badVars = Object.entries(en.strings).filter(([ru, tr]) => vars(ru) !== vars(tr));

const fail = [];
if (unwrapped.length) fail.push('русские фразы без T():\n  ' + unwrapped.join('\n  '));
if (missing.length) fail.push('нет перевода в i18n.en.js:\n  ' + missing.join('\n  '));
if (extra.length) fail.push('в i18n.en.js перевод фразы, которой нет в app.js:\n  ' + extra.join('\n  '));
if (badVars.length) fail.push('подстановки {…} в переводе не совпадают:\n  ' + badVars.map(([a, b]) => a + ' -> ' + b).join('\n  '));
if (en.plural(1, 'a', 'b', 'c') !== 'a' || en.plural(3, 'a', 'b', 'c') !== 'c') fail.push('i18n.en.js: plural - 1 -> one, иначе many');
if (fail.length) throw new Error('\n' + fail.join('\n'));
console.log(`OK i18n: ${used.size} фраз, все в T() и переведены`);
