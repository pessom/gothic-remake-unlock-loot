/* Английские тексты решателя: русская фраза из app.js -> перевод.
   Новая фраза в T('...') -> добавь перевод сюда (tests/i18n-test.mjs проверяет). */
window.UML_I18N = {
  lang: 'en',
  plural: function (n, one, few, many) { return n === 1 ? one : many; },
  strings: {
    '<button type="button" class="countstep" id="countMinus" aria-label="Меньше плиток"':
      '<button type="button" class="countstep" id="countMinus" aria-label="Fewer plates"',
    '<button type="button" class="countstep" id="countPlus" aria-label="Больше плиток"':
      '<button type="button" class="countstep" id="countPlus" aria-label="More plates"',
    'ближняя':
      'near',
    'дальняя':
      'far',
    '<span class="rlbl">плитка </span><b>':
      '<span class="rlbl">plate </span><b>',
    '<tr><th class="corner">плитка &darr;<br>позиция &rarr;</th>':
      '<tr><th class="corner">plate &darr;<br>position &rarr;</th>',
    '" title="Плитка ':
      '" title="Plate ',
    ', позиция ':
      ', position ',
    'не двигается':
      'no movement',
    'в ту же сторону':
      'same direction',
    'в противоположную':
      'in opposite',
    '<tr><th class="corner">двигаю &darr;<br>реагирует &rarr;</th>':
      '<tr><th class="corner">move &darr;<br>affects &rarr;</th>',
    ' двигается - плитка ':
      ' moves - plate ',
    '" title="Связь: плитка ':
      '" title="Link: plate ',
    ' тянет плитку ':
      ' pulls plate ',
    '. Нажми, чтобы убрать.">':
      '. Click to remove.">',
    '<span class="lempty">Связи не отмечены. Если плитки замка двигаются независимо - так и оставь, просто жми &laquo;Взломать&raquo;.</span>':
      '<span class="lempty">No links marked. If plates move independently - leave as is and hit &laquo;Pick lock&raquo;.</span>',
    'Плитка ':
      'Plate ',
    'Пошагово найти связи без удара в стену':
      'Find links step by step without wall hits',
    'Сначала укажи позиции штифтов на шаге 02':
      'Set pin positions in step 02 first',
    'ВЛЕВО':
      'LEFT',
    'ВПРАВО':
      'RIGHT',
    'Безопасный поиск связей':
      'Safe link discovery',
    'Обычно один ход на плитку. Сдвинул в игре и отметил, кто дёрнулся. Дальше считаем сами.':
      'Usually one move per plate. Move in-game, mark what jerked, we compute the rest.',
    '<p class="wizwhy">Откатывать ходы не нужно: следующая команда учитывает новые позиции. Найденные связи остаются, даже если случайно сбросишь замок.</p>':
      '<p class="wizwhy">No need to undo moves: the next command accounts for new positions. Found links stay even if you accidentally reset the lock.</p>',
    '<button class="btn ghost" type="button" id="wizCancelIntro">Отмена</button>':
      '<button class="btn ghost" type="button" id="wizCancelIntro">Cancel</button>',
    '<button class="btn primary" type="button" id="wizStart">Начать</button></div>':
      '<button class="btn primary" type="button" id="wizStart">Start</button></div>',
    ' Открыт <b>':
      ' Opened <b>',
    '</b> раз.':
      '</b> times.',
    'Похоже на замок: <b>':
      'Looks like: <b>',
    ' <b>Важно:</b> связи верны только без прокачанного навыка взлома. Проверь матрицу, а если ход не совпал - напиши в комментариях на DTF или в личку.':
      ' <b>Note:</b> the links are only valid if your lockpicking skill is not leveled up. Check the matrix, and if a move differs in game, report it in the DTF comments or DM me.',
    'Эту расстановку уже вскрывали <b>':
      'This layout was already cracked <b>',
    '</b> раз. <b>Важно:</b> связи верны только без прокачанного навыка взлома. Проверь матрицу, а если ход не совпал - напиши в комментариях на DTF или в личку.':
      '</b> times. <b>Note:</b> the links are only valid if your lockpicking skill is not leveled up. Check the matrix, and if a move differs in game, report it in the DTF comments or DM me.',
    '<button class="btn primary" type="button" id="wizSgYes">Подставить связи и продолжить</button></div>':
      '<button class="btn primary" type="button" id="wizSgYes">Fill links and continue</button></div>',
    'Подставлено: ':
      'Filled ',
    ', но ':
      ', but ',
    ' яч. отличались от твоих отметок':
      ' cells differ from your marks',
    'Подставлено связей: ':
      'Filled ',
    ' - сверим их пробами, ожидаемое отмечу заранее':
      ' links - we will check them with probes, expected moves pre-marked',
    'Связь записана. Замок сбросился: штифты вернулись к исходным':
      'Link saved. The lock reset: pins are back to the starting positions',
    'Ход не прошёл. Связь записана, к этой плитке вернёмся позже':
      'Move blocked - link saved, we will come back to this plate',
    'влево':
      'left',
    'вправо':
      'right',
    '" id="linkWizMap" role="img" aria-label="Схема замка: сдвинь плитку ':
      '" id="linkWizMap" role="img" aria-label="Lock schematic: move plate ',
    'Вспомогательный ход: уводим плитки от стены. Связи запишутся сами.':
      'Helper move: walking plates off the wall. Links are recorded automatically.',
    'Вместе с ней поедут <b>':
      '<b>',
    'плитки ':
      'Plates ',
    'плитка ':
      'Plate ',
    '</b> - это уже известно, отмечать ничего не нужно.':
      '</b> will slide with it - already known, nothing to mark.',
    'Никто за ней не потянется.':
      'Nothing will follow it.',
    '<p class="wv-helpnote">Это <b>уже проверенная плитка</b>. Сдвинь её <b>':
      '<p class="wv-helpnote">This is an <b>already-verified plate</b>. Move it <b>',
    '</b> в игре, чтобы освободить другую. ':
      '</b> in the game to free another one. ',
    ' Просто жми «Дальше».</p>':
      ' Just hit "Next".</p>',
    '<button class="btn primary" type="button" id="wizConfirm">Дальше</button></div>':
      '<button class="btn primary" type="button" id="wizConfirm">Next</button></div>',
    '<p class="wizfoot-aside"><button type="button" id="wizGameReset">Случайно сбросил замок</button></p>':
      '<p class="wizfoot-aside"><button type="button" id="wizGameReset">Accidentally reset the lock</button></p>',
    'Штифты вернулись к исходным, найденные связи сохранены':
      'Pins are back to the starting positions, found links kept',
    'Вспомогательный ход: увести плитку от стены. Связи уже известны.':
      'Helper move: walk this plate away from the wall. Its links are already known.',
    'Сдвинь в игре <span class="wv-dir ':
      'Move it in-game <span class="wv-dir ',
    '</span> и отметь, какие плитки дёрнулись вместе с ней. Кнопка <b>!</b> — плитка упёрлась в стену.':
      '</span> and mark which plates jerked with it. Button <b>!</b> — the plate hit the wall.',
    '<span>Это была последняя ошибка: <b>замок сбросился</b>. Связь всё равно запишем, а штифты вернём к исходным позициям.</span></label>':
      '<span>That was the last mistake: the <b>lock reset</b>. We still record the link, and pins go back to the starting positions.</span></label>',
    '<p class="wizhelpnote">Заранее отмечено по известным связям: ':
      '<p class="wizhelpnote">Pre-marked from known links: ',
    'плитки':
      'plates',
    'плитка':
      'plate',
    '</b>. Сверь с игрой и исправь, если что-то не так.</p>':
      '</b>. Check against the game and fix if something differs.</p>',
    'Плитки ':
      'Plates ',
    ' по известным связям должны были сдвинуться. Если не двигались - нажми ещё раз':
      ' should have moved by known links. If they did not move - press again',
    ' по известной связи должна была сдвинуться. Если не двигалась - нажми ещё раз':
      ' should have moved by a known link. If it did not move - press again',
    'Если кто-то упёрся в стену, ход не прошёл - съехать никто не мог. Проверь отметки':
      'If something hit the wall, the move failed - nothing could slide. Check your marks',
    'Отметь, что стало с плиткой ':
      'Mark what happened to plate ',
    'Если кто-то упёрся в стену, ход не прошёл и съехать никто не мог. Проверь отметки':
      'If something hit the wall, the move failed - nothing could slide. Check your marks',
    '<span>ВЛЕВО</span>':
      '<span>LEFT</span>',
    '<span>ВПРАВО</span>':
      '<span>RIGHT</span>',
    'штифт ':
      'pin ',
    ' &rarr; <b class="wall">&times;</b> (упор в стену)':
      ' &rarr; <b class="wall">&times;</b> (hits the wall)',
    '<div class="wizmover-head">Плитка <b>':
      '<div class="wizmover-head">Plate <b>',
    '</b>: куда дёрнулась?</div>':
      '</b>: which way did it jerk?</div>',
    '</b>. Это уже известно - отмечать ничего не нужно, просто сделай ход.':
      '</b> will slide with it. Already known - nothing to mark, just make the move.',
    'Никто за ней не потянется. Просто сделай ход.':
      'Nothing will follow it. Just make the move.',
    '<div class="wizcmd"><div class="lbl">Сдвинь в игре</div>':
      '<div class="wizcmd"><div class="lbl">In-game move</div>',
    '<p class="wizmeta">штифт ':
      '<p class="wizmeta">pin ',
    '</b> · откатывать не нужно</p></div>':
      '</b> · no need to undo</p></div>',
    '<p class="wizhelpnote">Это <b>уже проверенная плитка</b>. ':
      '<p class="wizhelpnote">This is an <b>already-verified plate</b>. ',
    '"><input type="checkbox">плитка<b>':
      '"><input type="checkbox">plate<b>',
    'Вспомогательный ход: увести плитку от стены. Связи этой плитки уже известны.':
      'Helper move - pull a plate off the wall, this row is already known.',
    'Шаг ':
      'Step ',
    ' · сдвинь плитку в игре и отметь, какие плитки дёрнулись вместе с ней. Откатывать ходы не нужно.':
      ' - move the plate in-game, then mark which plates jerked with it. No need to undo moves.',
    '<div class="plate">плитка <b>':
      '<div class="plate">plate <b>',
    '<p class="wizpick">Кто дёрнулся вместе с плиткой <b>':
      '<p class="wizpick">What jerked with plate <b>',
    '<button class="btn" type="button" id="wizNone">Никто не дёрнулся</button>':
      '<button class="btn" type="button" id="wizNone">Nothing jerked</button>',
    'Не все связи проверены':
      'Some links unverified',
    'Готово':
      'Done',
    'Часть связей не проверить, не ударившись в стену.':
      'Some links can\'t be checked without hitting a wall.',
    'Матрица обновлена. Перепроверь связи и жми «Взломать».':
      'Matrix updated. Double-check links, then Break the lock.',
    'Плитки у стены заблокировали оставшиеся пробы. <b>Эти связи не записаны или не сверены с игрой</b> - если решить замок сейчас, ход может удариться в стену. Отметь их в матрице вручную или сдвинь блокирующую плитку в игре и запусти мастер заново.':
      'Plates at the wall blocked the remaining probes. <b>Those links are not recorded or not checked in game</b> - solving now may drive a move into the wall. Set them manually, or move a blocking plate in-game and rerun the wizard.',
    'Если что-то не сходится с игрой, поправь ячейки вручную или запусти мастер заново.':
      'If something does not match the game - fix cells manually or restart the wizard.',
    '<p class="wizhelpnote"><b>Вернуть штифты</b> - если выйдешь из взлома в игре и зайдёшь снова: замок сбросится к исходным позициям. <b>Просто закрыть</b> - если продолжаешь с текущих позиций.</p>':
      '<p class="wizhelpnote"><b>Restore pins</b> - if you exit lockpicking in game and start again: the lock resets to its starting positions. <b>Just close</b> - if you continue from the current positions.</p>',
    '<button class="btn ghost" type="button" id="wizRestore">Вернуть штифты и закрыть</button>':
      '<button class="btn ghost" type="button" id="wizRestore">Restore pins &amp; close</button>',
    '<button class="btn primary" type="button" id="wizDone">Просто закрыть</button></div>':
      '<button class="btn primary" type="button" id="wizDone">Just close</button></div>',
    'Часть связей не проверена - впиши вручную':
      'Some links unverified - add them manually',
    'Связи записаны в матрицу':
      'Links saved to matrix',
    '<div class="sol-head"><span class="sol-title">Решение</span><span class="sol-meta">перебираю состояния&hellip;</span></div>':
      '<div class="sol-head"><span class="sol-title">Solution</span><span class="sol-meta">searching states&hellip;</span></div>',
    '<div class="sol-head"><span class="sol-title">Решение</span></div>':
      '<div class="sol-head"><span class="sol-title">Solution</span></div>',
    '<div class="msg err"><b>Безопасного решения не существует</b> для этой конфигурации. ':
      '<div class="msg err"><b>No safe solution exists</b> for this config. ',
    'Почти наверняка ошибка во вводе: перепроверь стартовые позиции и связи - особенно направление ':
      'Almost certainly an input error: recheck start pins and links - especially same/opposite direction ',
    '«та же / противоположная» и односторонние связи. Подробнее в разделе ниже.</div>':
      'and one-way links. See FAQ below.</div>',
    '<div class="msg ok">Все штифты уже в центре - замок открыт. Ходов не нужно.</div>':
      '<div class="msg ok">All pins already centered - lock is open. No moves needed.</div>',
    '<div class="msg err">Внутренняя ошибка проверки решения - сообщите автору сайта.</div>':
      '<div class="msg err">Internal verification error - please report to the site author.</div>',
    '<span class="dirchip L">&larr; ВЛЕВО</span>':
      '<span class="dirchip L">&larr; LEFT</span>',
    '<span class="dirchip R">ВПРАВО &rarr;</span>':
      '<span class="dirchip R">RIGHT &rarr;</span>',
    '<p class="vp-fb-q">Сайт помог?</p>':
      '<p class="vp-fb-q">Did this help?</p>',
    '<button class="vp-fb-btn vp-fb-up" id="vpFbUp" type="button">Да</button>':
      '<button class="vp-fb-btn vp-fb-up" id="vpFbUp" type="button">Yes</button>',
    '<button class="vp-fb-btn vp-fb-down" id="vpFbDn" type="button">Нет</button>':
      '<button class="vp-fb-btn vp-fb-down" id="vpFbDn" type="button">No</button>',
    '<p class="vp-fb-dq">Что не так? Можно несколько</p>':
      '<p class="vp-fb-dq">What went wrong? Pick any that apply</p>',
    '<button type="button" class="vp-fb-chip" data-r="wrong_solution">Решение неверное</button>':
      '<button type="button" class="vp-fb-chip" data-r="wrong_solution">Wrong solution</button>',
    '<button type="button" class="vp-fb-chip" data-r="wizard_confusing">Помощник запутал</button>':
      '<button type="button" class="vp-fb-chip" data-r="wizard_confusing">Wizard confusing</button>',
    '<button type="button" class="vp-fb-chip" data-r="suggest_wrong">Подсказка неверная</button>':
      '<button type="button" class="vp-fb-chip" data-r="suggest_wrong">Suggest was wrong</button>',
    '<button type="button" class="vp-fb-chip" data-r="input_unclear">Не понял ввод</button>':
      '<button type="button" class="vp-fb-chip" data-r="input_unclear">Hard to understand input</button>',
    '<button type="button" class="vp-fb-chip" data-r="slow_bug">Тормозит / глючит</button>':
      '<button type="button" class="vp-fb-chip" data-r="slow_bug">Slow / buggy</button>',
    '<button type="button" class="vp-fb-chip" data-r="old_ui_better">Старая схема лучше</button>':
      '<button type="button" class="vp-fb-chip" data-r="old_ui_better">Old UI was better</button>',
    '<button type="button" class="vp-fb-chip" data-r="still_bad">Всё равно неудобно</button>':
      '<button type="button" class="vp-fb-chip" data-r="still_bad">Still awkward</button>',
    '<button type="button" class="vp-fb-chip" data-r="other">Другое</button>':
      '<button type="button" class="vp-fb-chip" data-r="other">Other</button>',
    '<label class="vp-fb-lbl" for="vpFbNote">Комментарий <span>(необязательно)</span></label>':
      '<label class="vp-fb-lbl" for="vpFbNote">Comment <span>(optional)</span></label>',
    '<textarea class="vp-fb-note" id="vpFbNote" rows="2" maxlength="280" placeholder="Что ещё стоит улучшить?"></textarea>':
      '<textarea class="vp-fb-note" id="vpFbNote" rows="2" maxlength="280" placeholder="Anything else to improve?"></textarea>',
    '<p class="vp-fb-err" id="vpFbNoteErr" hidden>Комментарий с грубыми словами не сохранили - но оценку и причины приняли, спасибо.</p>':
      '<p class="vp-fb-err" id="vpFbNoteErr" hidden>We didn\'t save the comment with profanity - but your rating and reasons are in, thanks.</p>',
    '<button class="btn primary" type="button" id="vpFbDownSend">Отправить</button>':
      '<button class="btn primary" type="button" id="vpFbDownSend">Send</button>',
    '<button class="btn ghost" type="button" id="vpFbDownSkip">Пропустить</button>':
      '<button class="btn ghost" type="button" id="vpFbDownSkip">Skip</button>',
    '<p class="vp-fb-hint" id="vpFbHint" hidden>Оценку можно изменить</p>':
      '<p class="vp-fb-hint" id="vpFbHint" hidden>You can change your vote</p>',
    '<p class="vp-fb-thanks" id="vpFbThanks">Спасибо!</p>':
      '<p class="vp-fb-thanks" id="vpFbThanks">Thanks!</p>',
    '<div class="sol-head"><span class="sol-title">Решение</span>':
      '<div class="sol-head"><span class="sol-title">Solution</span>',
    '</b> ходов &middot; ':
      '</b> moves &middot; ',
    ' действий &middot; ':
      ' actions &middot; ',
    ' мс &middot; без ударов о стену</span></div>':
      ' ms &middot; no wall hits</span></div>',
    '" data-mode="list" type="button">Список</button>':
      '" data-mode="list" type="button">List</button>',
    '<svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M2 1.3v8.4l7-4.2z"/></svg>Показ по шагам</button>':
      '<svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor"><path d="M2 1.3v8.4l7-4.2z"/></svg>Step-by-step</button>',
    '> позиции штифтов после каждого шага</label>':
      '> pin positions after each step</label>',
    '> направления показывают, куда двигать пластину (какую кнопку жать); выключи - будет движение штифта</label>':
      '> directions show plate movement (button to press); off - pin movement</label>',
    '<span class="stepmove">Плитка <b>':
      '<span class="stepmove">Plate <b>',
    '</div><div class="msg ok">После последнего шага все штифты встанут в центр - замок откроется. ':
      '</div><div class="msg ok">After the last step all pins reach center - lock opens. ',
    'Решение проверено симуляцией перед выводом. Кликай по шагам, чтобы отмечать выполненные.</div></div>':
      'Solution verified by simulation. Click steps to mark done.</div></div>',
    'Новый замок</button>':
      'New lock</button>',
    '<button id="vpPrev" class="btn" type="button">&larr; Назад</button>':
      '<button id="vpPrev" class="btn" type="button">&larr; Back</button>',
    '<button id="vpNext" class="btn primary" type="button">Далее &rarr;</button>':
      '<button id="vpNext" class="btn primary" type="button">Next &rarr;</button>',
    'Плитка <b>':
      'Plate <b>',
    '&larr; влево':
      '&larr; left',
    'вправо &rarr;':
      'right &rarr;',
    'Готово - замок открыт':
      'Done - lock opens',
    'Действие ':
      'Action ',
    ' из ':
      ' of ',
    'ход ':
      'move ',
    'Все штифты в центре':
      'All pins centered',
    '1 снизу, как в игре':
      '1 at bottom, in-game order',
    '1 сверху':
      '1 on top',
    'Замок загружен из ссылки':
      'Lock loaded from link',
    'Не удалось прочитать ссылку - скопируйте её целиком':
      'Could not read link - copy the full URL',
    'Реальный замок: дверь башни Старого Лагеря':
      'Real lock: the Old Camp tower door',
    '<div class="tourpop-foot"><button class="tourpop-skip" id="tourSkip" type="button">Пропустить</button>':
      '<div class="tourpop-foot"><button class="tourpop-skip" id="tourSkip" type="button">Skip</button>',
    '<button class="btn primary" id="tourNextBtn" type="button">Дальше</button></div>':
      '<button class="btn primary" id="tourNextBtn" type="button">Next</button></div>',
    '<button class="wiztour-skip" type="button">Пропустить тур</button>':
      '<button class="wiztour-skip" type="button">Skip tour</button>',
    'Демо':
      'Demo',
    'Открыть помощника':
      'Open the wizard',
    'Покажу на готовом примере. Положение штифтов уже введено, и <b>половина связей</b> известна. Дозаполним матрицу - это можно сделать вручную или <b>помощником</b>. Открою помощника.':
      'Let me show you on a ready lock. The pin positions are already entered, and <b>half the links</b> are known. We will finish the matrix - you can do it by hand or with the <b>wizard</b>. I will open the wizard.',
    'Помощник · шаг 1':
      'Wizard · step 1',
    'Помощник просит сдвинуть <b>плитку 6 вправо</b>. Двигаю её в игре - вместе с ней вправо поехали <b>плитки 3 и 5</b>, я их отметил. Жми <b>«Дальше»</b>.':
      'The wizard asks to move <b>plate 6 right</b>. I move it in the game - <b>plates 3 and 5</b> slid right with it, so I marked them. Hit <b>"Next"</b>.',
    'Помощник · шаг 2':
      'Wizard · step 2',
    'Теперь <b>плитка 4</b>. Сдвинул её - <b>никто не дёрнулся</b>. Значит связей у неё нет: просто жми <b>«Дальше»</b>.':
      'Now <b>plate 4</b>. I moved it - <b>nothing jerked</b>. So it has no links: just hit <b>"Next"</b>.',
    'Взломать':
      'Break the lock',
    'Матрица заполнена полностью. Закрываем помощника - осталось нажать <b>«Взломать»</b>.':
      'The matrix is fully filled in. Close the wizard - all that is left is to press <b>"Break the lock"</b>.',
    'Решение':
      'Solution',
    'Понятно':
      'Got it',
    'Готово - вот <b>безопасный путь</b>: порядок ходов, который откроет замок и не сломает отмычку. Так же решается любой твой замок - введи штифты, заполни связи (сам или помощником) и жми «Взломать».':
      'Done - here is the <b>safe path</b>: the move order that opens the lock without breaking your pick. Every lock works the same - enter the pins, fill the links (yourself or with the wizard) and press "Break the lock".',
    'Ссылка на замок скопирована':
      'Lock link copied',
    'Скопируй ссылку:':
      'Copy link:',
    'Не меньше этого числа - точное сейчас недоступно':
      'At least this many - exact number temporarily unavailable',
    'замок уже взломан':
      'lock cracked so far',
    'замка уже взломано':
      'locks cracked so far',
    'замков уже взломано':
      'locks cracked so far',
    '<span class="suggest-main"><span class="beta-chip">Бета</span><span class="suggest-copy">':
      '<span class="suggest-main"><span class="beta-chip">Beta</span><span class="suggest-copy">',
    '<button class="btn" type="button" id="sgYes">Подставить</button>':
      '<button class="btn" type="button" id="sgYes">Fill in</button>',
    '<button class="btn ghost" type="button" id="sgNo">Сам введу</button>':
      '<button class="btn ghost" type="button" id="sgNo">Enter manually</button>',
    'Связи подставлены - проверь матрицу и жми «Взломать»':
      'Links filled in - check the matrix and hit Pick lock',
    '<div class="hn-title">Вашей расстановки ещё нет в базе</div>':
      '<div class="hn-title">This layout is not in the database yet</div>',
    '<div class="hn-sub">Это нормально - большинство замков уникальны. Не вводи связи вслепую: помощник найдёт их по шагам - двигаешь плитку, отмечаешь кто дёрнулся. Без ударов в стену, это проще.</div>':
      '<div class="hn-sub">That is normal - most locks are unique. Do not guess the links: the wizard finds them step by step - nudge a plate, mark what moved with it. No wall hits, and it is easier.</div>',
    '<button class="btn primary" type="button" id="hnGo">Открыть помощника</button>':
      '<button class="btn primary" type="button" id="hnGo">Open the wizard</button>',
    '<button class="hn-skip" type="button" id="hnNo">Введу сам</button>':
      '<button class="hn-skip" type="button" id="hnNo">I will enter them</button>',
    '(сейчас неизвестно <b>{n}</b> {links})':
      '(<b>{n}</b> unknown {links} left)',
    'связь':
      'link',
    'связи':
      'links',
    'связей':
      'links',
    'Есть отличия от твоих отметок: {n} яч. Проверь матрицу':
      '{n} cells differ from your marks - check the matrix',
    'плиток':
      'plates',
    '<div class="wizsuggest-head"><span class="beta-chip">Бета</span><p>':
      '<div class="wizsuggest-head"><span class="beta-chip">Beta</span><p>'
  }
};
