/* ============================================================
   contrast.js — コントラスト比チェッカー
   WCAG 2.1 の相対輝度でコントラスト比を出し、AA・AAA を判定する。
   落ちたときは色相・彩度を保ったまま明度だけ動かして通る色を探す。
   計算はすべてブラウザ内。サーバー送信は一切しない。
   ============================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  if (!$('ct-bg')) return;

  var SWATCHES = [
    { name: 'BEETLEの地色 × 本文', bg: '#f7f5f0', fg: '#1a1a18' },
    { name: 'BEETLEの地色 × 補助文字', bg: '#f7f5f0', fg: '#888780' },
    { name: 'アクセント × 白', bg: '#c0634c', fg: '#ffffff' },
    { name: 'オレンジ × 白', bg: '#e85a1a', fg: '#ffffff' },
    { name: 'ダーク × 白', bg: '#1e1e2e', fg: '#ffffff' },
    { name: '白 × 薄いグレー', bg: '#ffffff', fg: '#aaaaaa' }
  ];

  var LEVELS = [
    { key: 'aa-normal', label: '通常サイズの文字（AA）', need: 4.5 },
    { key: 'aaa-normal', label: '通常サイズの文字（AAA）', need: 7 },
    { key: 'aa-large', label: '大きい文字（AA）', need: 3 },
    { key: 'aaa-large', label: '大きい文字（AAA）', need: 4.5 },
    { key: 'ui', label: 'UI部品・図（AA）', need: 3 }
  ];

  /* ---------- 色の変換 ---------- */

  function parseHex(s) {
    s = String(s).trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
  }
  function toHex(rgb) {
    return '#' + rgb.map(function (v) {
      return ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
    }).join('');
  }
  // sRGB(0-255) → 線形RGB(0-1)
  function lin(v) {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function unlin(v) {
    v = Math.max(0, Math.min(1, v));
    return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
  }
  function luminance(rgb) {
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  }
  function ratio(a, b) {
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function rgbToHsl(rgb) {
    var r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    var h = 0, s = 0, l = (mx + mn) / 2;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h /= 6;
    }
    return [h, s, l];
  }
  function hslToRgb(hsl) {
    var h = hsl[0], s = hsl[1], l = hsl[2];
    if (!s) { var v = l * 255; return [v, v, v]; }
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    var f = function (t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }

  /* ---------- 色覚シミュレーション（Viénot らの近似行列） ---------- */

  var CVD = {
    protan: { name: '1型（P型・赤が見えにくい）', m: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998] },
    deutan: { name: '2型（D型・緑が見えにくい）', m: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.011820, 0.042940, 0.968881] },
    tritan: { name: '3型（T型・青が見えにくい）', m: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.303900] }
  };

  function simulate(rgb, key) {
    var m = CVD[key].m;
    var r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
    return [
      unlin(m[0] * r + m[1] * g + m[2] * b),
      unlin(m[3] * r + m[4] * g + m[5] * b),
      unlin(m[6] * r + m[7] * g + m[8] * b)
    ];
  }

  /* ---------- 通る色を探す ---------- */

  // 色相・彩度は保ったまま明度だけを動かし、目標比を満たす最も近い色を返す
  function suggest(target, other, need) {
    var hsl = rgbToHsl(target);
    var best = null;
    for (var dir = -1; dir <= 1; dir += 2) {
      for (var step = 1; step <= 100; step++) {
        var l = hsl[2] + dir * step / 100;
        if (l < 0 || l > 1) break;
        var cand = hslToRgb([hsl[0], hsl[1], l]);
        if (ratio(cand, other) >= need) {
          var moved = Math.abs(l - hsl[2]);
          if (!best || moved < best.moved) best = { rgb: cand, moved: moved, dir: dir };
          break;
        }
      }
    }
    return best;
  }

  /* ---------- 画面への反映 ---------- */

  function render() {
    var bg = parseHex($('ct-bg-hex').value);
    var fg = parseHex($('ct-fg-hex').value);
    if (!bg || !fg) {
      $('ct-ratio').textContent = '—';
      $('ct-judge').innerHTML = '<div class="ct-note is-error">色コードの形式が正しくありません（<code>#RRGGBB</code> または <code>#RGB</code>）。</div>';
      return;
    }

    var r = ratio(fg, bg);
    var shown = Math.round(r * 100) / 100;
    $('ct-ratio').textContent = shown.toFixed(2);
    $('ct-ratio').className = 'ct-ratio ' + (r >= 4.5 ? 'is-pass' : r >= 3 ? 'is-warn' : 'is-fail');

    $('ct-judge').innerHTML = LEVELS.map(function (lv) {
      var ok = r >= lv.need;
      return '<div class="ct-j' + (ok ? ' is-ok' : '') + '">' +
        '<span class="ct-j-mark">' + (ok ? '合格' : '不足') + '</span>' +
        '<span class="ct-j-l">' + lv.label + '</span>' +
        '<span class="ct-j-n">' + lv.need.toFixed(1) + ' : 1</span></div>';
    }).join('');

    var pv = $('ct-preview');
    pv.style.background = toHex(bg);
    pv.style.color = toHex(fg);

    // 通る色の提案（AA 4.5 を基準にする）
    if (r >= 4.5) {
      $('ct-fix').innerHTML = '<div class="ct-note is-ok">通常サイズの文字でもAA（4.5:1）を満たしています。' +
        (r >= 7 ? 'AAA（7:1）も満たしています。' : '') + '</div>';
    } else {
      var sFg = suggest(fg, bg, 4.5);
      var sBg = suggest(bg, fg, 4.5);
      var cards = [];
      if (sFg) cards.push(fixCard('文字色を変える', toHex(fg), toHex(sFg.rgb), toHex(bg), ratio(sFg.rgb, bg), sFg.dir));
      if (sBg) cards.push(fixCard('背景色を変える', toHex(bg), toHex(sBg.rgb), toHex(fg), ratio(sBg.rgb, fg), sBg.dir, true));
      $('ct-fix').innerHTML =
        '<div class="ct-note is-error">通常サイズの文字に必要な 4.5:1 に届いていません（現在 ' + shown.toFixed(2) + '）。</div>' +
        (cards.length
          ? '<h3 class="ct-fix-hd">色みを保ったまま通す</h3><div class="ct-fix-cards">' + cards.join('') + '</div>'
          : '<div class="ct-note">明度を動かすだけでは 4.5:1 に届きません。色相か彩度も変える必要があります。</div>');
    }

    // 色覚シミュレーション
    $('ct-cvd').innerHTML = ['normal', 'protan', 'deutan', 'tritan'].map(function (key) {
      var sbg = key === 'normal' ? bg : simulate(bg, key);
      var sfg = key === 'normal' ? fg : simulate(fg, key);
      var name = key === 'normal' ? '一般的な色覚' : CVD[key].name;
      return '<div class="ct-cvd-card"><div class="ct-cvd-name">' + esc(name) + '</div>' +
        '<div class="ct-cvd-pv" style="background:' + toHex(sbg) + ';color:' + toHex(sfg) + '">あア亜 Aa123</div>' +
        '<div class="ct-cvd-hex"><span>' + esc(toHex(sbg)) + '</span><span>' + esc(toHex(sfg)) + '</span></div>' +
        '<div class="ct-cvd-r">コントラスト比 ' + ratio(sfg, sbg).toFixed(2) + '</div></div>';
    }).join('');
  }

  function fixCard(title, from, to, against, newRatio, dir, isBg) {
    return '<div class="ct-fix-card">' +
      '<div class="ct-fix-t">' + esc(title) + '<span>' + (dir < 0 ? '暗く' : '明るく') + 'する</span></div>' +
      '<div class="ct-fix-swap"><code>' + esc(from) + '</code><span>→</span><code>' + esc(to) + '</code></div>' +
      '<div class="ct-fix-pv" style="background:' + (isBg ? to : against) + ';color:' + (isBg ? against : to) + '">この色なら読めます</div>' +
      '<div class="ct-fix-r">新しい比率 ' + newRatio.toFixed(2) + ' : 1</div>' +
      '<button type="button" class="ct-apply" data-target="' + (isBg ? 'bg' : 'fg') + '" data-v="' + esc(to) + '">この色にする</button>' +
      '</div>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function setColor(which, hex) {
    $('ct-' + which).value = hex;
    $('ct-' + which + '-hex').value = hex;
  }

  /* ---------- 配線 ---------- */

  ['bg', 'fg'].forEach(function (w) {
    $('ct-' + w).addEventListener('input', function () {
      $('ct-' + w + '-hex').value = this.value;
      render();
    });
    $('ct-' + w + '-hex').addEventListener('input', function () {
      var rgb = parseHex(this.value);
      if (rgb) $('ct-' + w).value = toHex(rgb);
      render();
    });
  });

  $('ct-swap').addEventListener('click', function () {
    var bg = $('ct-bg-hex').value, fg = $('ct-fg-hex').value;
    setColor('bg', fg);
    setColor('fg', bg);
    render();
  });

  $('ct-swatches').innerHTML = SWATCHES.map(function (s) {
    return '<button type="button" class="ct-swatch" data-bg="' + s.bg + '" data-fg="' + s.fg + '" title="' + esc(s.name) + '">' +
      '<span class="ct-swatch-chip" style="background:' + s.bg + ';color:' + s.fg + '">Aa</span>' +
      '<span class="ct-swatch-n">' + esc(s.name) + '</span></button>';
  }).join('');

  $('ct-swatches').addEventListener('click', function (e) {
    var b = e.target.closest('.ct-swatch');
    if (!b) return;
    setColor('bg', b.dataset.bg);
    setColor('fg', b.dataset.fg);
    render();
  });

  $('ct-fix').addEventListener('click', function (e) {
    var b = e.target.closest('.ct-apply');
    if (!b) return;
    setColor(b.dataset.target, b.dataset.v);
    render();
  });

  render();
})();
