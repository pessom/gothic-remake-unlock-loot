#!/usr/bin/env node
/* Код замка с сайта -> готовый кусок для locks.yaml (pins + links).
   Запуск: npm run lock -- SojAgCBDQA
           npm run lock -- "https://unlockmyloot.com/?lock=SojAgCBDQA" */
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { decodeLock, encodeLock, parseLock, linksYaml } from './lock-format.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const arg = (process.argv[2] || '').trim();
const code = (arg.match(/lock=([A-Za-z0-9_-]+)/) || [null, arg])[1];
const dec = decodeLock(code);
if (!dec) {
  console.error(`Не похоже на код замка: «${arg}». Пример: npm run lock -- SojAgCBDQA`);
  process.exit(1);
}

/* уже есть в каталоге? сравниваем по коду, посчитанному из pins/links */
const canon = encodeLock(dec.pins, dec.link);
const known = YAML.parse(readFileSync(join(ROOT, 'locks.yaml'), 'utf8')).find((L) => {
  const p = parseLock(L.pins, L.links, []);
  return p && encodeLock(p.pins, p.link) === canon;
});
const links = dec.link.flat().filter(Boolean).length;

console.log(`# ${dec.n} плиток, ${links} связей` + (known ? ` - уже в locks.yaml: «${known.ru && known.ru.name}»` : ''));
console.log(`- pins: [${dec.pins.join(', ')}]`);
const rows = linksYaml(dec.link);
console.log(rows.length ? '  links:\n' + rows.join('\n') : '  links: {}   # связей нет');
