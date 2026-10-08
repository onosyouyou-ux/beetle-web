/* ============================================================
   tokei.js — とけい修行
   アナログ時計はSVGでその場で描く（画像素材を持たない）。
   出題も採点もブラウザ内で完結し、サーバーには何も送らない。
   ============================================================ */
(function () {
  'use strict';

  var app = document.getElementById('tk-app');
  if (!app) return;

  var SET_LENGTH = 10;

  /* なんいどは「手裏剣の数＝level」で見せる。配列の並び順ではなく level を持たせるのは、
     はりを1本ずつ見る2つ（みじかい／ながい）を同じ段に横並びで置くため（2026-09-08）。
     pair が同じものは1行にまとめて描く。 */
  var LEVEL_MAX = 5;
  var SHOW_LEVEL_BADGE = false; // 手裏剣の なんいど表示（2026-09-24に非表示。戻すときは true）

  var STEPS = [
    { id: 'hand-h', level: 1, pair: 'hand', name: 'みじかい はりだけ', note: 'なんじ？', step: 60, hands: 'hour' },
    { id: 'hand-m', level: 1, pair: 'hand', name: 'ながい はりだけ', note: 'なんぷん？', step: 5, hands: 'minute' },
    { id: 'hour', level: 2, name: 'ちょうどの じかん', note: '3じ・8じ など', step: 60, hands: 'both' },
    { id: 'half', level: 3, name: '30ぷんきざみ', note: 'ちょうど と 30ぷん', step: 30, hands: 'both' },
    { id: 'five', level: 4, name: '5ふんきざみ', note: '5・10・15…', step: 5, hands: 'both' },
    { id: 'one', level: 5, name: '1ぷんきざみ', note: 'ぜんぶの ぷん', step: 1, hands: 'both' }
  ];

  // ラベルは「なにを聞かれるか」を そのまま問いの形で書く（2026-09-12）。
  // 「とけいを よむ／さがす」では、どちらも時計の話に見えて違いが伝わらなかった。
  // grade は カードの上に出す すすめる学年のリボン（2026-10-08）
  var MODES = [
    { id: 'read', name: 'いま なんじ？', note: 'とけいを みて じこくを こたえる', img: '/assets/images/ninja/modes/tokei-read.webp', grade: '1・2ねん' },
    { id: 'find', name: 'とけいは どれ？', note: 'じこくを みて とけいを えらぶ', img: '/assets/images/ninja/modes/tokei-find.webp', grade: '1・2ねん' },
    // 時間の たしざん・ひきざん（3年で習う。2026-10-08）。絵は あとで 描く（それまでは とけいの SVG を仮に出す）
    { id: 'calc', name: 'なんぷん あと？', note: 'じかんの たしざん・ひきざん', img: null, grade: '3ねん' }
  ];

  /* 時間の けいさん の だん（2026-10-08）。1セットの中で「○ぷん あと／○ぷん まえ／なんぷん たった」を まぜて出す
     - c-in   … 5ふんきざみ・ちょうどの じこく を またがない（3:10 の 20ぷん あと → 3:30）
     - c-over … 5ふんきざみ・ちょうどの じこく を またぐ（3:50 の 20ぷん あと → 4:10）。いちばん つまずく ところ
     - c-long … 1ぷんきざみ・1じかんを こえる（2:45 の 1じかん20ぷん あと） */
  var CALC_STEPS = [
    { id: 'c-in', name: '5ふん・またがない', note: '3じ10ぷん の 20ぷん あと', hands: 'both' },
    { id: 'c-over', name: '5ふん・またぐ', note: '3じ50ぷん の 20ぷん あと', hands: 'both' },
    { id: 'c-long', name: '1ぷん・1じかんを こえる', note: '2じ45ふん の 1じかん20ぷん あと', hands: 'both' }
  ];

  var state = {
    stepId: 'hour',
    modeId: 'read',
    showMinutes: true,
    session: null
  };

  function stepOf(id) {
    var all = STEPS.concat(CALC_STEPS);
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return STEPS[2];
  }

  /* ---------- 時刻のことば ---------- */

  // 分の読みは1の位で「ふん／ぷん」が決まる
  // 0ぷん 1ぷん 2ふん 3ぷん 4ぷん 5ふん 6ぷん 7ふん 8ぷん 9ふん
  var PUN = 'ぷぷふぷぷふぷふぷふ';
  function punOf(m) { return PUN.charAt(m % 10) + 'ん'; }

  function timeText(h, m) {
    if (m === 0) return h + 'じ';
    return h + 'じ' + m + punOf(m);
  }

  // はりを1本だけ見る段では、答えも「じ」だけ／「ぷん」だけになる
  function answerText(o, hands) {
    if (hands === 'hour') return o.h + 'じ';
    // ながい はりだけ で 12 を さす ときは「0ぷん」ではなく「ちょうど」（2026-10-07）
    if (hands === 'minute') return o.m === 0 ? 'ちょうど' : o.m + punOf(o.m);
    return timeText(o.h, o.m);
  }

  function askText(hands) {
    if (hands === 'hour') return 'なんじ?';
    if (hands === 'minute') return 'なんぷん?';
    return 'なんじ なんぷん?';
  }

  /* ---------- 時計のSVG ----------
     hands: 'both'（りょうほう）／'hour'（みじかい はりだけ）／'minute'（ながい はりだけ） */

  function clockSvg(h, m, size, showMinutes, hands) {
    hands = hands || 'both';
    // みじかい はりだけの段では、外がわの「ぷん」の数字は手がかりにならないので出さない
    if (hands === 'hour') showMinutes = false;

    var cx = 110, cy = 110, R = 92;
    var s = '<svg class="tk-clock" viewBox="0 0 220 220" width="' + size + '" height="' + size + '" role="img" aria-label="とけい">';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (R + 12) + '" fill="#f6ede0" stroke="#d9c7ab" stroke-width="4"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + R + '" fill="#fffdf8" stroke="#c9b696" stroke-width="2"/>';

    var i, a, x1, y1, x2, y2;
    // 分のめもり
    for (i = 0; i < 60; i++) {
      a = (i * 6 - 90) * Math.PI / 180;
      var big = i % 5 === 0;
      x1 = cx + Math.cos(a) * (R - (big ? 12 : 6));
      y1 = cy + Math.sin(a) * (R - (big ? 12 : 6));
      x2 = cx + Math.cos(a) * R;
      y2 = cy + Math.sin(a) * R;
      s += '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) +
        '" stroke="' + (big ? '#8a7a5e' : '#cbbfa8') + '" stroke-width="' + (big ? 3 : 1.6) + '" stroke-linecap="round"/>';
    }
    // 1〜12の数字
    for (i = 1; i <= 12; i++) {
      a = (i * 30 - 90) * Math.PI / 180;
      s += '<text x="' + f(cx + Math.cos(a) * (R - 27)) + '" y="' + f(cy + Math.sin(a) * (R - 27) + 8) +
        '" text-anchor="middle" class="tk-num">' + i + '</text>';
    }
    // 外がわの「ぷん」の数字（はじめのうちの手がかり）
    if (showMinutes) {
      for (i = 0; i < 12; i++) {
        a = (i * 30 - 90) * Math.PI / 180;
        s += '<text x="' + f(cx + Math.cos(a) * (R + 6)) + '" y="' + f(cy + Math.sin(a) * (R + 6) + 4.5) +
          '" text-anchor="middle" class="tk-num-min">' + (i * 5) + '</text>';
      }
    }
    // 短針（時）は分ぶんも進む
    if (hands !== 'minute') {
      var ha = ((h % 12) * 30 + m * 0.5 - 90) * Math.PI / 180;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(ha) * (R * 0.5)) +
        '" y2="' + f(cy + Math.sin(ha) * (R * 0.5)) + '" stroke="#c0503b" stroke-width="11" stroke-linecap="round"/>';
    }
    // 長針（分）
    if (hands !== 'hour') {
      var ma = (m * 6 - 90) * Math.PI / 180;
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f(cx + Math.cos(ma) * (R * 0.78)) +
        '" y2="' + f(cy + Math.sin(ma) * (R * 0.78)) + '" stroke="#2f5d8a" stroke-width="7" stroke-linecap="round"/>';
    }
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="#3a3630"/>';
    s += '</svg>';
    return s;
  }

  function f(n) { return Math.round(n * 10) / 10; }

  /* ---------- 出題 ---------- */

  var randInt = function (a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; };
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  var key = function (t) { return t.h + ':' + t.m; };

  // 正解＋まちがえ方の候補から、重複なしで4つに詰める
  function pick4(answer, wrongs, filler) {
    var seen = {};
    seen[key(answer)] = true;
    var opts = [answer];
    shuffle(wrongs).forEach(function (w) {
      if (opts.length >= 4) return;
      if (w.h < 1 || w.h > 12 || w.m < 0 || w.m > 59) return;
      if (seen[key(w)]) return;
      seen[key(w)] = true;
      opts.push(w);
    });
    var guard = 0;
    while (opts.length < 4 && guard++ < 200) {
      var c = filler();
      if (seen[key(c)]) continue;
      seen[key(c)] = true;
      opts.push(c);
    }
    return { answer: answer, options: shuffle(opts) };
  }

  function makeQuestion(step, hands) {
    if (hands === 'hour') return makeHourHandQuestion();
    if (hands === 'minute') return makeMinuteHandQuestion();
    return makeBothHandsQuestion(step);
  }

  /* みじかい はりだけ。
     分はわざとランダムにして、短針を数字と数字の「あいだ」に立たせる。
     ちょうどの位置しか出さないと、本物の時計を読むときに役に立たない。 */
  function makeHourHandQuestion() {
    var h = randInt(1, 12);
    // 50分を すぎると 短針が 次の数字に ほぼ重なり、子どもには 読み分けが むずかしいので 45分までにする（2026-10-07。前は55分）
    var m = randInt(0, 45);
    var answer = { h: h, m: m };
    var next = h % 12 + 1;
    var prev = (h + 10) % 12 + 1;
    var wrongs = [
      { h: next, m: m, why: 'つぎの すう字を よんだ' },
      { h: prev, m: m, why: 'まえの すう字を よんだ' },
      { h: (h + 5) % 12 + 1, m: m },
      { h: (h + 6) % 12 + 1, m: m },
      { h: (h + 2) % 12 + 1, m: m }
    ];
    return pick4(answer, wrongs, function () { return { h: randInt(1, 12), m: m }; });
  }

  /* ながい はりだけ。5ふんきざみに固定する。
     1ぷんきざみは いちばん上の段（りょうほうの はり）にまかせて、
     ここは「12から 5とびで かぞえる」だけに集中させる。 */
  function makeMinuteHandQuestion() {
    var m = randInt(0, 11) * 5;
    var answer = { h: 12, m: m };
    var wrongs = [];
    // ① 長針がさす数字をそのまま分にする（50ぷん を 10ぷん と読む）
    if (m !== 0) wrongs.push({ h: 12, m: m / 5, why: 'すう字を そのまま ぷんに した' });
    // ② 逆まわりに数えた
    if (m !== 0) wrongs.push({ h: 12, m: (60 - m) % 60, why: 'ぎゃくむきに かぞえた' });
    // ③ 数字1つぶん ずれた
    wrongs.push({ h: 12, m: (m + 5) % 60, why: 'すう字 1つぶん ずれた' });
    wrongs.push({ h: 12, m: (m + 55) % 60, why: 'すう字 1つぶん ずれた' });
    return pick4(answer, wrongs, function () { return { h: 12, m: randInt(0, 11) * 5 }; });
  }

  function makeBothHandsQuestion(step) {
    var h = randInt(1, 12);
    var m;
    if (step === 60) m = 0;
    else if (step === 30) m = randInt(0, 1) * 30;
    else m = randInt(0, 59 / step | 0) * step;
    var answer = { h: h, m: m };

    // まちがえやすい読み方を選択肢に混ぜる
    var wrongs = [];
    // ① 長針と短針の取りちがえ（3:50 を 10:15 と読む）
    var swapH = (m === 0 ? 12 : Math.floor(m / 5)) || 12;
    var swapM = (h % 12) * 5;
    wrongs.push({ h: swapH, m: swapM, why: 'はりの とりちがえ' });
    // ② 長針がさす数字をそのまま分にする（50ぷん を 10ぷん と読む）
    if (m % 5 === 0 && m !== 0) wrongs.push({ h: h, m: m / 5, why: 'すう字を そのまま ぷんに した' });
    // ③ 時が1つずれる（短針が次の数字に近いとき）
    wrongs.push({ h: h % 12 + 1, m: m, why: 'みじかい はりの よみまちがい' });
    wrongs.push({ h: (h + 10) % 12 + 1, m: m, why: 'みじかい はりの よみまちがい' });
    // ④ 分だけずれる
    if (step < 60) {
      wrongs.push({ h: h, m: (m + step * 1) % 60, why: 'ぷんの よみまちがい' });
      wrongs.push({ h: h, m: (m + 60 - step) % 60, why: 'ぷんの よみまちがい' });
      wrongs.push({ h: h, m: (60 - m) % 60, why: 'ぷんの よみまちがい' });
    }

    return pick4(answer, wrongs, function () {
      return { h: randInt(1, 12), m: step === 60 ? 0 : (randInt(0, 59 / step | 0) * step) };
    });
  }

  /* ---------- 時間の けいさん（2026-10-08） ----------
     時刻は 0〜719（12じかん を 分で）で計算し、出すときに 1〜12じ に もどす */

  function toMin(h, m) { return (h % 12) * 60 + m; }
  function fromMin(t) {
    t = ((t % 720) + 720) % 720;
    var h = Math.floor(t / 60);
    return { h: h === 0 ? 12 : h, m: t % 60 };
  }
  // かかった時間の ことば（35ふん／1じかん／1じかん20ぷん）
  function durText(d) {
    var hh = Math.floor(d / 60), mm = d % 60;
    if (!hh) return mm + punOf(mm);
    return hh + 'じかん' + (mm ? mm + punOf(mm) : '');
  }
  function pick5(a, b) { return randInt(a / 5, b / 5) * 5; }

  // kind: 'after'（○ぷん あと）／'before'（○ぷん まえ）／'elapsed'（なんぷん たった）
  function makeCalcQuestion(stepId, kind) {
    var h = randInt(1, 12), m, d;
    if (stepId === 'c-in') {
      if (kind === 'before') { m = pick5(10, 55); d = pick5(5, m); }
      else { m = pick5(0, 45); d = pick5(5, 55 - m); }
    } else if (stepId === 'c-over') {
      if (kind === 'before') { m = pick5(0, 25); d = pick5(m + 5, 55); }
      else { m = pick5(30, 55); d = pick5(65 - m, 55); }
    } else {
      m = randInt(0, 59); d = randInt(61, 150);
    }
    var t0 = toMin(h, m);
    var start = { h: h, m: m };
    if (kind === 'elapsed') {
      var end = fromMin(t0 + d);
      return { kind: kind, start: start, end: end, d: d, answer: { d: d }, options: durOptions(d, start, end, stepId) };
    }
    var sign = kind === 'after' ? 1 : -1;
    var ans = fromMin(t0 + sign * d);
    var wrongs = [];
    // ちょうどの じこく を またいだのに「じ」を すすめない／もどさない（3:50 の 20ぷん あと → 3:10）
    if (ans.h !== h) wrongs.push({ h: h, m: ans.m, why: '「じ」を ' + (kind === 'after' ? 'すすめ' : 'もどし') + 'わすれた' });
    var flip = fromMin(t0 - sign * d);
    flip.why = (kind === 'after' ? 'まえ' : 'あと') + 'に かぞえた';
    wrongs.push(flip);
    var unit = stepId === 'c-long' ? 1 : 5;
    wrongs.push(fromMin(t0 + sign * (d + unit)), fromMin(t0 + sign * (d - unit)), fromMin(t0 + sign * (d + 10)), fromMin(t0 + sign * (d + 60)));
    var q = pick4(ans, wrongs, function () { return fromMin(t0 + sign * (d + (randInt(-3, 3) || 1) * unit)); });
    q.kind = kind; q.start = start; q.d = d;
    return q;
  }

  // なんぷん たった の えらぶ もの：ちょうどを またぐとき ぷんを そのまま ひいた（50ぷん→10ぷん で 40ぷん）などを まぜる
  function durOptions(d, start, end, stepId) {
    var unit = stepId === 'c-long' ? 1 : 5;
    var cand = [];
    if (end.m < start.m) cand.push({ d: start.m - end.m, why: 'ぷんを そのまま ひいた' });
    cand.push({ d: d + unit * 2 }, { d: d - unit * 2 }, { d: d + 10 }, { d: d - 10 }, { d: d + 60 }, { d: d - 60 });
    var seen = {}; seen[d] = true;
    var opts = [{ d: d }];
    shuffle(cand).forEach(function (c) {
      if (opts.length >= 4 || c.d <= 0 || seen[c.d]) return;
      seen[c.d] = true; opts.push(c);
    });
    var guard = 0;
    while (opts.length < 4 && guard++ < 100) {
      var x = d + (randInt(-4, 4) || 1) * unit;
      if (x > 0 && !seen[x]) { seen[x] = true; opts.push({ d: x }); }
    }
    return shuffle(opts);
  }

  function calcAsk(q) {
    if (q.kind === 'elapsed') return q.d >= 60 ? 'どれだけ たった?' : 'なんぷん たった?';
    return durText(q.d) + (q.kind === 'after' ? ' あとは' : ' まえは') + ' なんじ なんぷん?';
  }
  function calcLabel(q, o) { return q.kind === 'elapsed' ? durText(o.d) : timeText(o.h, o.m); }
  function calcSame(q, o) { return q.kind === 'elapsed' ? o.d === q.answer.d : o.h === q.answer.h && o.m === q.answer.m; }

  /* こたえあわせで 毎回 見せる かぞえかた。ちょうどの じこく で 区切って かぞえる（教科書の 数直線と 同じ考え） */
  function calcExplain(q) {
    var s = q.start, d = q.d;
    if (q.kind === 'elapsed') {
      var e = q.end;
      if (s.m + d < 60) return timeText(s.h, s.m) + ' から ' + timeText(e.h, e.m) + ' まで ' + durText(d);
      var toNext = 60 - s.m, nh = s.h % 12 + 1;
      var hours = Math.round((d - toNext - e.m) / 60);
      var parts = [];
      if (s.m) parts.push(timeText(s.h, s.m) + ' → ' + nh + 'じ で ' + durText(toNext));
      else hours += 1;
      if (hours > 0) parts.push((s.m ? nh : s.h) + 'じ → ' + e.h + 'じ で ' + hours + 'じかん');
      if (e.m) parts.push(e.h + 'じ → ' + timeText(e.h, e.m) + ' で ' + durText(e.m));
      return parts.join('、') + '。あわせて ' + durText(d);
    }
    var after = q.kind === 'after';
    var ans = q.answer;
    var hh = Math.floor(d / 60), mm = d % 60;
    var verb = after ? 'すすめて' : 'もどして';
    var lines = [];
    var cur = { h: s.h, m: s.m };
    if (hh) {
      cur = fromMin(toMin(s.h, s.m) + (after ? 60 : -60) * hh);
      lines.push('まず ' + hh + 'じかん ' + verb + ' ' + timeText(cur.h, cur.m));
    }
    if (mm) {
      var cross = after ? cur.m + mm > 60 : cur.m - mm < 0;
      if (cross && cur.m !== 0) {
        var first = after ? 60 - cur.m : cur.m;
        var edgeH = after ? cur.h % 12 + 1 : cur.h;
        lines.push(timeText(cur.h, cur.m) + ' → ' + edgeH + 'じ で ' + durText(first) + '、のこり ' + durText(mm - first) + ' ' + verb + ' ' + timeText(ans.h, ans.m));
      } else {
        lines.push(timeText(cur.h, cur.m) + ' から ' + durText(mm) + ' ' + verb + ' ' + timeText(ans.h, ans.m));
      }
    }
    return lines.join('。');
  }

  function calcHint(q) {
    if (q.kind === 'elapsed') return ['はじめの とけいから、ちょうどの じこく（「○じ」）まで なんぷん あるか かぞえよう。', 'そこから おわりの とけいまでを たすと、ぜんぶの じかんに なるよ。'];
    if (q.kind === 'after') return ['ながい はり（あおいはり）を ' + durText(q.d) + ' ぶん すすめるよ。', '「12」を こえたら、「じ」が 1つ ふえるよ。ちょうどの じこくで 区切って かぞえよう。'];
    return ['ながい はり（あおいはり）を ' + durText(q.d) + ' ぶん もどすよ。', '「12」を こえて もどったら、「じ」が 1つ へるよ。ちょうどの じこくで 区切って かぞえよう。'];
  }

  /* ---------- ヒント ----------
     こたえそのものは言わず、「どっちの はりを 見て、どう かぞえるか」だけを出す。
     とけいを よむ／さがす で見るべきものが逆になるので、文面も分ける。 */

  function hintLines(mode, t, hands) {
    var h = t.h, m = t.m;
    var next = h % 12 + 1;
    var lines = [];

    if (hands === 'hour') {
      if (mode === 'read') {
        lines.push(m === 0
          ? 'みじかい はり（あかいはり）は 「' + h + '」を ぴったり さして いるね。'
          : 'みじかい はり（あかいはり）は 「' + h + '」と 「' + next + '」の あいだに あるね。');
        lines.push('あいだに ある ときは、まだ こえて いない ほう（まえの すう字）を よむよ。');
      } else {
        lines.push('みじかい はり（あかいはり）だけの とけいだよ。');
        lines.push('「' + h + '」を すぎて いて、まだ 「' + next + '」に とどいて いない とけいを さがそう。');
      }
      return lines;
    }

    if (hands === 'minute') {
      if (mode === 'read') {
        lines.push('ながい はり（あおいはり）だけの とけいだよ。さして いる すう字を 見よう。');
        lines.push(m === 0
          ? '「12」を さして いる ときは 0ぷん（ちょうど）だよ。'
          : '「12」から 右まわりに 5・10・15… と 5とびで かぞえて いくよ。いまは 「' + (m / 5) + '」の ところまで きて いるね。');
      } else {
        lines.push(m === 0
          ? '0ぷん の ながい はり（あおいはり）は 「12」を さすよ。'
          : '「12」から 5・10・15… と 5とびで かぞえて 「' + m + punOf(m) + '」に なるのは 「' + (m / 5) + '」の ところ。ながい はりが その すう字を さす とけいを さがそう。');
        lines.push('ぎゃくまわりに かぞえないように、「12」から 右まわりで たしかめよう。');
      }
      return lines;
    }

    if (mode === 'read') {
      lines.push(m === 0
        ? 'みじかい はり（あかいはり）は 「' + h + '」を ぴったり さして いるね。それが 「じ」だよ。'
        : 'みじかい はり（あかいはり）は 「' + h + '」と 「' + next + '」の あいだ。まえの すう字の 「' + h + 'じ」だよ。');
      if (m === 0) {
        lines.push('ながい はり（あおいはり）は 「12」。ちょうど の とけいだね。');
      } else if (m % 5 === 0) {
        lines.push('ながい はり（あおいはり）は 「12」から 右まわりに 5・10・15… と 5とびで かぞえるよ。いまは 「' + (m / 5) + '」の ところ。');
      } else {
        lines.push('ながい はり（あおいはり）は 「' + Math.floor(m / 5) + '」を すぎた ところ。'
          + '「' + (Math.floor(m / 5) * 5) + punOf(Math.floor(m / 5) * 5) + '」から めもりを 1つずつ かぞえて みよう。');
      }
    } else {
      lines.push(m === 0
        ? 'みじかい はり（あかいはり）が 「' + h + '」を ぴったり さして いる とけいを さがそう。'
        : 'みじかい はり（あかいはり）が 「' + h + '」と 「' + next + '」の あいだに ある とけいを さがそう。「' + next + '」を こえて いたら ちがうよ。');
      lines.push(m === 0
        ? 'ながい はり（あおいはり）は 「12」を さして いるよ。'
        : m % 5 === 0
          ? '「12」から 5とびで かぞえて 「' + m + punOf(m) + '」に なるのは 「' + (m / 5) + '」の ところ。ながい はり（あおいはり）は その すう字を さすよ。'
          : '「' + m + punOf(m) + '」は 「' + (Math.floor(m / 5) * 5) + punOf(Math.floor(m / 5) * 5) + '」から めもり ' + (m % 5) + 'つぶん さき。ながい はりの さきを よく 見よう。');
    }
    return lines;
  }

  /* ---------- 画面 ---------- */

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // メニューは2段階（2026-09-22。かんじ修行と同じ型）。1枚目は といかた を押したら そのまま次へ、
  // 2枚目で なんいど を選んで「スタート」。スタートの位置は2枚で そろえる。
  // ブラウザの「戻る」と画面の「← もどる」で1つ前のメニュー画面へ戻れるようにする（2026-09-23）。
  // メニューの画面ごとに履歴を1つ積み、戻る操作は history.back() にそろえる
  function goStep(step) {
    history.pushState({ nkStep: step }, '');
    renderMenuStep(step);
  }
  function currentStep() {
    var st = history.state && history.state.nkStep;
    return typeof st === 'number' ? st : 1;
  }
  window.addEventListener('popstate', function () {
    // ページ内リンク（#faq など）の履歴は state を持たないので、メニューはそのままにする
    if (!history.state || typeof history.state.nkStep !== 'number') return;
    renderMenuStep(history.state.nkStep);
  });
  // プレイも履歴に1つ積む。プレイ・けっか から メニューへ戻るときは、直前のメニュー画面へ
  function pushPlay() {
    if (!(history.state && history.state.nkStep === 'play')) history.pushState({ nkStep: 'play' }, '');
    // 問題と けっか は窓（ポップアップ）の中に出す。「とじる」はメニューへもどると同じ（2026-09-27）
    NkModal.open(app, { onClose: renderMenu });
  }
  function renderMenu() {
    if (history.state && history.state.nkStep === 'play') history.back();
    else renderMenuStep(currentStep());
  }

  // その画面で押したカード。画面に来たときは何も選んでいない状態から始め、
  // なんいど を押すまでスタートは押せない（2026-09-23。かんじ修行と同じ）
  var picked = null;

  function renderMenuStep(step, keep) {
    NkModal.close();
    if (!keep) picked = null;
    state.session = null;
    app.innerHTML = '';
    var wrap = el('div', 'tk-menu is-step');
    var btn;
    if (step === 1) {
      wrap.appendChild(modeGroup('やりたい しゅぎょうを えらんでね！'));
      // スタートの場所だけ見えない形で取っておく
      btn = el('button', 'tk-start is-placeholder', 'スタート');
      btn.tabIndex = -1;
      btn.setAttribute('aria-hidden', 'true');
    } else {
      var mode = MODES.filter(function (m) { return m.id === state.modeId; })[0];
      wrap.appendChild(el('p', 'tk-menu-picked', mode.name));
      var body = el('div', 'tk-step-body');
      body.appendChild(levelGroup(null));

      var side = el('div', 'tk-step-side');
      var opt = el('label', 'tk-toggle');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = state.showMinutes;
      cb.addEventListener('change', function () { state.showMinutes = cb.checked; });
      opt.appendChild(cb);
      opt.appendChild(el('span', null, 'とけいに ふんを ひょうじする'));
      side.appendChild(opt);

      // 見本の時計は、いま選んでいる なんいど と同じ本数のはりで描く
      var preview = el('div', 'tk-preview');
      var drawPreview = function () {
        var hands = stepOf(state.stepId).hands;
        preview.innerHTML = clockSvg(3, state.showMinutes ? 50 : 0, 150, state.showMinutes, hands);
      };
      drawPreview();
      cb.addEventListener('change', drawPreview);
      side.appendChild(preview);
      body.appendChild(side);
      wrap.appendChild(body);

      btn = el('button', 'tk-start', 'スタート');
      btn.addEventListener('click', startSession);
      if (!picked) btn.disabled = true;
    }
    btn.type = 'button';
    wrap.appendChild(btn);

    // 1枚目は アプリ一覧へ もどるリンク（2026-09-24。ヒーローの「アプリ一覧」ボタンから移した）
    var back;
    if (step === 1) {
      back = el('a', 'tk-back nk-applist', '← アプリいちらんに もどる');
      back.href = '/edu-tools.html#kids';
    } else {
      back = el('button', 'tk-back', '← しゅぎょうを えらびなおす');
      back.type = 'button';
      back.addEventListener('click', function () { history.back(); });
    }
    wrap.appendChild(back);

    app.appendChild(wrap);
    app.appendChild(NinjaLinks.el('tokei'));
  }

  function toolIcon(name) {
    var img = el('img', 'tk-tool-icon');
    img.src = '/assets/images/ninja/tokei-ui/' + name + '.webp';
    img.alt = '';
    img.width = 28;
    img.height = 28;
    return img;
  }
  // 手裏剣の絵（56pxのWebP。もとの絵は 1254px の透過PNG）。
  // 色を塗り分けるのではなく、光っている／いないで別の画像にしている。
  var SHURIKEN_SRC = {
    on: '/assets/images/ninja/shuriken-on.webp',
    off: '/assets/images/ninja/shuriken-off.webp'
  };

  // なんいどは手裏剣の数で見せる（全部で total 枚、うち level 枚が光る）。
  // 数字も文字も読まずに「どれが やさしいか」が分かるようにするため。
  function levelBadge(level, total) {
    var box = el('span', 'tk-level');
    box.setAttribute('aria-hidden', 'true');
    for (var i = 1; i <= total; i++) {
      var on = i <= level;
      var img = document.createElement('img');
      img.className = on ? 'tk-shuriken is-on' : 'tk-shuriken';
      img.src = on ? SHURIKEN_SRC.on : SHURIKEN_SRC.off;
      img.width = 19;
      img.height = 19;
      img.alt = '';
      img.decoding = 'async';
      box.appendChild(img);
    }
    return box;
  }

  function choiceBtn(item, stateKey, level) {
    var btn = el('button', 'tk-choice');
    btn.type = 'button';
    // 手裏剣の なんいど表示はやめた（2026-09-24）。段の名前と並び順で むずかしさの順が分かり、
    // カードも詰まっていたため。level は並び（同じ段を1行にまとめる）にだけ使う
    if (level && SHOW_LEVEL_BADGE) {
      btn.appendChild(levelBadge(level, LEVEL_MAX));
      btn.setAttribute('aria-label', item.name + '（なんいど ' + level + ' / ' + LEVEL_MAX + '）');
    }
    if (item.img) {
      var img = el('img', 'tk-choice-img');
      img.src = item.img;
      img.alt = '';
      img.width = 160;
      img.height = 160;
      btn.appendChild(img);
    } else if (stateKey === 'modeId') {
      // 絵が できるまでの 仮：とけいを SVG で描く
      var ph = el('span', 'tk-choice-img is-svg');
      ph.setAttribute('aria-hidden', 'true');
      ph.innerHTML = clockSvg(3, 50, 120, false, 'both');
      btn.appendChild(ph);
    }
    if (item.grade) btn.appendChild(el('span', 'tk-ribbon', item.grade));
    btn.appendChild(el('span', 'tk-choice-label', item.name));
    btn.appendChild(el('span', 'tk-choice-note', item.note));
    if (picked && picked.key === stateKey && picked.id === item.id) btn.classList.add('is-on');
    // といかた を押したら そのまま なんいど の画面へ。なんいど は選ぶだけ
    btn.addEventListener('click', function () {
      state[stateKey] = item.id;
      if (stateKey === 'modeId') return goStep(2);
      picked = { key: stateKey, id: item.id };
      renderMenuStep(2, true);
    });
    return btn;
  }

  function modeGroup(title) {
    var sec = el('section', 'tk-group');
    sec.appendChild(el('h2', 'tk-group-title', title));
    var grid = el('div', 'tk-choices tk-choices-mode');
    MODES.forEach(function (item) { grid.appendChild(choiceBtn(item, 'modeId', 0)); });
    sec.appendChild(grid);
    return sec;
  }

  /* なんいどは段（level）ごとに1行へ積む。pair が同じものだけ1行に横並びで入れる。
     手裏剣は行ではなくボタンごとに持たせる。そうすると、狭い画面で
     .tk-pair を display:contents にして全体を2列に折り返しても段が読める。 */
  function levelGroup(title) {
    var sec = el('section', 'tk-group');
    if (title) sec.appendChild(el('h2', 'tk-group-title', title));
    var grid = el('div', 'tk-choices tk-choices-level');
    var pairs = {};
    (state.modeId === 'calc' ? CALC_STEPS : STEPS).forEach(function (item) {
      var btn = choiceBtn(item, 'stepId', item.level);
      if (item.pair) {
        var row = pairs[item.pair];
        if (!row) {
          row = pairs[item.pair] = el('div', 'tk-pair');
          grid.appendChild(row);
        }
        row.appendChild(btn);
      } else {
        grid.appendChild(btn);
      }
    });
    sec.appendChild(grid);
    return sec;
  }

  function startSession() {
    pushPlay();
    var step = stepOf(state.stepId);
    state.session = {
      step: step.step,
      hands: step.hands || 'both',
      index: 0, correct: 0, locked: false, q: null
    };
    if (state.modeId === 'calc') {
      // 3つの といかた を まぜる（あと4・まえ3・たった3）
      state.session.calc = true;
      state.session.kinds = shuffle(['after', 'after', 'after', 'after', 'before', 'before', 'before', 'elapsed', 'elapsed', 'elapsed']);
    }
    if (window.NkTrack) NkTrack('mode_select', { app: 'tokei', mode: state.modeId, level: state.stepId });
    nextQuestion();
  }

  function nextQuestion() {
    var s = state.session;
    if (s.index >= SET_LENGTH) return renderResult();
    s.q = s.calc ? makeCalcQuestion(state.stepId, s.kinds[s.index]) : makeQuestion(s.step, s.hands);
    s.locked = false;
    renderPlay();
  }

  function renderPlay() {
    var s = state.session;
    var q = s.q;
    var hands = s.hands;
    app.innerHTML = '';
    var wrap = el('div', 'tk-play');

    var head = el('div', 'tk-play-head nk-head');
    // いちばん上に えらんだ しゅぎょう の帯、その下に 第○問・できた！ の箱（ほかの修行アプリと同じ。2026-09-23）
    var picked = MODES.filter(function (m) { return m.id === state.modeId; })[0];
    head.appendChild(el('span', 'nk-head-picked', picked.name + '・' + stepOf(state.stepId).name));
    var headBar = el('span', 'nk-head-bar');
    head.appendChild(headBar);
    var count = el('span', 'tk-play-count');
    count.appendChild(toolIcon('scroll'));
    count.appendChild(el('span', null, '第' + (s.index + 1) + '問 / 全' + SET_LENGTH + '問'));
    headBar.appendChild(count);
    var score = el('span', 'tk-play-score');
    score.appendChild(toolIcon('shuriken'));
    score.appendChild(el('span', 'tk-score-text', 'できた！ ' + s.correct + '問'));
    headBar.appendChild(score);
    var trail = el('span', 'tk-progress-marks');
    trail.setAttribute('aria-hidden', 'true');
    for (var mark = 0; mark < SET_LENGTH; mark++) {
      trail.appendChild(el('i', mark < s.index ? 'is-done' : mark === s.index ? 'is-current' : ''));
    }
    headBar.appendChild(trail);
    wrap.appendChild(head);

    var bar = el('div', 'tk-bar');
    var fill = el('div', 'tk-bar-fill');
    fill.style.width = (s.index / SET_LENGTH * 100) + '%';
    bar.appendChild(fill);
    wrap.appendChild(bar);

    var options = el('div', 'tk-options');

    if (s.calc) {
      wrap.appendChild(el('p', 'tk-ask', calcAsk(q)));
      var cstage = el('div', 'tk-stage' + (q.kind === 'elapsed' ? ' is-two' : ''));
      if (q.kind === 'elapsed') {
        cstage.innerHTML = '<div class="tk-pair-clock"><span class="tk-clock-cap">はじめ</span>' + clockSvg(q.start.h, q.start.m, 170, state.showMinutes, 'both') + '</div>' +
          '<span class="tk-arrow" aria-hidden="true">→</span>' +
          '<div class="tk-pair-clock"><span class="tk-clock-cap">おわり</span>' + clockSvg(q.end.h, q.end.m, 170, state.showMinutes, 'both') + '</div>';
      } else {
        cstage.innerHTML = clockSvg(q.start.h, q.start.m, 240, state.showMinutes, 'both');
      }
      wrap.appendChild(cstage);
      options.classList.add('is-text');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt');
        b.appendChild(el('span', 'tk-answer-label', calcLabel(q, o)));
        b.type = 'button';
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
    } else if (state.modeId === 'read') {
      wrap.appendChild(el('p', 'tk-ask', askText(hands)));
      var stage = el('div', 'tk-stage');
      stage.innerHTML = clockSvg(q.answer.h, q.answer.m, 240, state.showMinutes, hands);
      wrap.appendChild(stage);
      options.classList.add('is-text');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt');
        b.appendChild(el('span', 'tk-answer-label', answerText(o, hands)));
        b.type = 'button';
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
    } else {
      wrap.appendChild(el('p', 'tk-ask', answerText(q.answer, hands) + ' の とけいは どれ?'));
      options.classList.add('is-clock');
      q.options.forEach(function (o) {
        var b = el('button', 'tk-opt tk-opt-clock');
        b.type = 'button';
        b.innerHTML = clockSvg(o.h, o.m, 132, state.showMinutes, hands);
        b.addEventListener('click', function () { choose(o, b, options); });
        options.appendChild(b);
      });
    }

    // ヒント（こたえは言わない。押すまでは出さない）
    var hintBtn = el('button', 'tk-hint-btn', 'ヒントを 見る');
    hintBtn.type = 'button';
    hintBtn.setAttribute('aria-expanded', 'false');
    var hint = el('div', 'tk-hint');
    hint.hidden = true;
    (s.calc ? calcHint(q) : hintLines(state.modeId, q.answer, hands)).forEach(function (line) {
      hint.appendChild(el('p', null, line));
    });
    hintBtn.addEventListener('click', function () {
      hint.hidden = !hint.hidden;
      hintBtn.setAttribute('aria-expanded', String(!hint.hidden));
      hintBtn.textContent = hint.hidden ? 'ヒントを 見る' : 'ヒントを とじる';
    });
    wrap.appendChild(hintBtn);
    wrap.appendChild(hint);

    wrap.appendChild(options);
    var fb = el('div', 'tk-feedback');
    wrap.appendChild(fb);

    var back = el('button', 'tk-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  function choose(chosen, btn, options) {
    var s = state.session;
    if (s.locked) return;
    s.locked = true;
    var q = s.q;
    var hands = s.hands;
    var same = function (o) { return s.calc ? calcSame(q, o) : o.h === q.answer.h && o.m === q.answer.m; };
    var label = function (o) { return s.calc ? calcLabel(q, o) : answerText(o, hands); };
    var ok = same(chosen);
    if (ok) {
      s.correct++;
      app.querySelector('.tk-score-text').textContent = 'できた！ ' + s.correct + '問';
      app.querySelector('.tk-play-score').classList.add('is-celebrating');
    }

    Array.prototype.forEach.call(options.querySelectorAll('.tk-opt'), function (b, i) {
      b.disabled = true;
      var o = q.options[i];
      if (same(o)) b.classList.add('is-correct');
    });
    if (!ok) btn.classList.add('is-wrong');

    var fb = app.querySelector('.tk-feedback');
    fb.className = 'tk-feedback ' + (ok ? 'is-ok' : 'is-ng');
    fb.textContent = ok
      ? 'せいかい! ' + label(q.answer)
      : 'こたえは ' + label(q.answer) + (chosen.why ? '\n（' + chosen.why + '）' : '');

    var go = function () {
      if (state.session !== s) return;
      s.index++;
      nextQuestion();
    };
    // 時間の けいさん は かぞえかた を 毎回 見せる。まちがえたときは 読みきれるよう「つぎへ」を おすまで 待つ
    if (s.calc) {
      var ex = el('span', 'tk-explain-wrap');
      ex.appendChild(el('span', 'tk-explain', calcExplain(q)));
      fb.appendChild(ex);
      if (!ok) {
        var nx = el('button', 'tk-next-btn', 'つぎへ →');
        nx.type = 'button';
        nx.addEventListener('click', go);
        ex.appendChild(nx);
        nx.focus({ preventScroll: true });
        return;
      }
      setTimeout(go, 2400);
      return;
    }
    setTimeout(go, ok ? 1100 : 2000);
  }

  function renderResult() {
    var s = state.session;
    app.innerHTML = '';
    if (window.NkTrack) NkTrack('set_complete', { app: 'tokei', mode: state.modeId, level: state.stepId, score: s.correct, total: SET_LENGTH });
    var wrap = el('div', 'tk-result');
    // 全問正解のときだけ、お祝いの絵に差し替える（2026-09-03）
    if (s.correct === SET_LENGTH) wrap.classList.add('is-perfect');
    var stars = s.correct >= 10 ? 3 : s.correct >= 8 ? 2 : s.correct >= 5 ? 1 : 0;
    wrap.appendChild(el('p', 'tk-result-stars', '★★★☆☆☆'.slice(3 - stars, 6 - stars)));
    wrap.appendChild(el('p', 'tk-result-score', SET_LENGTH + 'もんちゅう ' + s.correct + 'もん せいかい!'));
    wrap.appendChild(el('p', 'tk-result-msg',
      stars === 3 ? 'ぜんもん せいかい! とけいマスター!'
        : stars === 2 ? 'あと すこし! もういちど やってみよう。'
          : stars === 1 ? 'いいちょうし。つづけて れんしゅう しよう。'
            : 'だいじょうぶ。ゆっくり よんで みよう。'));

    var again = el('button', 'tk-start', 'もういちど');
    again.type = 'button';
    again.addEventListener('click', startSession);
    wrap.appendChild(again);

    var back = el('button', 'tk-back', '← もんだいせんたくに もどる');
    back.type = 'button';
    back.addEventListener('click', renderMenu);
    wrap.appendChild(back);

    app.appendChild(wrap);
  }

  history.replaceState({ nkStep: 1 }, '');
  renderMenuStep(1);
})();
