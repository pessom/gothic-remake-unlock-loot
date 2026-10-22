/* ===================== ЯДРО РЕШАТЕЛЯ =====================
   Состояние: массив позиций штифтов (1..7), цель - все 4.
   Ход (i, d): pin[i] += d; для j != i: pin[j] += link[i][j] * d.
   link[i][j]: +1 та же сторона, -1 противоположная, 0 нет связи.
   Ход недопустим, если любой штифт выходит за [1,7]. */
/* solver-start
   Двухфазный решатель: BFS даёт минимальное число ходов L, затем по
   «коридору» кратчайших путей (distS + distG === L) точным DP выбирается
   путь с минимумом переключений между плитками. Меньше переключений =
   меньше действий в игре при том же числе ходов. */
function solveLock(start, link) {
  var n = start.length;
  var pow = [1];
  for (var i = 1; i <= n; i++) pow[i] = pow[i-1] * 7;
  var total = pow[n];
  function encode(s) {
    var x = 0;
    for (var k = n - 1; k >= 0; k--) x = x * 7 + (s[k] - 1);
    return x;
  }
  var goal = encode(new Array(n).fill(4));
  var startIdx = encode(start);
  if (startIdx === goal) return [];

  // эффекты всех 2n ходов
  var moves = [];
  for (var p = 0; p < n; p++) {
    for (var dd = 0; dd < 2; dd++) {
      var d = dd === 0 ? -1 : 1;
      var eff = new Int8Array(n);
      eff[p] = d;
      for (var j = 0; j < n; j++)
        if (j !== p && link[p][j]) eff[j] = link[p][j] * d;
      var delta = 0;
      for (var j2 = 0; j2 < n; j2++) delta += eff[j2] * pow[j2];
      moves.push({ plate: p, d: d, delta: delta, eff: eff });
    }
  }

  var UNSEEN = 0xffff;
  var queue = new Int32Array(total);
  var digits = new Uint8Array(n);

  /* BFS от src; stopAt >= 0 - не раскрывать состояния этого слоя,
     earlyIdx - прекратить, как только это состояние получило метку. */
  function bfs(srcIdx, stopAt, earlyIdx) {
    var dist = new Uint16Array(total);
    dist.fill(UNSEEN);
    var head = 0, tail = 0;
    queue[tail++] = srcIdx;
    dist[srcIdx] = 0;
    while (head < tail) {
      var cur = queue[head++];
      var dc = dist[cur];
      if (stopAt >= 0 && dc >= stopAt) continue;
      var x = cur;
      for (var j3 = 0; j3 < n; j3++) { digits[j3] = x % 7; x = (x - digits[j3]) / 7; }
      for (var m = 0; m < moves.length; m++) {
        var mv = moves[m], ok = true;
        for (var j4 = 0; j4 < n; j4++) {
          var nd = digits[j4] + mv.eff[j4];
          if (nd < 0 || nd > 6) { ok = false; break; }
        }
        if (!ok) continue;
        var nxt = cur + mv.delta;
        if (dist[nxt] !== UNSEEN) continue;
        dist[nxt] = dc + 1;
        if (earlyIdx >= 0 && nxt === earlyIdx) return dist;
        queue[tail++] = nxt;
      }
    }
    return dist;
  }

  var distS = bfs(startIdx, -1, goal);
  var L = distS[goal];
  if (L === UNSEEN) return null;
  var distG = bfs(goal, L, -1);

  /* коридор кратчайших путей, пронумерованный по слоям: cid[s] - номер
     состояния в коридоре, order[c] - обратно. Очередь BFS больше не нужна,
     её память переиспользуем под cid (значимы только ячейки коридора). */
  var cid = queue;
  var layerStart = new Int32Array(L + 2);
  for (var s1 = 0; s1 < total; s1++) {
    var a1 = distS[s1], b1 = distG[s1];
    if (a1 !== UNSEEN && b1 !== UNSEEN && a1 + b1 === L) layerStart[a1 + 1]++;
  }
  for (var t = 0; t <= L; t++) layerStart[t + 1] += layerStart[t];
  var corridor = layerStart[L + 1];
  var order = new Int32Array(corridor);
  var fillAt = layerStart.slice(0, L + 1);
  for (var s2 = 0; s2 < total; s2++) {
    var a = distS[s2], b = distG[s2];
    if (a !== UNSEEN && b !== UNSEEN && a + b === L) { cid[s2] = fillAt[a]; order[fillAt[a]++] = s2; }
  }

  /* точный DP: состояние = (позиции, последняя двигавшаяся плитка).
     best - минимум переключений, from - откуда пришли: номер хода * W + прошлая
     плитка (2n * (n+1) <= 144, влезает в байт). */
  var W = n + 1, NONE = 0xffff;
  var best = new Uint16Array(corridor * W).fill(NONE);
  var from = new Uint8Array(corridor * W);
  best[cid[startIdx] * W + n] = 0;
  for (var c = 0; c < layerStart[L]; c++) {
    var st = order[c], t2 = distS[st], base = c * W;
    var x2 = st;
    for (var j5 = 0; j5 < n; j5++) { digits[j5] = x2 % 7; x2 = (x2 - digits[j5]) / 7; }
    for (var m2 = 0; m2 < moves.length; m2++) {
      var mv2 = moves[m2], ok2 = true;
      for (var j6 = 0; j6 < n; j6++) {
        var nd2 = digits[j6] + mv2.eff[j6];
        if (nd2 < 0 || nd2 > 6) { ok2 = false; break; }
      }
      if (!ok2) continue;
      var nxt2 = st + mv2.delta;
      if (distS[nxt2] !== t2 + 1 || distG[nxt2] !== L - t2 - 1) continue;
      var nkey = cid[nxt2] * W + mv2.plate;
      for (var last = 0; last <= n; last++) {
        var sw = best[base + last];
        if (sw === NONE) continue;
        var nsw = sw + (mv2.plate === last ? 0 : 1);
        if (nsw < best[nkey]) { best[nkey] = nsw; from[nkey] = m2 * W + last; }
      }
    }
  }

  var gc = cid[goal], bestLast = -1, bestSw = NONE;
  for (var l2 = 0; l2 < n; l2++) {
    var v = best[gc * W + l2];
    if (v < bestSw) { bestSw = v; bestLast = l2; }
  }
  if (bestLast < 0) return null;
  var seq = [];
  var cc = gc, cl = bestLast;
  for (var k2 = 0; k2 < L; k2++) {
    var f = from[cc * W + cl], mi = (f / W) | 0;
    seq.push({ plate: moves[mi].plate, d: moves[mi].d });
    cc = cid[order[cc] - moves[mi].delta];
    cl = f % W;
  }
  seq.reverse();
  return seq;
}
/* solver-end */

/* Независимая проверка: воспроизводит решение отдельной физикой.
   Возвращает {ok, states} - states[t] = позиции после t ходов. */
function verifySolution(start, link, seq) {
  var n = start.length;
  var cur = start.slice();
  var states = [cur.slice()];
  for (var t = 0; t < seq.length; t++) {
    var i = seq[t].plate, d = seq[t].d;
    var nxt = cur.slice();
    nxt[i] += d;
    for (var j = 0; j < n; j++)
      if (j !== i && link[i][j]) nxt[j] += link[i][j] * d;
    for (var j2 = 0; j2 < n; j2++)
      if (nxt[j2] < 1 || nxt[j2] > 7) return { ok: false, states: states };
    cur = nxt;
    states.push(cur.slice());
  }
  for (var j3 = 0; j3 < n; j3++)
    if (cur[j3] !== 4) return { ok: false, states: states };
  return { ok: true, states: states };
}
