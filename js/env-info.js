/* ============================================================
   env-info.js — バグ報告の環境情報コピー
   開いている端末のブラウザ・OS・画面などを読み取り、バグ票に貼れる記法で出す。
   読み取りも整形もブラウザ内だけ。サーバー送信は一切しない。
   User-Agent は意図的にぼかされているので、分からないものは推測で埋めずに「分からない」と書く。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('ei-rows')) return;

  var ua = navigator.userAgent;
  var uad = navigator.userAgentData;
  var high = null; // Chrome・Edge だけが返す詳しい情報

  function pad(n) { return String(n).padStart(2, '0'); }
  function offsetText(d) {
    var m = -d.getTimezoneOffset(), s = m >= 0 ? '+' : '-';
    m = Math.abs(m);
    return 'UTC' + s + pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }
  function mq(q) { return window.matchMedia && window.matchMedia(q).matches; }

  /* ---------- ブラウザ ---------- */

  function browser() {
    // アプリ内ブラウザは、中身が Chrome や Safari でも挙動が違うので名前を優先する
    var inApp = [[/\bLine\/([\d.]+)/, 'LINEアプリ内ブラウザ'], [/Instagram ([\d.]+)/, 'Instagramアプリ内ブラウザ'], [/FBAV\/([\d.]+)/, 'Facebookアプリ内ブラウザ']];
    for (var i = 0; i < inApp.length; i++) {
      var a = ua.match(inApp[i][0]);
      if (a) return { value: inApp[i][1] + ' ' + a[1], note: 'アプリの中で開いたページは、通常のブラウザと Cookie やログイン状態が分かれています' };
    }
    if (high && high.fullVersionList && high.fullVersionList.length) {
      var list = high.fullVersionList.filter(function (b) { return !/Not.?A.?Brand/i.test(b.brand); });
      var named = list.filter(function (b) { return b.brand !== 'Chromium'; });
      var pick = named[0] || list[0];
      if (pick) return { value: pick.brand + ' ' + pick.version };
    }
    var rules = [
      [/EdgA?\/([\d.]+)/, 'Microsoft Edge'], [/EdgiOS\/([\d.]+)/, 'Microsoft Edge（iOS）'],
      [/OPR\/([\d.]+)/, 'Opera'], [/SamsungBrowser\/([\d.]+)/, 'Samsung Internet'],
      [/CriOS\/([\d.]+)/, 'Google Chrome（iOS）'], [/FxiOS\/([\d.]+)/, 'Firefox（iOS）'],
      [/Firefox\/([\d.]+)/, 'Firefox'], [/Chrome\/([\d.]+)/, 'Google Chrome'],
      [/Version\/([\d.]+).*Safari/, 'Safari'],
    ];
    for (var j = 0; j < rules.length; j++) {
      var m = ua.match(rules[j][0]);
      if (m) {
        var note = /iPhone|iPad|iPod/.test(ua) || isIpadAsMac() ? 'iPhone・iPad のブラウザは、Chrome や Firefox でも中身は Safari と同じ WebKit です' : '';
        return { value: rules[j][1] + ' ' + m[1], note: note };
      }
    }
    return { value: '判定できません', note: 'User-Agent をそのまま下に載せています' };
  }

  /* ---------- OS ---------- */

  function isIpadAsMac() { return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1; }

  function os() {
    var p = (high && high.platform) || (uad && uad.platform) || '';
    var v = high && high.platformVersion;
    if (p && v) {
      var major = parseInt(v, 10);
      if (p === 'Windows') {
        // Chrome の platformVersion は Windows 11 で 13 以上、10 で 1〜12
        if (major >= 13) return { value: 'Windows 11' };
        if (major > 0) return { value: 'Windows 10' };
        return { value: 'Windows 7 / 8 / 8.1' };
      }
      if (p === 'macOS') return { value: 'macOS ' + v };
      if (p === 'Android') return { value: 'Android ' + v };
      if (p === 'Chrome OS') return { value: 'ChromeOS ' + v };
      return { value: p + ' ' + v };
    }
    var m;
    if (/Windows NT 10\.0/.test(ua)) return { value: 'Windows 10 または 11', note: 'このブラウザでは見分けられません（User-Agent はどちらも「Windows NT 10.0」）。Chrome か Edge で開くと判定できます' };
    if ((m = ua.match(/Windows NT (6\.[0-3])/))) return { value: { '6.3': 'Windows 8.1', '6.2': 'Windows 8', '6.1': 'Windows 7', '6.0': 'Windows Vista' }[m[1]] };
    if ((m = ua.match(/(?:iPhone|iPod).*? OS (\d+)_(\d+)(?:_(\d+))?/))) return { value: 'iOS ' + m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '') };
    if ((m = ua.match(/iPad.*? OS (\d+)_(\d+)(?:_(\d+))?/))) return { value: 'iPadOS ' + m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '') };
    if (isIpadAsMac()) return { value: 'iPadOS（Macと名乗っています）', note: 'iPad の Safari は既定でパソコン向け表示のために Mac を名乗ります。バージョンは Safari のバージョンから推し量ってください' };
    if ((m = ua.match(/Mac OS X (\d+)[._](\d+)(?:[._](\d+))?/))) {
      var ver = m[1] + '.' + m[2] + (m[3] ? '.' + m[3] : '');
      if (ver === '10.15.7' || ver === '10.15') return { value: 'macOS（バージョンはブラウザが隠しています）', note: 'Safari・Firefox・Chrome は User-Agent の macOS を 10.15.7 に固定しています' };
      return { value: 'macOS ' + ver };
    }
    if (/Android 10; K\b/.test(ua)) return { value: 'Android（バージョンはブラウザが隠しています）' };
    if ((m = ua.match(/Android (\d+(?:\.\d+)*)/))) return { value: 'Android ' + m[1] };
    if (/CrOS/.test(ua)) return { value: 'ChromeOS' };
    if (/Linux/.test(ua)) return { value: 'Linux' };
    return { value: '判定できません' };
  }

  /* ---------- 端末 ---------- */

  function device() {
    var model = high && high.model ? '（' + high.model + '）' : '';
    var mobile = uad ? uad.mobile : /Mobi|iPhone|iPod/.test(ua);
    if (/iPad/.test(ua) || isIpadAsMac()) return { value: 'タブレット（iPad）' };
    if (mobile) return { value: 'スマホ' + model };
    if (/Android/.test(ua)) return { value: 'タブレット' + model };
    var arch = high && high.architecture ? '（' + high.architecture + (high.bitness ? ' ' + high.bitness + 'bit' : '') + '）' : '';
    return { value: 'パソコン' + arch };
  }

  /* ---------- 表に出す項目 ---------- */
  // 項目ごとに「貼る」チェックの状態を覚えておく（読み取り直しても外したものは外したまま）
  var off = {};

  function collect() {
    var now = new Date();
    var dpr = window.devicePixelRatio || 1;
    var sw = screen.width, sh = screen.height;
    var o = screen.orientation && screen.orientation.type;
    var storage;
    try { localStorage.setItem('__beetle_probe', '1'); localStorage.removeItem('__beetle_probe'); storage = '使える'; }
    catch (e) { storage = '使えない（プライベートブラウズや設定で制限されています）'; }
    var conn = navigator.connection;
    var rows = [
      ['browser', 'ブラウザ', browser()],
      ['os', 'OS', os()],
      ['device', '端末', device()],
      ['screen', '画面の解像度', { value: sw + ' × ' + sh + '（実ピクセル ' + Math.round(sw * dpr) + ' × ' + Math.round(sh * dpr) + '）' }],
      ['viewport', 'ブラウザの表示領域', { value: window.innerWidth + ' × ' + window.innerHeight, note: 'ウィンドウの大きさを変えると変わります。レイアウト崩れの報告ではこちらが大事です' }],
      ['dpr', '拡大率（devicePixelRatio）', { value: String(Math.round(dpr * 100) / 100), note: 'OS の表示スケールとブラウザのズームを掛けた値です' }],
      ['orientation', '画面の向き', { value: o ? (o.indexOf('portrait') === 0 ? '縦' : '横') : (window.innerHeight > window.innerWidth ? '縦' : '横') }],
      ['lang', '言語', { value: (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]).join(', ') }],
      ['tz', 'タイムゾーン', { value: (Intl.DateTimeFormat().resolvedOptions().timeZone || '不明') + '（' + offsetText(now) + '）' }],
      ['time', '確認した日時', { value: now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + '（' + offsetText(now) + '）' }],
      ['cookie', 'Cookie', { value: navigator.cookieEnabled ? '有効' : '無効' }],
      ['storage', 'localStorage', { value: storage }],
      ['touch', 'タッチ操作', { value: navigator.maxTouchPoints > 0 ? 'できる（同時に' + navigator.maxTouchPoints + '点まで）' : 'できない' }],
      ['theme', 'ダークモード', { value: mq('(prefers-color-scheme: dark)') ? 'オン' : 'オフ' }],
      ['motion', '視差効果を減らす', { value: mq('(prefers-reduced-motion: reduce)') ? 'オン' : 'オフ', note: 'オンだとアニメーションを止めるサイトがあります' }],
      ['net', '回線', { value: (navigator.onLine ? 'オンライン' : 'オフライン') + (conn && conn.effectiveType ? '（速さの目安 ' + conn.effectiveType + '）' : '') }],
      ['ua', 'User-Agent', { value: ua }],
    ];
    var url = $('ei-url').value.trim();
    if (url) rows.unshift(['url', '不具合が出たページ', { value: url }]);
    return rows.map(function (r) { return { key: r[0], label: r[1], value: r[2].value, note: r[2].note || '' }; });
  }

  /* ---------- 記法ごとの整形 ---------- */

  var FMT = {
    md: {
      h: function (t) { return '## ' + t; },
      ol: function (i) { return i + '. '; },
      table: function (rows) {
        var esc = function (s) { return String(s).replace(/\|/g, '\\|'); };
        return ['| 項目 | 値 |', '| --- | --- |'].concat(rows.map(function (r) { return '| ' + esc(r.label) + ' | ' + esc(r.value) + ' |'; })).join('\n');
      },
    },
    backlog: {
      h: function (t) { return '** ' + t; },
      ol: function () { return '+ '; },
      table: function (rows) {
        var esc = function (s) { return String(s).replace(/\|/g, '／'); };
        return ['|項目|値|h'].concat(rows.map(function (r) { return '|' + esc(r.label) + '|' + esc(r.value) + '|'; })).join('\n');
      },
    },
    jira: {
      h: function (t) { return 'h2. ' + t; },
      ol: function () { return '# '; },
      table: function (rows) {
        var esc = function (s) { return String(s).replace(/\|/g, '／'); };
        return ['||項目||値||'].concat(rows.map(function (r) { return '|' + esc(r.label) + '|' + esc(r.value) + '|'; })).join('\n');
      },
    },
    redmine: {
      h: function (t) { return 'h2. ' + t; },
      ol: function () { return '# '; },
      table: function (rows) {
        var esc = function (s) { return String(s).replace(/\|/g, '／'); };
        return ['|_. 項目 |_. 値 |'].concat(rows.map(function (r) { return '| ' + esc(r.label) + ' | ' + esc(r.value) + ' |'; })).join('\n');
      },
    },
    text: {
      h: function (t) { return '【' + t + '】'; },
      ol: function (i) { return i + '. '; },
      table: function (rows) { return rows.map(function (r) { return r.label + '：' + r.value; }).join('\n'); },
    },
  };

  function build(rows) {
    var f = FMT[$('ei-format').value] || FMT.md;
    var picked = rows.filter(function (r) { return !off[r.key]; });
    var env = f.table(picked);
    if (!$('ei-template').checked) return env;
    return [
      f.h('概要'), '', '',
      f.h('再現手順'), f.ol(1), f.ol(2), f.ol(3), '',
      f.h('期待する結果'), '', '',
      f.h('実際の結果'), '', '',
      f.h('起きる頻度'), '毎回 ／ ときどき ／ 1回だけ', '',
      f.h('環境'), env,
    ].join('\n');
  }

  /* ---------- 描画 ---------- */

  var current = [];

  function render() {
    current = collect();
    var tb = $('ei-rows');
    tb.textContent = '';
    current.forEach(function (r) {
      var tr = document.createElement('tr');
      if (off[r.key]) tr.className = 'is-off';
      var c0 = document.createElement('td'); c0.className = 'ei-c-on';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = !off[r.key]; cb.setAttribute('aria-label', r.label + 'を貼る');
      cb.addEventListener('change', function () { off[r.key] = !cb.checked; tr.classList.toggle('is-off', !cb.checked); output(); });
      c0.appendChild(cb);
      var c1 = document.createElement('td'); c1.className = 'ei-c-label'; c1.textContent = r.label;
      var c2 = document.createElement('td'); c2.className = 'ei-c-val';
      var v = document.createElement('span'); v.className = 'ei-val'; v.textContent = r.value; c2.appendChild(v);
      if (r.note) { var n = document.createElement('span'); n.className = 'ei-note'; n.textContent = r.note; c2.appendChild(n); }
      tr.appendChild(c0); tr.appendChild(c1); tr.appendChild(c2);
      tb.appendChild(tr);
    });
    output();
  }

  function output() {
    $('ei-out').value = build(current);
    var n = current.filter(function (r) { return !off[r.key]; }).length;
    $('ei-info').textContent = current.length + '項目のうち ' + n + '項目を貼ります';
  }

  function copyText(text, btn, label) {
    var done = function () { btn.textContent = 'コピーしました'; btn.classList.add('is-done'); setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* 選択状態のまま残すので手でコピーできる */ }
      document.body.removeChild(ta);
    }
  }

  $('ei-format').addEventListener('change', output);
  $('ei-template').addEventListener('change', output);
  $('ei-url').addEventListener('input', render);
  $('ei-refresh').addEventListener('click', render);
  $('ei-copy').addEventListener('click', function () {
    render(); // 日時とウィンドウの大きさをコピーする瞬間の値にする
    copyText($('ei-out').value, $('ei-copy'), 'コピー');
  });
  $('ei-share-copy').addEventListener('click', function () {
    copyText($('ei-share-url').textContent, $('ei-share-copy'), 'URLをコピー');
  });

  var timer = null;
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(render, 200); });

  render();
  if (uad && uad.getHighEntropyValues) {
    uad.getHighEntropyValues(['platform', 'platformVersion', 'fullVersionList', 'model', 'architecture', 'bitness'])
      .then(function (h) { high = h; render(); }, function () {});
  }
})();
