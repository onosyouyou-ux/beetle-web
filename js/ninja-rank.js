/* 忍者ランク（#173・2026-10-16）。
   各修行の むずかしさ の最後に「ランクに ちょうせん」を置き、合格すると ランクが1つ上がる（しょうだん しけん）。
   10問は いまのランクに合わせて出す：1〜4問は いまの段（ふつう）／5〜8問は1つ上（むずかしい）／9〜10問は2つ上（なんもん）。
   どの段を出すかは 各アプリが TIERS を持つ。ここは ランク表・合否・保存・絵の窓 だけを受け持つ。

   合格の条件（上がる先のランクで決まる）：〜18 は 8問／19・20 は 9問／21〜23 は 全問／24 は 全問＋速い
   全問正解で速ければ 2つ上がる（とびきゅう）。不合格でも 下がらない。
   きろくは この端末の localStorage だけ（nk-rank = { tokei:{ r:5, at:'2026-10-16' }, … }）。使えないときは 0 のまま */
(function (global) {
  'use strict';

  var RANKS = [
    ['村人', 'むらびと'], ['忍者見習い', 'にんじゃみならい'], ['弟子入り', 'でしいり'], ['雑用係', 'ざつようがかり'],
    ['下忍・初段', 'げにん・しょだん'], ['下忍・二段', 'げにん・にだん'], ['下忍・三段', 'げにん・さんだん'],
    ['中忍・初段', 'ちゅうにん・しょだん'], ['中忍・二段', 'ちゅうにん・にだん'], ['中忍・三段', 'ちゅうにん・さんだん'],
    ['上忍・初段', 'じょうにん・しょだん'], ['上忍・二段', 'じょうにん・にだん'], ['上忍・三段', 'じょうにん・さんだん'],
    ['斥候', 'せっこう'], ['隠密', 'おんみつ'], ['影武者', 'かげむしゃ'], ['忍頭', 'しのびがしら'], ['副頭領', 'ふくとうりょう'],
    ['頭領', 'とうりょう'], ['里長', 'さとおさ'], ['伝説の忍', 'でんせつのしのび'], ['天下無双', 'てんかむそう'],
    ['神出鬼没', 'しんしゅつきぼつ'], ['忍神', 'にんしん']
  ];
  var MAX = RANKS.length;
  var KEY = 'nk-rank';
  // 出題の段（0〜5）。いまのランクで決める
  var TIER_TOP = [4, 7, 10, 13, 18, 24];
  var BANDS = ['ふつう', 'むずかしい', 'なんもん'];
  var BAND_OF = [0, 0, 0, 0, 1, 1, 1, 1, 2, 2];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function save(all) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {}
  }
  function get(app) {
    var x = load()[app];
    return x && x.r > 0 ? Math.min(x.r, MAX) : 0;
  }
  // いちばん上のランクと、それを とった修行（同じなら あとで とったほう）
  function best() {
    var all = load(), out = null;
    Object.keys(all).forEach(function (app) {
      var x = all[app];
      if (!x || !(x.r > 0)) return;
      if (!out || x.r > out.r || (x.r === out.r && (x.at || '') > (out.at || ''))) out = { app: app, r: Math.min(x.r, MAX), at: x.at };
    });
    return out;
  }
  function reset(app) {
    var all = load();
    delete all[app];
    save(all);
  }
  function name(r) { return r > 0 ? RANKS[r - 1][0] : ''; }
  function yomi(r) { return r > 0 ? RANKS[r - 1][1] : ''; }
  function img(r) { return '/assets/images/ninja/ranks/rank-' + (r < 10 ? '0' : '') + r + '.webp'; }

  function tierOf(r) {
    var base = Math.max(r, 1);
    for (var i = 0; i < TIER_TOP.length; i++) if (base <= TIER_TOP[i]) return i;
    return TIER_TOP.length - 1;
  }
  /* 10問ぶんの段を返す。tiers は アプリの段の表（6段。長さが足りなければ 最後の段をくり返す）。
     返すのは [{ band:0〜2, pick:その段の中から1つ選んだもの }, …] */
  function plan(app, tiers) {
    var t = tierOf(get(app));
    return BAND_OF.map(function (band) {
      var pool = tiers[Math.min(t + band, tiers.length - 1)];
      return { band: band, pick: pool[Math.floor(Math.random() * pool.length)] };
    });
  }
  function need(target) { return target <= 18 ? 8 : target <= 20 ? 9 : 10; }

  /* しけんの けっか。o = { correct, total, fast（速さの条件を みたしたか） }
     返す：{ from, to, target, passed, skip, short（あと何問で合格だったか） } */
  function exam(app, o) {
    var from = get(app);
    var base = Math.max(from, 1);
    var target = Math.min(base + 1, MAX);
    var req = Math.min(need(target), o.total);
    var all = o.correct >= o.total;
    var passed = base < MAX && o.correct >= req && (target < MAX || (all && o.fast));
    var skip = passed && all && o.fast && target < MAX;
    var to = passed ? target + (skip ? 1 : 0) : base;
    to = Math.max(Math.min(to, MAX), from);
    var store = load();
    store[app] = { r: to, at: new Date().toLocaleDateString('sv-SE') };
    save(store);
    return { from: from, to: to, target: target, passed: passed, skip: skip, short: Math.max(0, req - o.correct) };
  }

  /* ---------- 絵の窓 ----------
     <dialog> を1つ使い回す。問題の窓（NkModal）が開いていても その上に重なる。
     opts.app を渡すと「さいしょから やりなおす」を出す（押すと 確かめてから けす）。opts.onReset はけしたあと */
  var dlg = null;
  function close() { if (dlg && dlg.open) dlg.close(); }
  function show(r, opts) {
    opts = opts || {};
    if (!(r > 0)) return;
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'nk-rank-dlg';
      dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
      document.body.appendChild(dlg);
    }
    dlg.innerHTML = '';
    var pic = document.createElement('img');
    pic.className = 'nk-rank-dlg-img';
    pic.src = img(r);
    pic.width = 640;
    pic.height = 640;
    pic.alt = 'ランク ' + r + '：' + name(r) + '（' + yomi(r) + '）';
    dlg.appendChild(pic);

    var row = document.createElement('div');
    row.className = 'nk-rank-dlg-row';
    if (opts.app) {
      var rs = document.createElement('button');
      rs.type = 'button';
      rs.className = 'nk-rank-reset';
      rs.textContent = 'さいしょから やりなおす';
      rs.addEventListener('click', function () {
        // 押しまちがいで けさないよう、もう1回 きく
        row.innerHTML = '';
        var q = document.createElement('p');
        q.className = 'nk-rank-ask';
        q.textContent = 'ランクを けして 村人から やりなおす？';
        var yes = document.createElement('button');
        yes.type = 'button';
        yes.className = 'nk-rank-reset is-yes';
        yes.textContent = 'けす';
        yes.addEventListener('click', function () {
          reset(opts.app);
          close();
          if (opts.onReset) opts.onReset();
        });
        var no = document.createElement('button');
        no.type = 'button';
        no.className = 'nk-rank-close';
        no.textContent = 'やめる';
        no.addEventListener('click', function () { show(r, opts); });
        row.appendChild(q);
        row.appendChild(yes);
        row.appendChild(no);
        no.focus();
      });
      row.appendChild(rs);
    }
    var cl = document.createElement('button');
    cl.type = 'button';
    cl.className = 'nk-rank-close';
    cl.textContent = 'とじる';
    cl.addEventListener('click', close);
    row.appendChild(cl);
    dlg.appendChild(row);
    if (!dlg.open) dlg.showModal();
    cl.focus();
  }

  /* 「あなたのランク：○○」のテキストリンク。まだ ランクが ないときは 押せない文字だけ。
     onReset は やりなおしたあと（メニューを描きなおす など） */
  function link(app, onReset) {
    var r = get(app);
    var p = document.createElement('p');
    p.className = 'nk-rank-mine';
    if (!r) {
      p.textContent = 'あなたのランク：まだ なし';
      return p;
    }
    p.appendChild(document.createTextNode('あなたのランク：'));
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nk-rank-link';
    b.textContent = name(r);
    b.addEventListener('click', function () { show(r, { app: app, onReset: onReset }); });
    p.appendChild(b);
    return p;
  }

  /* けっか画面の ランクの欄。res は exam() の返り値、ok は 段ごとの [せいかい, もんだい数]、sec は かかった秒 */
  function result(res, ok, sec) {
    var box = document.createElement('div');
    box.className = 'nk-rank-result' + (res.passed ? ' is-up' : '');
    var pic = document.createElement('button');
    pic.type = 'button';
    pic.className = 'nk-rank-result-pic';
    pic.setAttribute('aria-label', name(res.to) + 'の 絵を おおきく みる');
    var im = document.createElement('img');
    im.src = img(res.to);
    im.width = 640;
    im.height = 640;
    im.alt = '';
    pic.appendChild(im);
    pic.addEventListener('click', function () { show(res.to); });
    box.appendChild(pic);

    var txt = document.createElement('div');
    txt.className = 'nk-rank-result-text';
    var head = document.createElement('p');
    head.className = 'nk-rank-result-head';
    head.textContent = res.passed ? (res.skip ? 'とびきゅう ごうかく！' : 'ごうかく！') : 'もう すこし！';
    txt.appendChild(head);
    var line = document.createElement('p');
    line.className = 'nk-rank-result-name';
    var rb = document.createElement('ruby');
    rb.appendChild(document.createTextNode(name(res.to)));
    var rt = document.createElement('rt');
    rt.textContent = yomi(res.to);
    rb.appendChild(rt);
    line.appendChild(rb);
    line.appendChild(document.createTextNode(res.passed ? ' に なった！' : ' のまま'));
    txt.appendChild(line);
    if (!res.passed && res.to < MAX) {
      var nx = document.createElement('p');
      nx.className = 'nk-rank-result-next';
      nx.textContent = res.short > 0
        ? 'あと ' + res.short + 'もん で ' + name(res.target) + ' に ごうかく！'
        : 'ぜんもん せいかいで、もっと はやく とけたら ' + name(res.target) + '！';
      txt.appendChild(nx);
    }
    var dl = document.createElement('dl');
    dl.className = 'nk-rank-result-stats';
    ok.forEach(function (x, i) {
      if (!x[1]) return;
      var dt = document.createElement('dt');
      dt.textContent = BANDS[i];
      var dd = document.createElement('dd');
      dd.textContent = x[1] + 'もん中 ' + x[0] + 'もん せいかい';
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    var dt2 = document.createElement('dt');
    dt2.textContent = 'かかった じかん';
    var dd2 = document.createElement('dd');
    var m = Math.floor(sec / 60), s = Math.round(sec % 60);
    if (s === 60) { m++; s = 0; }
    dd2.textContent = (m ? m + 'ふん' : '') + s + 'びょう';
    dl.appendChild(dt2);
    dl.appendChild(dd2);
    txt.appendChild(dl);
    box.appendChild(txt);
    return box;
  }

  global.NkRank = {
    RANKS: RANKS, MAX: MAX, BANDS: BANDS,
    get: get, best: best, reset: reset, name: name, yomi: yomi, img: img,
    plan: plan, exam: exam, show: show, link: link, result: result
  };
})(window);
