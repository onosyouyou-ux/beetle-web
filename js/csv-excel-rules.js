/* ============================================================
   csv-excel-rules.js — CSVのセルを日本語版Excelがどう読むか（規則）
   2026-09-17 に、日本語版 Excel（バージョン16・地域設定 ja-JP）で CSV を開き、
   162通りの値について「見え方」「保存される値」「上書き保存したときに書き戻される文字」を実測して作った。
   ここにある規則は実測で確かめたものだけ。当てはまらない値は「文字のまま」と推定する。
   画面（csv-excel.js）から使うほか、検算用に window.CsvExcelRules として公開する。
   ============================================================ */
(function (global) {
  'use strict';

  var MONTHS = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };
  var MON_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function validDate(y, m, d) { return m >= 1 && m <= 12 && d >= 1 && d <= [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]; }
  // 全角の英数記号（！〜～）を半角に。Excel は「１２３」を 123、「１－２」を日付として読んだ
  function toHalf(s) { return s.replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }); }
  function pad2(n) { return String(n).padStart(2, '0'); }

  // Excel の「標準（G/標準）」表示：maxChars 文字に収まるように丸め、収まらなければ指数表記にする
  // 実測：列幅そのまま（8.38）で 8 文字、上書き保存で 11 文字（1.23457E+11 / 1.23456789 / 1E+15）
  function general(num, maxChars) {
    if (num === 0) return '0';
    var neg = num < 0, a = Math.abs(num);
    var avail = maxChars - (neg ? 1 : 0);
    var intDigits = Math.floor(Math.log10(a)) + 1;
    if (a >= 1e-4 && intDigits <= avail) {
      var dec = Math.max(0, avail - Math.max(intDigits, 1) - 1);
      var s = a.toFixed(Math.min(dec, 20));
      if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
      if (s.replace('.', '').replace(/^0+/, '').length > 0 && s.length <= avail) return (neg ? '-' : '') + s;
    }
    var expPart = Math.abs(Math.floor(Math.log10(a))) >= 100 ? 5 : 4; // E+307 / E+15
    var mant = Math.max(0, avail - expPart - 2);
    var e = a.toExponential(mant).split('e');
    var m = e[0].indexOf('.') >= 0 ? e[0].replace(/0+$/, '').replace(/\.$/, '') : e[0];
    var ex = parseInt(e[1], 10);
    return (neg ? '-' : '') + m + 'E' + (ex < 0 ? '-' : '+') + pad2(Math.abs(ex));
  }
  // 15桁より細かいところは Excel が持てない（16桁目以降は0になる）
  function to15(num) { return Number(num.toPrecision(15)); }
  function sciFixed(num) { // 書式 0.00E+00
    var e = num.toExponential(2).split('e'), ex = parseInt(e[1], 10);
    return e[0] + 'E' + (ex < 0 ? '-' : '+') + pad2(Math.abs(ex));
  }

  function result(kind, shown, saved, why, extra) {
    var r = { kind: kind, shown: shown, saved: saved, why: why };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }
  function same(raw) { return result('same', raw, raw, ''); }

  function dateText(y, m, d, fmt) {
    if (fmt === 'md') return m + '月' + d + '日';
    if (fmt === 'ymd') return y + '/' + m + '/' + d;
    if (fmt === 'ym-en') return MON_ABBR[m] + '-' + pad2(y % 100);
    if (fmt === 'dm-en') return d + '-' + MON_ABBR[m];
    if (fmt === 'dmy-en') return d + '-' + MON_ABBR[m] + '-' + pad2(y % 100);
    if (fmt === 'y年m月') return y + '年' + m + '月';
    if (fmt === 'y年m月d日') return y + '年' + m + '月' + d + '日';
    return y + '/' + m + '/' + d;
  }
  function asDate(raw, y, m, d, fmt, keepShown) {
    var shown = keepShown ? raw : dateText(y, m, d, fmt);
    var r = result('date', shown, shown, '日付として読まれ、中身は日付のシリアル値になります。元の「' + raw + '」には戻りません');
    r.year = y;
    return r;
  }

  /**
   * CSV の1セルを、日本語版 Excel で開いたときの結果にする
   * @param {string} raw  CSV を読んだあとのセルの文字（クォートは外したもの）
   * @param {object} opt  { year: 開いた年（年のない日付に使う） }
   * @return {object} { kind, shown（列幅を広げたときの見え方）, narrow（列幅そのままの見え方）, saved（上書き保存で書き戻される文字）, why }
   */
  function excel(raw, opt) {
    var year = (opt && opt.year) || new Date().getFullYear();
    var r = judge(raw, year);
    if (r.narrow === undefined) r.narrow = r.shown;
    r.changed = r.saved !== raw || r.shown !== raw;
    return r;
  }

  function judge(raw, year) {
    if (raw === '') return same(raw);

    // ---- 数式（CSVインジェクションの入口） ----
    // 式として成り立たないもの（カンマで途中が切れた =HYPERLINK( など）は文字のまま残った。そこまでは判定しない
    if (/^=./.test(raw)) return result('formula', '（数式の計算結果）', '（数式の計算結果）', '「=」で始まるので数式として実行されます。セルの参照や関数も動きます（式として成り立たなければ文字のまま）', { formula: true });
    if (/^@[A-Za-z]+\(/.test(raw)) return result('formula', '（数式の計算結果）', '（数式の計算結果）', '「@関数(」で始まるので数式として実行されます', { formula: true });

    var t = toHalf(raw);
    // 数字の前後の半角スペースは無視された。タブは残った（タブ＋00123 は文字のまま）。TRUE の前のスペースも残った
    var s = t.replace(/^ +| +$/g, '');

    // ---- + - で始まる計算式 ----
    if (/^[+-]\d+(\.\d+)?([+\-*/]\d+(\.\d+)?)+$/.test(s)) {
      var val = arith(s);
      var g = val === null ? '（数式の計算結果）' : general(val, 11);
      return result('formula', g, g, '「+」「-」で始まる計算式として実行されます（' + raw + ' → ' + g + '）', { formula: true });
    }

    // ---- 真偽値 ----
    if (/^(true|false)$/i.test(raw)) {
      var b = raw.toUpperCase();
      return b === raw ? same(raw) : result('bool', b, b, '真偽値として読まれ、大文字になります');
    }
    if (raw === '#N/A') return same(raw);

    // ---- 日付・時刻（数字だけの判定より先に見る） ----
    var dt = date(s, raw, year);
    if (dt) return dt;

    // ---- 指数表記 ----
    var m;
    if ((m = s.match(/^(\d+(?:\.\d+)?)[eE]([+-]?\d+)$/))) {
      var ev = Number(m[1] + 'e' + m[2]);
      if (!isFinite(ev) || ev > 9.99e307) return same(raw);
      var sf = sciFixed(ev);
      return result('exp', sf, sf, '指数表記の数値として読まれます（' + raw + ' ＝ ' + general(ev, 15) + '）。「3E5」のような型番やコードも数値になります', { narrow: sf.length > 8 ? '######' : sf });
    }

    // ---- ふつうの数値 ----
    if ((m = s.match(/^\+?(-?)(\d+\.?\d*|\.\d+)$/))) return number(raw, Number(m[1] + m[2]), m[2]);

    // ---- パーセント ----
    if ((m = s.match(/^(-?\d+(?:\.(\d+))?)%$/))) {
      var pct = m[2] ? Number(m[1]).toFixed(2) + '%' : m[1] + '%';
      return pct === raw ? result('number', raw, raw, '見た目は同じですが、中身は ' + general(Number(m[1]) / 100, 11) + ' の数値になります', { quiet: true })
        : result('number', pct, pct, 'パーセントの数値として読まれ、小数点以下2桁の表示になります');
    }
    // ---- (100) はマイナス ----
    if ((m = s.match(/^\((\d+(?:\.\d+)?)\)$/))) return result('number', '-' + m[1], '-' + m[1], '会計の書き方として、マイナスの数値になります');
    // ---- 桁区切りのカンマ（クォートで囲まれていたときだけセルに入る） ----
    if ((m = s.match(/^(-?\d{1,3}(?:,\d{3})+)(\.\d+)?$/))) return result('number', raw, raw, '見た目は同じですが、中身は ' + m[1].replace(/,/g, '') + (m[2] || '') + ' の数値になります', { quiet: true });
    // ---- 通貨 ----
    if ((m = s.match(/^([$¥])(\d{1,3}(?:,\d{3})*|\d+)$/))) {
      // ドルの書式は末尾に空白が付く（実測で「$100 」）
      var cur = m[1] + Number(m[2].replace(/,/g, '')).toLocaleString('en-US') + (m[1] === '$' ? ' ' : '');
      return result('number', cur, cur, '通貨の数値として読まれます（中身は ' + m[2].replace(/,/g, '') + '）');
    }
    // ---- 帯分数 ----
    if ((m = s.match(/^(\d+) (\d+)\/(\d+)$/)) && +m[3] > 0 && +m[2] < +m[3]) {
      var fr = (m[1] === '0' ? ' ' : m[1] + ' ') + m[2] + '/' + m[3];
      return fr === raw ? result('number', raw, raw, '見た目は同じですが、中身は ' + general(+m[1] + m[2] / m[3], 11) + ' の数値になります', { quiet: true })
        : result('number', fr, fr, '分数の数値として読まれます');
    }
    return same(raw);
  }

  function number(raw, num, digits) {
    var sig = digits.replace('.', '').replace(/^0+/, '').length;
    var stored = to15(num);
    var shown = general(stored, 11), narrow = general(stored, 8);
    var why = [];
    if (/^\s*[+-]?0\d/.test(toHalf(raw))) why.push('数値として読まれ、先頭の0が消えます');
    if (sig > 15) why.push('Excel は15桁までしか持てないので、16桁目から先が0になります');
    if (/\.\d*0$/.test(digits)) why.push('小数点以下の末尾の0が消えます');
    if (shown.indexOf('E') >= 0) why.push('12桁以上の数値は指数表記になり、上書き保存すると「' + shown + '」の文字で書き戻されて元の数字が失われます');
    else if (narrow !== shown) why.push('列の幅が狭いあいだは「' + narrow + '」と表示されます（幅を広げれば戻り、保存しても数字は残ります）');
    if (/^ | $/.test(raw)) why.push('前後の空白が取れます');
    if (/[０-９]/.test(raw)) why.push('全角の数字が半角の数値になります');
    if (/^\+/.test(raw.trim())) why.push('先頭の「+」が消えます');
    var kind = /^\s*[+-]?0\d/.test(toHalf(raw)) ? 'zero' : (sig > 15 || shown.indexOf('E') >= 0) ? 'digits' : 'number';
    if (shown === raw && narrow === raw) return same(raw);
    return result(kind, shown, shown, why.join('。') || '数値として読まれます', { narrow: narrow, lossy: sig > 15 || shown.indexOf('E') >= 0 });
  }

  function date(s, raw, year) {
    var m, y, mo, d;
    // m-d / m/d（ありえなければ d-m と読み、それでもだめなら文字のまま）
    if ((m = s.match(/^(\d{1,2})[-/](\d{1,2})$/))) {
      var a = +m[1], b = +m[2];
      if (validDate(year, a, b)) return asDate(raw, year, a, b, 'md');
      if (validDate(year, b, a)) return asDate(raw, year, b, a, 'md');
      return null;
    }
    // y/m/d（年が2桁以下なら 00〜29 は2000年代、30〜99 は1900年代）
    if ((m = s.match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,2})(?: (\d{1,2}):(\d{2}))?$/))) {
      y = +m[1]; if (m[1].length <= 2) y += y < 30 ? 2000 : 1900;
      if (!validDate(y, +m[2], +m[3])) return null;
      if (m[4] !== undefined) {
        var st = y + '/' + +m[2] + '/' + +m[3] + ' ' + +m[4] + ':' + m[5];
        return result('date', st, st, '日付と時刻として読まれます。中身はシリアル値になります', { narrow: '######' });
      }
      var r = asDate(raw, y, +m[2], +m[3], 'ymd');
      if (r.shown.length > 8) r.narrow = '######';
      return r;
    }
    if ((m = s.match(/^(\d{4})[-/](\d{1,2})$/)) && +m[2] >= 1 && +m[2] <= 12) return asDate(raw, +m[1], +m[2], 1, 'ym-en');
    if ((m = s.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)) && validDate(+m[1], +m[2], +m[3])) { var r2 = asDate(raw, +m[1], +m[2], +m[3], 'y年m月d日'); r2.narrow = '######'; return r2; }
    if ((m = s.match(/^(\d{4})年(\d{1,2})月$/)) && +m[2] >= 1 && +m[2] <= 12) return asDate(raw, +m[1], +m[2], 1, 'y年m月');
    if ((m = s.match(/^(\d{1,2})月(\d{1,2})日$/)) && validDate(year, +m[1], +m[2])) return asDate(raw, year, +m[1], +m[2], 'md');
    // 和暦（令和8年9月17日・R8.9.17）は見た目はそのまま、中身は日付
    if ((m = s.match(/^(令和|平成|昭和|[RHS])(\d{1,2}|元)[年.](\d{1,2})[月.](\d{1,2})日?$/))) {
      var r3 = result('date', raw, raw, '和暦の日付として読まれます。見た目は同じですが、中身は日付のシリアル値です', { quiet: true });
      if (raw.length > 8) r3.narrow = '######';
      return r3;
    }
    // 英語の月名（SEPT2・MARCH1・Mar-21・Sep 17・APR2020・1-Jan・1 Jan 2026）
    if ((m = s.match(/^([A-Za-z]{3,9})[-\s]?(\d{1,4})$/)) && MONTHS[m[1].toLowerCase()]) {
      mo = MONTHS[m[1].toLowerCase()]; var n = +m[2];
      if (m[2].length === 4) return asDate(raw, n, mo, 1, 'ym-en');
      if (validDate(year, mo, n)) return asDate(raw, year, mo, n, 'dm-en');
      return null;
    }
    if ((m = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,9})(?:[-\s](\d{4}))?$/)) && MONTHS[m[2].toLowerCase()]) {
      mo = MONTHS[m[2].toLowerCase()]; y = m[3] ? +m[3] : year; d = +m[1];
      if (!validDate(y, mo, d)) return null;
      return asDate(raw, y, mo, d, m[3] ? 'dmy-en' : 'dm-en');
    }
    // 時刻
    if ((m = s.match(/^(\d{1,2}):(\d{1,2})$/))) {
      var h = +m[1], mi = +m[2];
      if (mi >= 60) { var fv = (h * 60 + mi) / 1440, g = general(fv, 11); return result('time', g, g, '分が60以上なので、時刻ではなく「1日を1とした小数」の数値になります', { narrow: general(fv, 8) }); }
      if (h >= 24) { var tt = h + ':' + pad2(mi) + ':00'; return result('time', tt, tt, '24時間を超える時間として読まれ、秒が付きます'); }
      var tm = h + ':' + pad2(mi);
      return tm === raw ? result('time', raw, raw, '見た目は同じですが、中身は時刻（1日を1とした小数）になります', { quiet: true })
        : result('time', tm, tm, '時刻として読まれ、分が2桁になります');
    }
    if ((m = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/)) && +m[2] < 60 && +m[3] < 60) return result('time', raw, raw, '見た目は同じですが、中身は時刻になります', { quiet: true });
    if ((m = s.match(/^(\d{1,2}):(\d{2}) ?(AM|PM)$/i))) return result('time', raw, raw, '見た目は同じですが、中身は時刻になります', { quiet: true });
    if ((m = s.match(/^(\d{1,2})時(\d{1,2})分$/))) { var jt = +m[1] + '時' + pad2(+m[2]) + '分'; return result('time', jt, jt, jt === raw ? '見た目は同じですが、中身は時刻になります' : '時刻として読まれます', { quiet: jt === raw }); }
    return null;
  }

  // 「-2-3」「+1+1」のような四則演算だけを安全に計算する
  function arith(s) {
    var tokens = s.match(/[+\-*/]|\d+(?:\.\d+)?/g);
    if (!tokens) return null;
    var vals = [], ops = [], sign = 1, i = 0;
    if (tokens[0] === '-' || tokens[0] === '+') { sign = tokens[0] === '-' ? -1 : 1; i = 1; }
    vals.push(sign * Number(tokens[i++]));
    while (i < tokens.length) {
      var op = tokens[i++], v = Number(tokens[i++]);
      if (op === '*') vals[vals.length - 1] *= v;
      else if (op === '/') vals[vals.length - 1] /= v;
      else { ops.push(op); vals.push(v); }
    }
    var total = vals[0];
    for (var k = 0; k < ops.length; k++) total = ops[k] === '+' ? total + vals[k + 1] : total - vals[k + 1];
    return isFinite(total) ? total : null;
  }

  /* ---------- CSV を読む（RFC 4180。クォートの有無もセルごとに覚える） ---------- */
  function parseCsv(text) {
    var rows = [], row = [], field = '', quoted = false, inQ = false, i = 0;
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
        field += c; i++; continue;
      }
      if (c === '"' && field === '') { inQ = true; quoted = true; i++; continue; }
      if (c === ',') { row.push({ v: field, q: quoted }); field = ''; quoted = false; i++; continue; }
      if (c === '\r' || c === '\n') {
        row.push({ v: field, q: quoted }); rows.push(row); row = []; field = ''; quoted = false;
        i += (c === '\r' && text[i + 1] === '\n') ? 2 : 1; continue;
      }
      field += c; i++;
    }
    if (field !== '' || quoted || row.length) { row.push({ v: field, q: quoted }); rows.push(row); }
    return rows;
  }

  global.CsvExcelRules = { excel: excel, parseCsv: parseCsv, general: general };
})(window);
