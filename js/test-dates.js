/* ============================================================
   test-dates.js — 意地悪な日付ジェネレーター
   基準日から「テストで踏むべき境界の日付」を組み立てる。
   計算はすべてブラウザ内。サーバー送信は一切しない。
   日付は常にローカルの 0 時で持つ（日本にはサマータイムがないため単純化できる）。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('dt-base')) return;

  var WD = ['日', '月', '火', '水', '木', '金', '土'];

  /* ---------- 日付のちいさな道具（月は1始まりで扱う） ---------- */

  function mk(y, m, day) { return new Date(y, m - 1, day); }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function dim(y, m) { return new Date(y, m, 0).getDate(); }
  function addDays(dt, n) { var x = new Date(dt.getTime()); x.setDate(x.getDate() + n); return x; }
  function eom(y, m) { return mk(y, m, dim(y, m)); }
  // 月末に丸める加算（多くの日付ライブラリの挙動）
  function addMonthsClamped(dt, n) {
    var y = dt.getFullYear(), m = dt.getMonth() + 1 + n, day = dt.getDate();
    y += Math.floor((m - 1) / 12); m = ((m - 1) % 12 + 12) % 12 + 1;
    return mk(y, m, Math.min(day, dim(y, m)));
  }
  // 繰り上がる加算（JavaScript の setMonth の素の挙動）
  function addMonthsOverflow(dt, n) {
    var x = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    x.setMonth(x.getMonth() + n);
    return x;
  }
  function prevLeapYear(y) { while (!isLeap(y)) y--; return y; }
  function nextLeapYear(y) { y++; while (!isLeap(y)) y++; return y; }
  // その月の n 番目の曜日（wd: 0=日）。n が負なら最後から数える
  function nthWeekday(y, m, wd, n) {
    if (n > 0) {
      var first = mk(y, m, 1);
      var off = (wd - first.getDay() + 7) % 7;
      return mk(y, m, 1 + off + (n - 1) * 7);
    }
    var last = eom(y, m);
    var back = (last.getDay() - wd + 7) % 7;
    return addDays(last, -back);
  }

  /* ---------- 表示形式 ---------- */

  var warekiFmt = null;
  function wareki(dt) {
    if (!warekiFmt) {
      try {
        warekiFmt = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
          era: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
      } catch (e) { warekiFmt = false; }
    }
    return warekiFmt ? warekiFmt.format(dt) : iso(dt);
  }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function iso(dt) { return dt.getFullYear() + '-' + p2(dt.getMonth() + 1) + '-' + p2(dt.getDate()); }

  function fmt(item, kind) {
    if (item.literal) return item.literal;      // 実在しない日付・時刻そのものはそのまま出す
    if (item.fixedIso && (kind === 'datetime' || kind === 'unix')) {
      return kind === 'unix' ? String(Math.floor(item.d.getTime() / 1000)) : item.fixedIso;
    }
    var dt = item.d;
    switch (kind) {
      case 'slash': return dt.getFullYear() + '/' + p2(dt.getMonth() + 1) + '/' + p2(dt.getDate());
      case 'compact': return '' + dt.getFullYear() + p2(dt.getMonth() + 1) + p2(dt.getDate());
      case 'ja': return dt.getFullYear() + '年' + (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
      case 'wareki': return wareki(dt);
      case 'datetime': return dt.toISOString();
      case 'unix': return String(Math.floor(dt.getTime() / 1000));
      default: return iso(dt);
    }
  }

  /* ---------- 意地悪な日付を組み立てる ---------- */

  function build(base, fyStart) {
    var y = base.getFullYear(), m = base.getMonth() + 1;
    var groups = [];

    /* うるう年・2月 */
    var leapItems = [];
    if (isLeap(y)) {
      leapItems.push({ d: mk(y, 2, 29), name: '基準年のうるう日', note: '基準年（' + y + '年）はうるう年です。2月29日を受け付けるか、翌年に繰り越したときどうなるか。' });
    } else {
      leapItems.push({ d: mk(y, 2, 28), name: '基準年の2月末', note: y + '年はうるう年ではありません。29日を入れたときエラーになるか、勝手に丸められないか。' });
    }
    leapItems.push({ d: mk(prevLeapYear(y), 2, 29), name: '直近のうるう日', note: '過去日として入れられる2月29日。生年月日や契約開始日に使う。' });
    leapItems.push({ d: mk(nextLeapYear(y), 2, 29), name: '次のうるう日', note: '未来日として入れられる2月29日。有効期限や予約日に使う。' });
    leapItems.push({ d: addMonthsClamped(mk(prevLeapYear(y), 2, 29), 12), name: 'うるう日の1年後', note: '2月29日に1年足すと2月28日になる（丸める実装の場合）。3月1日を返す実装もある。', warn: true });
    leapItems.push({ d: mk(2100, 2, 28), name: '100年ルールの年の2月末', note: '2100年は4で割り切れるがうるう年ではない。「4の倍数なら29日」と書いた実装がここで落ちる。', warn: true });
    leapItems.push({ d: mk(2000, 2, 29), name: '400年ルールの年のうるう日', note: '2000年は100の倍数だがうるう年。100年ルールだけを実装するとこの日を弾いてしまう。' });
    leapItems.push({ literal: '1900-02-29', name: '実在しないうるう日', note: 'Excelが互換性のために実在扱いしている日。Excel由来の日付をそのまま計算すると1日ずれる。', warn: true });
    groups.push({ title: 'うるう年・2月', items: leapItems });

    /* 月末・月またぎ */
    var last = eom(y, m);
    var mItems = [
      { d: mk(y, m, 1), name: '当月の1日', note: '月初。締め処理や「今月分」の集計がここを含むか外すか。' },
      { d: last, name: '当月の月末', note: '締め日。月次バッチ・請求・ポイント失効が集中する。' },
      { d: addDays(last, -1), name: '月末の前日', note: '月末処理の直前。前日までを対象にする仕様の境界。' },
      { d: addDays(last, 1), name: '月末の翌日（翌月1日）', note: '月をまたいだ直後。前月分として扱われてしまわないか。' },
      { d: eom(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1), name: '前月の月末', note: '前月末。「先月」の範囲指定の端。' }
    ];
    var d31 = null, d30 = null;
    // 当月と同じ日付を2枚出しても意味がないので、翌月以降から探す
    for (var k = 1; k <= 12 && (!d31 || !d30); k++) {
      var yy = y + Math.floor((m - 1 + k) / 12), mm = (m - 1 + k) % 12 + 1;
      if (!d31 && dim(yy, mm) === 31) d31 = eom(yy, mm);
      if (!d30 && dim(yy, mm) === 30) d30 = eom(yy, mm);
    }
    mItems.push({ d: d31, name: '31日ある月の月末', note: '31日を持たない月へ足したときに落ちる。「1ヶ月後」の計算で最も事故る値。', warn: true });
    mItems.push({ d: d30, name: '30日で終わる月の月末', note: '31日を入力できてしまわないか（4・6・9・11月の31日）。' });
    groups.push({ title: '月末・月またぎ', items: mItems });

    /* 年度・年またぎ */
    var fyY = (m >= fyStart) ? y : y - 1;
    var fyBegin = mk(fyY, fyStart, 1);
    var fyEnd = addDays(addMonthsClamped(fyBegin, 12), -1);
    groups.push({
      title: '年度・年またぎ', items: [
        { d: fyBegin, name: '今年度の開始日', note: '年度の初日（' + fyStart + '月始まり）。年度単位の集計や採番の起点。' },
        { d: fyEnd, name: '今年度の最終日', note: '年度末。繰越・締め・有効期限がここに集まる。', warn: true },
        { d: addDays(fyEnd, 1), name: '翌年度の開始日', note: '年度をまたいだ直後。前年度分として扱われないか。' },
        { d: mk(y, 12, 31), name: '大晦日', note: '年またぎ。年で採番している番号がリセットされるか。' },
        { d: mk(y + 1, 1, 1), name: '元日', note: '年が変わった直後。休日判定・営業日計算の起点。' },
        { d: mk(y, 1, 1), name: '基準年の元日', note: '年初。「今年」の範囲指定の端。' }
      ]
    });

    /* 曜日・週 */
    groups.push({
      title: '曜日・週', items: [
        { d: base, name: '基準日（' + WD[base.getDay()] + '曜日）', note: 'そのまま入れる値。曜日の表示がずれていないかの確認用。' },
        { d: nthWeekday(y, m, 1, 1), name: '当月の第1月曜', note: '週の始まりを月曜とする実装で、第1週の扱いが分かれる。' },
        { d: nthWeekday(y, m, 0, 1), name: '当月の第1日曜', note: '週の始まりを日曜とする実装での第1週。カレンダーUIの並びを確認。' },
        { d: nthWeekday(y, m, 6, -1), name: '当月の最終土曜', note: '月末に近い土日。営業日計算で翌営業日がどこへ飛ぶか。' },
        { d: nthWeekday(y, m, 5, -1), name: '当月の最終金曜', note: '締め日が土日のとき前倒しになる仕様の確認。' }
      ]
    });

    /* システムの境界 */
    groups.push({
      title: 'システムの境界', items: [
        { d: new Date(Date.UTC(1970, 0, 1, 0, 0, 0)), fixedIso: '1970-01-01T00:00:00.000Z', name: 'Unixエポック', note: '経過秒数の起点。0や空文字を日付に変換すると、たいていこの日になる。', warn: true },
        { d: new Date(Date.UTC(2038, 0, 19, 3, 14, 7)), fixedIso: '2038-01-19T03:14:07.000Z', name: '32ビットの上限（2038年問題）', note: '秒数を32ビット整数で持つ環境はここを超えるとあふれる。長期の有効期限で踏む。', warn: true },
        { d: mk(1999, 12, 31), name: '1999年の大晦日', note: '2000年問題の境界。西暦を下2桁で持っている箇所が残っていないか。' },
        { d: mk(2000, 1, 1), name: '2000年の元日', note: '00年を1900年と誤認しないか。ソート順が壊れないか。' },
        { d: mk(9999, 12, 31), name: '西暦9999年の大晦日', note: '多くのDB・言語での日付の上限付近。「無期限」を最大値で表す実装の確認。' },
        { d: mk(1899, 12, 30), name: 'Excelのシリアル値の起点', note: 'Excelの日付は1899年12月30日からの日数。CSV取り込みでの1〜2日のずれの正体。', warn: true }
      ]
    });

    /* 和暦・元号 */
    groups.push({
      title: '和暦・元号', items: [
        { d: mk(2019, 5, 1), name: '令和のはじまり', note: '改元日。和暦変換が令和元年5月1日になるか（令和1年表記との揺れも確認）。', warn: true },
        { d: mk(2019, 4, 30), name: '平成の最終日', note: '平成31年4月30日。改元をまたいだ期間の計算がずれないか。' },
        { d: mk(1989, 1, 8), name: '平成のはじまり', note: '平成元年1月8日。年の途中の改元。' },
        { d: mk(1989, 1, 7), name: '昭和の最終日', note: '昭和64年1月7日。1週間しかない昭和64年を正しく扱えるか。', warn: true },
        { d: mk(1926, 12, 25), name: '昭和のはじまり', note: '大正15年と昭和元年が同じ年に同居する。年だけで元号を決める実装が落ちる。', warn: true }
      ]
    });

    return groups;
  }

  /* ---------- 実装差分が出る計算 ---------- */

  function buildDiffs(base) {
    var y = base.getFullYear();
    var jan31 = mk(y, 1, 31);
    var leapDay = mk(prevLeapYear(y), 2, 29);
    var rows = [];

    rows.push({
      q: iso(jan31) + ' の1ヶ月後',
      a: [
        { l: '月末に丸める', v: iso(addMonthsClamped(jan31, 1)), note: '多くの日付ライブラリ' },
        { l: '繰り上げる', v: iso(addMonthsOverflow(jan31, 1)), note: 'JavaScript の setMonth' }
      ],
      note: '2月31日は存在しないため、丸めるか繰り上げるかで答えが変わります。'
    });

    rows.push({
      q: iso(leapDay) + ' の1年後',
      a: [
        { l: '月末に丸める', v: iso(addMonthsClamped(leapDay, 12)), note: '2月28日' },
        { l: '繰り上げる', v: iso(addMonthsOverflow(leapDay, 12)), note: '3月1日' }
      ],
      note: 'うるう日生まれの誕生日をいつ祝うか、という問題がそのままバグになります。'
    });

    rows.push({
      q: iso(jan31) + ' に1ヶ月ずつ2回足す vs 2ヶ月まとめて足す',
      a: [
        { l: '1ヶ月ずつ2回', v: iso(addMonthsClamped(addMonthsClamped(jan31, 1), 1)), note: '2月末に丸められた日から進む' },
        { l: '2ヶ月まとめて', v: iso(addMonthsClamped(jan31, 2)), note: '31日のまま3月へ進む' }
      ],
      note: '同じ「2ヶ月後」でも、足し方を変えると答えが変わります。分割払いの支払日を1回ずつ進める実装で、途中から日付がずれていく原因です。'
    });

    return rows;
  }

  /* ---------- 画面への反映 ---------- */

  var current = [];

  function render() {
    var v = $('dt-base').value;
    var base = v ? new Date(v + 'T00:00:00') : new Date();
    if (isNaN(base.getTime())) base = new Date();
    base = mk(base.getFullYear(), base.getMonth() + 1, base.getDate());

    var kind = $('dt-format').value;
    var groups = build(base, parseInt($('dt-fy').value, 10));
    current = [];

    $('dt-list').innerHTML = groups.map(function (g) {
      return '<div class="dt-group"><h3 class="dt-group-hd">' + esc(g.title) + '</h3><div class="dt-grid">' +
        g.items.map(function (it) {
          var val = fmt(it, kind);
          current.push({ v: val, name: it.name, note: it.note });
          return '<div class="dt-item' + (it.warn ? ' is-warn' : '') + '">' +
            '<div class="dt-val">' + esc(val) + '</div>' +
            '<div class="dt-name">' + esc(it.name) + '</div>' +
            '<p class="dt-note">' + esc(it.note) + '</p>' +
            '<button type="button" class="dt-copy dt-copy-s" data-v="' + esc(val) + '">コピー</button>' +
            '</div>';
        }).join('') + '</div></div>';
    }).join('');

    $('dt-diff').innerHTML = buildDiffs(base).map(function (r) {
      return '<div class="dt-diff-card"><div class="dt-diff-q">' + esc(r.q) + '</div><div class="dt-diff-as">' +
        r.a.map(function (a) {
          return '<div class="dt-diff-a"><span class="dt-diff-l">' + esc(a.l) + '</span>' +
            '<span class="dt-diff-v">' + esc(a.v) + '</span>' +
            '<span class="dt-diff-n">' + esc(a.note) + '</span></div>';
        }).join('<span class="dt-diff-vs">vs</span>') +
        '</div><p class="dt-diff-note">' + esc(r.note) + '</p></div>';
    }).join('');

    $('dt-out').value = ['日付,名前,注意点'].concat(current.map(function (c) {
      return [c.v, c.name, c.note].map(csvCell).join(',');
    })).join('\n');
    $('dt-info').textContent = current.length + '件の日付';
  }

  function csvCell(v) { return /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = 'コピーしました';
      btn.classList.add('is-done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(text, done); });
    } else fallback(text, done);
  }
  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* 何もしない */ }
    document.body.removeChild(ta);
  }

  /* ---------- 配線 ---------- */

  $('dt-base').addEventListener('change', render);
  $('dt-fy').addEventListener('change', render);
  $('dt-format').addEventListener('change', render);
  $('dt-today').addEventListener('click', function () {
    $('dt-base').value = iso(new Date());
    render();
  });
  $('dt-copyall').addEventListener('click', function () { copyText($('dt-out').value, this); });
  $('dt-list').addEventListener('click', function (e) {
    var btn = e.target.closest('.dt-copy-s');
    if (btn) copyText(btn.dataset.v, btn);
  });
  $('dt-dl').addEventListener('click', function () {
    var blob = new Blob(['﻿' + $('dt-out').value], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'test-dates-' + iso(new Date()) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $('dt-base').value = iso(new Date());
  render();
})();
