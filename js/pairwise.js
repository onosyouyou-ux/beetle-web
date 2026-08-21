/* ============================================================
   pairwise.js — ペアワイズ法テストケース生成ツール
   すべてブラウザ内で完結。サーバー送信は一切しない。
   同じ入力からは常に同じ表が出るよう、乱数を使わず決定的に生成する。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('pw-factors')) return;

  // 暴走防止の上限（ブラウザが固まらない範囲）
  var MAX_FACTORS = 15;
  var MAX_LEVELS = 20;
  var MAX_TUPLES = 200000;
  var MAX_TESTS = 5000;

  var PRESETS = {
    web: {
      factors: 'OS: Windows, Mac, iOS, Android\nブラウザ: Chrome, Safari, Firefox\n会員種別: 未ログイン, 無料会員, 有料会員\n決済手段: クレジットカード, コンビニ払い, 代引き',
      forbid: 'OS=iOS, ブラウザ=Firefox\nOS=Android, ブラウザ=Safari\n会員種別=未ログイン, 決済手段=コンビニ払い'
    },
    form: {
      factors: '入力デバイス: PC, スマホ\n氏名: 未入力, 通常, 記号入り, 最大文字数\nメール: 未入力, 正常, 形式エラー, 登録済み\n電話番号: 未入力, ハイフンあり, ハイフンなし\n規約同意: 同意する, 同意しない',
      forbid: '氏名=未入力, 規約同意=同意する'
    },
    ec: {
      factors: '会員: ゲスト, 一般, プレミアム\n決済: カード, コンビニ, 代引き, ポイント全額\nクーポン: なし, 定額, 定率\n配送: 通常, 日時指定, 店舗受取\n在庫: あり, 残りわずか, 取り寄せ',
      forbid: '会員=ゲスト, 決済=ポイント全額\n配送=店舗受取, 決済=代引き\n在庫=取り寄せ, 配送=日時指定'
    }
  };

  /* ---------- 入力のパース ---------- */

  // 「名前: 水準, 水準」を読む。全角の「：」「、」も受ける
  function parseFactors(text) {
    var factors = [], errors = [], seen = {};
    text.split('\n').forEach(function (raw, i) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var m = line.match(/^([^:：]+)[:：](.*)$/);
      if (!m) {
        errors.push((i + 1) + '行目：「名前: 水準, 水準」の形式で書いてください（' + trunc(line) + '）');
        return;
      }
      var name = m[1].trim();
      var levels = uniq(m[2].split(/[,、]/).map(function (s) { return s.trim(); }).filter(Boolean));
      if (!name) { errors.push((i + 1) + '行目：因子の名前が空です'); return; }
      if (seen[name]) { errors.push((i + 1) + '行目：因子「' + name + '」が重複しています'); return; }
      if (levels.length < 2) {
        errors.push((i + 1) + '行目：因子「' + name + '」の水準が' + levels.length + 'つしかありません（2つ以上必要）');
        return;
      }
      if (levels.length > MAX_LEVELS) {
        errors.push((i + 1) + '行目：因子「' + name + '」の水準が多すぎます（上限' + MAX_LEVELS + '）');
        return;
      }
      seen[name] = true;
      factors.push({ name: name, levels: levels });
    });
    if (!errors.length) {
      if (factors.length < 2) errors.push('因子が' + factors.length + 'つしかありません。2つ以上書いてください。');
      else if (factors.length > MAX_FACTORS) errors.push('因子が多すぎます（上限' + MAX_FACTORS + '）。');
    }
    return { factors: factors, errors: errors };
  }

  // 「因子名=水準, 因子名=水準」を読む
  function parseRules(text, factors) {
    var rules = [], errors = [];
    var byName = {};
    factors.forEach(function (f, i) { byName[f.name] = i; });
    text.split('\n').forEach(function (raw, i) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var parts = line.split(/[,、]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var rule = [], bad = false;
      parts.forEach(function (p) {
        var m = p.match(/^([^=＝]+)[=＝](.*)$/);
        if (!m) {
          errors.push('禁則' + (i + 1) + '行目：「因子名=水準」の形で書いてください（' + trunc(p) + '）');
          bad = true; return;
        }
        var fname = m[1].trim(), lname = m[2].trim();
        if (!(fname in byName)) {
          errors.push('禁則' + (i + 1) + '行目：因子「' + fname + '」は上の因子欄にありません');
          bad = true; return;
        }
        var fi = byName[fname];
        var li = factors[fi].levels.indexOf(lname);
        if (li < 0) {
          errors.push('禁則' + (i + 1) + '行目：因子「' + fname + '」に水準「' + lname + '」はありません');
          bad = true; return;
        }
        rule.push({ f: fi, l: li });
      });
      if (bad) return;
      if (rule.length < 2) {
        errors.push('禁則' + (i + 1) + '行目：2つ以上の「因子名=水準」をカンマで並べてください');
        return;
      }
      rules.push(rule);
    });
    return { rules: rules, errors: errors };
  }

  /* ---------- 生成本体 ---------- */

  // n個から t個を選ぶ組み合わせ（インデックスの配列）を辞書順で列挙
  function combinations(n, t) {
    var out = [], idx = [];
    for (var i = 0; i < t; i++) idx.push(i);
    while (true) {
      out.push(idx.slice());
      var k = t - 1;
      while (k >= 0 && idx[k] === n - t + k) k--;
      if (k < 0) break;
      idx[k]++;
      for (var j = k + 1; j < t; j++) idx[j] = idx[j - 1] + 1;
    }
    return out;
  }

  // 割り当てが禁則に触れているか（-1＝未割り当ての因子は「まだ触れていない」扱い）
  function violates(assign, rules) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i], hit = true;
      for (var j = 0; j < rule.length; j++) {
        if (assign[rule[j].f] !== rule[j].l) { hit = false; break; }
      }
      if (hit) return true;
    }
    return false;
  }

  function tupleKey(combo, assign) {
    var s = '';
    for (var i = 0; i < combo.length; i++) s += (i ? '|' : '') + combo[i] + ':' + assign[combo[i]];
    return s;
  }

  function generate(factors, t, rules) {
    var F = factors.length;
    var combos = combinations(F, t);
    var combosByFactor = [];
    for (var f = 0; f < F; f++) combosByFactor.push([]);
    combos.forEach(function (c, ci) {
      c.forEach(function (f) { combosByFactor[f].push(ci); });
    });

    // 網羅すべき組み合わせ（禁則に触れるものは最初から除く）
    var uncovered = new Map();
    var totalTuples = 0, skippedByRule = 0;
    var tmp = new Array(F).fill(-1);
    for (var ci = 0; ci < combos.length; ci++) {
      var c = combos[ci];
      var counts = c.map(function (f) { return factors[f].levels.length; });
      var span = counts.reduce(function (a, b) { return a * b; }, 1);
      totalTuples += span;
      if (totalTuples > MAX_TUPLES) return { error: 'limit' };
      for (var n = 0; n < span; n++) {
        var r = n;
        for (var k = c.length - 1; k >= 0; k--) { tmp[c[k]] = r % counts[k]; r = Math.floor(r / counts[k]); }
        if (violates(tmp, rules)) { skippedByRule++; }
        else uncovered.set(tupleKey(c, tmp), { c: c, l: c.map(function (f) { return tmp[f]; }) });
        for (var k2 = 0; k2 < c.length; k2++) tmp[c[k2]] = -1;
      }
    }

    var target = uncovered.size;
    var tests = [], unreachable = 0;

    while (uncovered.size && tests.length < MAX_TESTS) {
      var seed = uncovered.values().next().value;
      var assign = new Array(F).fill(-1);
      for (var s = 0; s < seed.c.length; s++) assign[seed.c[s]] = seed.l[s];

      // 残りの因子を「新しく網羅できる組み合わせが最も多い水準」で埋める
      var stuck = false;
      for (var fi = 0; fi < F; fi++) {
        if (assign[fi] >= 0) continue;
        var best = -1, bestGain = -1;
        for (var li = 0; li < factors[fi].levels.length; li++) {
          assign[fi] = li;
          if (violates(assign, rules)) { assign[fi] = -1; continue; }
          var gain = 0, list = combosByFactor[fi];
          for (var q = 0; q < list.length; q++) {
            var cc = combos[list[q]], ready = true;
            for (var w = 0; w < cc.length; w++) { if (assign[cc[w]] < 0) { ready = false; break; } }
            if (ready && uncovered.has(tupleKey(cc, assign))) gain++;
          }
          assign[fi] = -1;
          if (gain > bestGain) { bestGain = gain; best = li; }
        }
        if (best < 0) { stuck = true; break; }
        assign[fi] = best;
      }

      // 禁則が絡んで1件も作れない組み合わせは「到達不能」として諦める
      if (stuck) { uncovered.delete(tupleKey(seed.c, seedAssign(seed, F))); unreachable++; continue; }

      var removed = 0;
      for (var ci2 = 0; ci2 < combos.length; ci2++) {
        if (uncovered.delete(tupleKey(combos[ci2], assign))) removed++;
      }
      if (!removed) { uncovered.delete(tupleKey(seed.c, seedAssign(seed, F))); unreachable++; continue; }
      tests.push(assign.slice());
    }

    return {
      tests: tests,
      target: target,
      covered: target - uncovered.size - unreachable,
      unreachable: unreachable,
      skippedByRule: skippedByRule,
      capped: uncovered.size > 0 && tests.length >= MAX_TESTS
    };
  }

  function seedAssign(seed, F) {
    var a = new Array(F).fill(-1);
    for (var i = 0; i < seed.c.length; i++) a[seed.c[i]] = seed.l[i];
    return a;
  }

  /* ---------- 出力の整形 ---------- */

  function csvCell(v) {
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function format(kind, headers, rows) {
    if (kind === 'csv') {
      return [headers.map(csvCell).join(',')].concat(
        rows.map(function (r) { return r.map(csvCell).join(','); })
      ).join('\n');
    }
    if (kind === 'tsv') {
      return [headers.join('\t')].concat(
        rows.map(function (r) { return r.join('\t'); })
      ).join('\n');
    }
    if (kind === 'md') {
      var esc = function (v) { return String(v).replace(/\|/g, '\\|'); };
      return ['| ' + headers.map(esc).join(' | ') + ' |',
        '| ' + headers.map(function () { return '---'; }).join(' | ') + ' |']
        .concat(rows.map(function (r) { return '| ' + r.map(esc).join(' | ') + ' |'; }))
        .join('\n');
    }
    return JSON.stringify(rows.map(function (r) {
      var o = {};
      headers.forEach(function (h, i) { o[h] = r[i]; });
      return o;
    }), null, 2);
  }

  /* ---------- 画面への反映 ---------- */

  var state = { headers: [], rows: [] };

  function showMessages(list) {
    $('pw-msg').innerHTML = list.map(function (m) {
      return '<div class="pw-note' + (m.error ? ' is-error' : '') + '">' + esc(m.text) +
        (m.sub ? '<span>' + esc(m.sub) + '</span>' : '') + '</div>';
    }).join('');
  }

  function clearResult() {
    $('pw-stats').innerHTML = '';
    $('pw-table').querySelector('thead').innerHTML = '';
    $('pw-table').querySelector('tbody').innerHTML = '';
    $('pw-out').value = '';
    $('pw-info').textContent = '—';
    state = { headers: [], rows: [] };
  }

  function run() {
    var fp = parseFactors($('pw-factors').value);
    if (fp.errors.length) {
      clearResult();
      showMessages(fp.errors.map(function (t) { return { text: t, error: true }; }));
      return;
    }
    var rp = parseRules($('pw-forbid').value, fp.factors);
    if (rp.errors.length) {
      clearResult();
      showMessages(rp.errors.map(function (t) { return { text: t, error: true }; }));
      return;
    }

    var t = parseInt($('pw-strength').value, 10);
    if (fp.factors.length < t) {
      clearResult();
      showMessages([{ text: t + '因子間で網羅するには、因子が' + t + 'つ以上必要です。', error: true }]);
      return;
    }

    var res = generate(fp.factors, t, rp.rules);
    if (res.error === 'limit') {
      clearResult();
      showMessages([{ text: '組み合わせが多すぎて計算できません。', sub: '因子か水準を減らすか、2因子間に切り替えてください。', error: true }]);
      return;
    }

    var withNo = $('pw-no').checked;
    var headers = fp.factors.map(function (f) { return f.name; });
    if (withNo) headers = ['No'].concat(headers);
    var rows = res.tests.map(function (tc, i) {
      var r = tc.map(function (li, fi) { return fp.factors[fi].levels[li]; });
      return withNo ? [String(i + 1)].concat(r) : r;
    });
    state = { headers: headers, rows: rows };

    var full = fp.factors.reduce(function (a, f) { return a * f.levels.length; }, 1);
    var cut = full > 0 ? Math.round((1 - res.tests.length / full) * 100) : 0;
    var coverage = res.target ? Math.round(res.covered / res.target * 100) : 100;

    $('pw-stats').innerHTML =
      stat(full.toLocaleString(), '全網羅なら', fp.factors.map(function (f) { return f.levels.length; }).join('×')) +
      stat(res.tests.length.toLocaleString(), t === 2 ? 'ペアワイズなら' : '3因子間網羅なら', t + '因子間を網羅') +
      stat(cut + '%', '削減', '', 'is-hero') +
      stat(coverage + '%', (t === 2 ? '2因子' : '3因子') + 'の組み合わせ網羅', res.covered.toLocaleString() + ' / ' + res.target.toLocaleString(), coverage === 100 ? 'is-ok' : '');

    var msgs = [];
    if (res.skippedByRule) {
      msgs.push({ text: '禁則により ' + res.skippedByRule.toLocaleString() + ' 通りの組み合わせを網羅対象から除きました。', sub: '禁則欄に書いた組み合わせは、生成された表にも現れません。' });
    }
    if (res.unreachable) {
      msgs.push({ text: res.unreachable.toLocaleString() + ' 通りは、禁則が重なって成立するテストケースを作れませんでした。', sub: '別の禁則と矛盾している可能性があります。禁則の書きすぎを見直してください。' });
    }
    if (res.capped) {
      msgs.push({ text: '件数が上限（' + MAX_TESTS.toLocaleString() + '件）に達したため打ち切りました。', sub: '因子か水準を減らしてください。', error: true });
    }
    showMessages(msgs);

    renderTable(headers, rows, withNo);
    renderOut();
  }

  function stat(v, l, sub, cls) {
    return '<div class="pw-stat' + (cls ? ' ' + cls : '') + '"><span class="pw-stat-v">' + esc(v) +
      '</span><span class="pw-stat-l">' + esc(l) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></div>';
  }

  function renderTable(headers, rows, withNo) {
    var thead = $('pw-table').querySelector('thead');
    var tbody = $('pw-table').querySelector('tbody');
    thead.innerHTML = '<tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
    tbody.innerHTML = rows.map(function (r) {
      return '<tr>' + r.map(function (c, i) {
        return '<td' + (withNo && i === 0 ? ' class="pw-no"' : '') + '>' + esc(c) + '</td>';
      }).join('') + '</tr>';
    }).join('');
  }

  function renderOut() {
    if (!state.rows.length) return;
    $('pw-out').value = format($('pw-format').value, state.headers, state.rows);
    $('pw-info').textContent = state.rows.length + '件 × ' + state.headers.length + '列';
  }

  /* ---------- ちいさな道具 ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function trunc(s) { return s.length > 24 ? s.slice(0, 24) + '…' : s; }
  function uniq(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

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

  $('pw-gen').addEventListener('click', run);
  $('pw-format').addEventListener('change', renderOut);
  $('pw-no').addEventListener('change', function () { if (state.rows.length) run(); });
  $('pw-strength').addEventListener('change', function () { if (state.rows.length) run(); });

  $('pw-copy').addEventListener('click', function () {
    if (!$('pw-out').value) return;
    copyText($('pw-out').value, this);
  });

  $('pw-dl').addEventListener('click', function () {
    if (!$('pw-out').value) return;
    var kind = $('pw-format').value;
    var ext = kind === 'md' ? 'md' : kind === 'json' ? 'json' : kind;
    var blob = new Blob([$('pw-out').value], { type: 'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pairwise-' + new Date().toLocaleDateString('sv-SE') + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  Array.prototype.forEach.call(document.querySelectorAll('.pw-preset'), function (btn) {
    btn.addEventListener('click', function () {
      var p = PRESETS[btn.dataset.preset];
      if (!p) return;
      $('pw-factors').value = p.factors;
      $('pw-forbid').value = p.forbid;
      run();
    });
  });

  // 初期表示は「Webサービス」のプリセットで動いている状態にする
  $('pw-factors').value = PRESETS.web.factors;
  $('pw-forbid').value = PRESETS.web.forbid;
  run();
})();
