/* ============================================================
   csv-excel.js — CSV Excel崩れチェッカー（画面）
   CSV を貼るか選ぶと、日本語版 Excel でダブルクリックして開いたときに変わるセルを洗い出す。
   セルごとの判定は csv-excel-rules.js（実機の Excel で実測した規則）に任せる。
   読み込みも判定もブラウザ内だけ。サーバー送信は一切しない。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('cx-input') || !window.CsvExcelRules) return;
  var R = window.CsvExcelRules;

  var MAX_ROWS = 5000;   // 判定する行数の上限
  var GRID_ROWS = 100;   // 表に出す行数
  var LIST_MAX = 300;    // 一覧に出す件数

  var CATS = {
    zero: { label: '先頭の0が消える', cls: 'c-zero' },
    date: { label: '日付・時刻になる', cls: 'c-date' },
    time: { label: '日付・時刻になる', cls: 'c-date' },
    digits: { label: '桁が失われる・指数表記', cls: 'c-digits' },
    exp: { label: '桁が失われる・指数表記', cls: 'c-digits' },
    formula: { label: '数式として動く', cls: 'c-formula' },
    number: { label: 'そのほか数値に変わる', cls: 'c-number' },
    bool: { label: 'そのほか数値に変わる', cls: 'c-number' },
  };
  var ORDER = ['先頭の0が消える', '日付・時刻になる', '桁が失われる・指数表記', '数式として動く', 'そのほか数値に変わる'];

  var SAMPLE = [
    '会員番号,郵便番号,電話番号,商品コード,サイズ,価格,登録日,メモ',
    '00123,0600001,09012345678,SEPT2,1-2,"1,280",2026/9/17,=1+1',
    '04567,1000001,0312345678,3E5,10-12,500,9/17,+81',
    '1234567890123456,5300001,08012345678,MARCH1,1.50,1000,令和8年9月17日,true',
  ].join('\r\n');

  var state = { text: '', enc: 'utf8', source: 'paste', fileName: '' };

  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function visible(s) { return String(s).replace(/\t/g, '⇥').replace(/\r?\n/g, '↵'); }

  /* ---------- 文字コード ---------- */

  function decodeFile(buf) {
    var u = new Uint8Array(buf);
    if (u[0] === 0xEF && u[1] === 0xBB && u[2] === 0xBF) return { enc: 'utf8bom', text: new TextDecoder('utf-8').decode(u.subarray(3)) };
    try {
      var t = new TextDecoder('utf-8', { fatal: true }).decode(u);
      return { enc: /[^\x00-\x7F]/.test(t) ? 'utf8' : 'ascii', text: t };
    } catch (e) {
      return { enc: 'sjis', text: new TextDecoder('shift_jis').decode(u) };
    }
  }
  var ENC_LABEL = { utf8bom: 'UTF-8（BOMあり）', utf8: 'UTF-8（BOMなし）', sjis: 'Shift_JIS', ascii: '英数字だけ（文字コードの影響なし）' };

  // BOM なし UTF-8 は、日本語版 Excel が Shift_JIS として読む（実測で「名前」→「蜷榊燕」）
  function mojibake(text) {
    return new TextDecoder('shift_jis').decode(new TextEncoder().encode(text)).replace(/�/g, '・');
  }

  /* ---------- 判定 ---------- */

  function analyze() {
    var year = parseInt($('cx-year').value, 10) || new Date().getFullYear();
    var rows = R.parseCsv(state.text).slice(0, MAX_ROWS);
    var width = rows.reduce(function (w, r) { return Math.max(w, r.length); }, 0);
    var header = rows[0] ? rows[0].map(function (c) { return c.v; }) : [];
    var changed = [], quiet = 0, counts = {};
    var grid = rows.map(function (row, ri) {
      return row.map(function (cell, ci) {
        var r = R.excel(cell.v, { year: year });
        r.raw = cell.v; r.ref = colName(ci) + (ri + 1); r.col = header[ci] || '';
        if (r.changed) {
          var cat = CATS[r.kind];
          if (cat) { counts[cat.label] = (counts[cat.label] || 0) + 1; changed.push(r); }
        } else if (r.kind !== 'same') quiet++;
        return r;
      });
    });
    return { rows: grid, width: width, changed: changed, counts: counts, quiet: quiet, total: rows.reduce(function (n, r) { return n + r.length; }, 0), capped: R.parseCsv(state.text).length > MAX_ROWS };
  }

  /* ---------- 描画 ---------- */

  function render() {
    var out = $('cx-result');
    if (!state.text.trim()) { out.hidden = true; return; }
    out.hidden = false;
    var a = analyze();

    // 文字コード
    var enc = state.enc, encBox = $('cx-enc');
    var hasJa = /[^\x00-\x7F]/.test(state.text);
    if (enc === 'utf8' && hasJa) {
      var lines = mojibake(state.text).split(/\r?\n/).slice(0, 4).join('\n');
      encBox.className = 'cx-enc is-ng';
      encBox.innerHTML = '<p class="cx-enc-hd">文字化けします（' + ENC_LABEL[enc] + '）</p>' +
        '<p>日本語版の Excel は、BOM のない UTF-8 を Shift_JIS として読みます。ダブルクリックで開くと、たとえば次のように見えます。化けた部分でカンマが飲み込まれ、<strong>列がずれることもあります</strong>（化け方は目安です）。</p>' +
        '<pre class="cx-pre">' + esc(lines) + '</pre>' +
        '<p>直し方：ファイルの先頭に BOM を付けて保存する（「UTF-8（BOM付き）」で書き出す）か、Shift_JIS で書き出します。</p>';
    } else {
      encBox.className = 'cx-enc is-ok';
      encBox.innerHTML = '<p class="cx-enc-hd">文字コード：' + ENC_LABEL[hasJa ? enc : 'ascii'] + '</p><p>' +
        (enc === 'sjis' ? 'Shift_JIS なので日本語は化けません。ただし絵文字や一部の記号は Shift_JIS に入らず、書き出す時点で失われます。'
          : hasJa ? 'BOM があるので、日本語は化けずに開けます。' : '日本語を含まないので、文字コードでは化けません。') + '</p>';
    }

    // 集計
    var sum = $('cx-summary');
    sum.textContent = '';
    var head = document.createElement('p');
    head.className = 'cx-sum-hd';
    head.innerHTML = a.changed.length
      ? '<strong>' + a.total + 'セル中 ' + a.changed.length + 'セル</strong>が、Excel で開くと変わります'
      : '<strong>' + a.total + 'セル</strong>を見ました。Excel で開いても見た目が変わるセルはありません';
    sum.appendChild(head);
    var chips = document.createElement('div');
    chips.className = 'cx-chips';
    ORDER.forEach(function (label) {
      var n = a.counts[label] || 0;
      var key = Object.keys(CATS).filter(function (k) { return CATS[k].label === label; })[0];
      var c = document.createElement('span');
      c.className = 'cx-chip ' + CATS[key].cls + (n ? '' : ' is-zero');
      c.innerHTML = esc(label) + ' <b>' + n + '</b>';
      chips.appendChild(c);
    });
    sum.appendChild(chips);
    if (a.quiet) {
      var q = document.createElement('p');
      q.className = 'cx-note';
      q.textContent = 'ほかに ' + a.quiet + 'セルは、見た目は同じでも中身が数値・日付・時刻に変わります（並べ替えや集計の結果が文字のときと変わることがあります）。';
      sum.appendChild(q);
    }
    if (a.capped) {
      var cp = document.createElement('p');
      cp.className = 'cx-note';
      cp.textContent = '先頭の ' + MAX_ROWS + '行だけを見ています。';
      sum.appendChild(cp);
    }

    // 表
    var showRaw = $('cx-show-raw').checked;
    var table = document.createElement('table');
    table.className = 'cx-grid';
    var thead = '<thead><tr><th></th>';
    for (var c = 0; c < a.width; c++) thead += '<th>' + colName(c) + '</th>';
    table.innerHTML = thead + '</tr></thead>';
    var tb = document.createElement('tbody');
    a.rows.slice(0, GRID_ROWS).forEach(function (row, ri) {
      var tr = document.createElement('tr');
      var th = document.createElement('th'); th.textContent = ri + 1; tr.appendChild(th);
      for (var ci = 0; ci < a.width; ci++) {
        var td = document.createElement('td'), r = row[ci];
        if (r) {
          if (r.changed && CATS[r.kind]) {
            td.className = CATS[r.kind].cls;
            td.title = r.ref + '：「' + visible(r.raw) + '」→「' + visible(r.shown) + '」　' + r.why;
            td.innerHTML = (showRaw ? '<s>' + esc(visible(r.raw)) + '</s>' : '') + '<span>' + esc(visible(r.shown)) + '</span>';
          } else {
            td.textContent = visible(r.raw);
          }
        }
        tr.appendChild(td);
      }
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    var gridBox = $('cx-grid');
    gridBox.textContent = '';
    gridBox.appendChild(table);
    $('cx-grid-note').textContent = a.rows.length > GRID_ROWS ? '表は先頭の ' + GRID_ROWS + '行だけ出しています（判定と一覧は ' + a.rows.length + '行ぶん）。' : '';

    // 一覧
    var list = $('cx-list');
    list.textContent = '';
    a.changed.slice(0, LIST_MAX).forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td class="cx-ref"></td><td class="cx-mono"></td><td class="cx-mono"></td><td class="cx-mono"></td><td></td>';
      var td = tr.children;
      td[0].innerHTML = '<span class="cx-dot ' + CATS[r.kind].cls + '"></span>' + esc(r.ref) + (r.col ? '<small>' + esc(r.col) + '</small>' : '');
      td[1].textContent = visible(r.raw);
      td[2].textContent = visible(r.shown) + (r.narrow !== r.shown ? '（列の幅そのままだと ' + visible(r.narrow) + '）' : '');
      td[3].textContent = visible(r.saved);
      td[4].textContent = r.why;
      list.appendChild(tr);
    });
    $('cx-list-wrap').hidden = !a.changed.length;
    $('cx-list-note').textContent = a.changed.length > LIST_MAX ? '先頭の ' + LIST_MAX + '件だけ出しています。' : '';
  }

  /* ---------- 入力 ---------- */

  var timer = null;
  $('cx-input').addEventListener('input', function () {
    state.text = $('cx-input').value; state.source = 'paste'; state.enc = $('cx-paste-enc').value;
    $('cx-file-info').textContent = '';
    clearTimeout(timer); timer = setTimeout(render, 250);
  });
  $('cx-paste-enc').addEventListener('change', function () { if (state.source === 'paste') { state.enc = $('cx-paste-enc').value; render(); } });
  $('cx-year').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(render, 250); });
  $('cx-show-raw').addEventListener('change', render);
  $('cx-sample').addEventListener('click', function () {
    $('cx-input').value = SAMPLE; state.text = SAMPLE; state.source = 'paste'; state.enc = $('cx-paste-enc').value;
    $('cx-file-info').textContent = ''; render();
  });
  $('cx-file').addEventListener('change', function () {
    var f = $('cx-file').files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      var d = decodeFile(reader.result);
      state.text = d.text; state.enc = d.enc; state.source = 'file'; state.fileName = f.name;
      $('cx-input').value = d.text.length > 200000 ? d.text.slice(0, 200000) + '\n…（表示は途中まで）' : d.text;
      $('cx-file-info').textContent = f.name + '（' + ENC_LABEL[d.enc] + ' と判定）';
      render();
    };
    reader.readAsArrayBuffer(f);
  });

  $('cx-year').value = new Date().getFullYear();
})();
