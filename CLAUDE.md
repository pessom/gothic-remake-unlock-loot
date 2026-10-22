# UnlockMyLoot

Решатель замков Gothic 1 Remake: статический сайт (vanilla JS, без сборки) + небольшой Cloudflare Worker для счётчика и статистики. Устройство и команды — в `README.md`, почему так сделано — в `docs/decisions.md`. Прочитай журнал решений, прежде чем менять мастер связей, решатель, каталог или формат кода замка.

## Где что

- `site/` — корень сайта, выкладывается целиком. `site/index.html` и `site/en/index.html` — решатель RU и EN: **логика продублирована, правки вносить в оба файла**.
- `locks.yaml` — единственный источник каталога замков (`pins` + `links`). Собранное (`site/locks/*`, `site/en/locks/`, `site/sitemap.xml`) в git не хранится.
- `tools/build-locks.mjs` — генератор каталога, `tools/lock-format.mjs` — pins/links ↔ код ссылки, `tools/templates/` — шаблоны каталога.
- `worker/` — Cloudflare Worker. `id` KV в `worker/wrangler.toml` не менять.
- `tests/` — регрессионные тесты, `docs/` — внутренние заметки.

## Команды

```bash
npm install            # один раз
npm test               # все тесты (~40 с)
npm run build:locks    # собрать каталог из locks.yaml в site/
npm run serve          # собрать и поднять сайт на http://localhost:8000
npm run lock -- <код>  # код ?lock= с сайта -> pins/links для locks.yaml
```

## Что нельзя ломать

- Маркеры `solver-start`/`solver-end` и `wiz-core-start`/`wiz-core-end` в `site/index.html`: по ним тесты и генератор вырезают код.
- Связи из подсказки — только ожидание: мастер обязан сверить их пробой. Подсказка ищется по исходным штифтам (`lockBasePins()`).
- Бит порядка строк в коде замка всегда 0; ссылки `?lock=` не меняют порядок плиток.
- Сайт работает без API: обращения к воркеру — в фоне с `.catch`, интерфейс их не ждёт.
- Каталог правится только в `locks.yaml`; решатель работает и без `locks-data.js`.

## Как работаем

- Объяснения и сообщения коммитов — на русском.
- Репозиторий — `pessom/gothic-remake-unlock-loot` (ремоут `pessom`). Ветка от `pessom/main` (`feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…`), один осмысленный коммит, PR в `main`; мержит владелец. Мерж в `main` деплоит сайт на <https://gothic-remake-unlock-loot.pessom.xyz>.
- Перед PR: `npm test`, `npm run build:locks`. Изменения интерфейса проверять в браузере на RU и EN.
- Новое значимое решение — дописать раздел в `docs/decisions.md`.
