/* ============================================================
   hanwake.js — 班分けメーカー（先生向け）
   名簿と配慮からグループ分けを作る。席替えメーカーの姉妹ツールで、
   CSV取り込み・名前の読み取り・共通CSVは class-roster.js を共有する。
   計算はすべてブラウザ内で完結し、名簿はサーバーに送らない。

   ■ 2026-10-04 作り直し（席替えメーカーと同じ型）
   ・操作の順番を見せる：手順バー（1 班の数 → 2 名簿と配慮 → 3 班分け → 4 手直し・印刷）
     ＋見出しの番号＋オレンジで塗るボタンは手順ごとに1つ
   ・名簿は1人1行。配慮は行ごとに配慮の列の「＋ 追加」から 別々・同じ・ちらす・リーダー を選ぶ（1人に何個でも）
   ・結果は1の枠（空の班の枠）にそのまま出す。子はドラッグかタップで入れかえ・移動できる
   ・リーダー：リーダーにした子を各班に1人ずつ配り、班のいちばん上に出す

   ■ 保存はCSVファイルだけ（2026-08-24決定）
   ブラウザ保存は端末ごとに分かれて共有できず、「名簿は一切保存しません」と言い切れなくなるため。
   ============================================================ */
(function () {
  'use strict';

  var R = window.BeetleRoster;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('hw-list') || !R) return;

  var ATTEMPTS = 60;         // ランダムに置き直す回数（1回ごとに下の入れ替えで詰める）
  var IMPROVE_ROUNDS = 1200; // 1回の割り当てに対する入れ替えの試行回数
  var START_ROWS = 10;       // 最初に出しておく行の数
  var SCATTER_SETS = ['A', 'B', 'C', 'D', 'E'];   // 「ちらす」のまとまりの記号

  var KIND_LABEL = { '': '配慮をえらぶ', apart: '別々', together: '同じ', scatter: 'ちらす', leader: 'リーダー', fixed: '固定' };
  var KIND_ORDER = ['', 'apart', 'together', 'scatter', 'leader', 'fixed'];   // 固定＝この班に入れる（2026-10-05）

  var SAMPLE = [
    ['佐藤 みゆき', '女'], ['鈴木 けんた', '男'], ['高橋 あおい', '女'], ['田中 そうた', '男'],
    ['伊藤 ひなた', '女'], ['渡辺 りく', '男'], ['山本 さくら', '女'], ['中村 はると', '男'],
    ['小林 ゆい', '女'], ['加藤 だいち', '男'], ['吉田 めい', '女'], ['山田 かなた', '男'],
    ['佐々木 のあ', '女'], ['山口 いつき', '男'], ['松本 ひまり', '女'], ['井上 そら', '男'],
    ['木村 あかり', '女'], ['林 ゆうき', '男'], ['清水 みなと', '男'], ['山崎 ひなの', '女'],
    ['森 かいと', '男'], ['池田 つむぎ', '女'], ['橋本 りひと', '男'], ['石川 えま', '女'],
    ['前田 あさひ', '男'], ['藤田 ことね', '女'], ['後藤 はやと', '男'], ['岡田 みお', '女'],
    ['長谷川 れん', '男'], ['村上 ゆあ', '女']
  ];
  // 見本の配慮：[だれに, 種類, 相手 or ちらすの記号]
  var SAMPLE_RULES = [
    ['田中 そうた', 'apart', '中村 はると'],
    ['小林 ゆい', 'together', '石川 えま'],
    ['佐藤 みゆき', 'leader'], ['鈴木 けんた', 'leader'], ['高橋 あおい', 'leader'],
    ['伊藤 ひなた', 'leader'], ['山本 さくら', 'leader'], ['加藤 だいち', 'leader'],
    ['渡辺 りく', 'scatter', 1], ['林 ゆうき', 'scatter', 1], ['前田 あさひ', 'scatter', 1], ['村上 ゆあ', 'scatter', 1]
  ];

  /* ============================================================
     名簿のデータ：1人1行。配慮は行ごとに持つ
     { id, name, label, rules: [{ kind, to(相手のid), set(ちらすの番号) }], extra }
     ============================================================ */

  var students = [];
  var nextId = 1;
  var state = { groups: null };   // 結果：{ groups:[[name]], leaders:{name:true}, tagOf, balance, rules }
  var prevState = { pairs: null };
  var touchedStep1 = false;       // 班の数を自分で選んだか（手順バー用）

  function newStudent(name, label) {
    // extra：CSVで読みこんだ、ほかのメーカーの列（席・クラスなど）。保存のときそのまま書き戻す
    return { id: nextId++, name: name || '', label: label || '', rules: [], extra: {} };
  }

  function addRows(n) {
    for (var i = 0; i < n; i++) students.push(newStudent());
  }

  function byId(id) {
    for (var i = 0; i < students.length; i++) if (students[i].id === id) return students[i];
    return null;
  }

  /** 画面と結果に出す名前。空欄は「3番」、同姓同名は2人目以降に（2）を付けて別人にする */
  function displayNames() {
    var seen = {};
    return students.map(function (s, i) {
      var n = R.cleanName(s.name) || (i + 1) + '番';
      seen[n] = (seen[n] || 0) + 1;
      return seen[n] > 1 ? n + '（' + seen[n] + '）' : n;
    });
  }

  /* ---------- そろえる項目（既定は 性別＝女／男） ---------- */

  function labelSetName() {
    return ($('hw-labelset-name').value || '').trim() || '性別';
  }

  /** チェックボックスの文言。既定（性別＝女・男）なら「男女」、変えていればその名前 */
  function balanceWord() {
    return labelSetName() === '性別' && labelSet().join(',') === '女,男' ? '男女' : labelSetName();
  }

  /** 1の「男女比」の見出し。係・委員会などに変えていればその名前にする */
  function updateBalanceName() {
    $('hw-gmode-lbl').textContent = balanceWord() === '男女' ? '男女比' : balanceWord();
  }

  function labelSet() {
    return ($('hw-labelset-input').value || '').split(/[,、，\/／\s　]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean)
      .slice(0, 3);   // 3つを超えると1行に収まらない
  }

  /* ---------- 表の中身を、班を決める計算で使う形に直す ---------- */

  function collect() {
    var names = displayNames();
    var idx = {};
    students.forEach(function (s, i) { idx[s.id] = i; });

    var out = { apart: [], together: [], scatter: {}, leaders: [], labelOf: {}, fixed: {} };
    var errors = [];
    var seen = { apart: {}, together: {} };

    students.forEach(function (s, i) {
      var me = names[i];
      if (s.label) out.labelOf[me] = s.label;
      s.rules.forEach(function (rule) {
        var k = rule.kind;
        if (k === 'leader') {
          if (out.leaders.indexOf(me) < 0) out.leaders.push(me);
        } else if (k === 'fixed') {
          var fg = rule.g || 0;
          if (out.fixed[me] !== undefined && out.fixed[me] !== fg) { errors.push('「' + me + '」に固定の班が2つ指定されています。'); return; }
          out.fixed[me] = fg;
        } else if (k === 'scatter') {
          var key = String(rule.set || 1);
          (out.scatter[key] = out.scatter[key] || []);
          if (out.scatter[key].indexOf(me) < 0) out.scatter[key].push(me);
        } else if (k === 'apart' || k === 'together') {
          if (!rule.to || idx[rule.to] === undefined) {
            errors.push('「' + me + '」の「' + KIND_LABEL[k] + '」の相手をえらんでください。');
            return;
          }
          if (rule.to === s.id) { errors.push('「' + me + '」の「' + KIND_LABEL[k] + '」の相手が本人になっています。'); return; }
          var other = names[idx[rule.to]];
          var pk = [me, other].sort().join('\n');
          if (seen[k][pk]) return;   // 両方の行に同じ指定があっても1つと数える
          seen[k][pk] = true;
          out[k].push([me, other]);
        }
      });
    });

    Object.keys(seen.together).forEach(function (pk) {
      if (seen.apart[pk]) {
        var p = pk.split('\n');
        errors.push('「' + p[0] + '」と「' + p[1] + '」に「別々」と「同じ」の両方が指定されています。');
      }
    });
    return { names: names, rules: out, errors: errors };
  }

  /** 計算に渡す形（別々の組・同じの組・そろえる）を作る。リーダーの扱いは班の数で変わる */
  function solverRules(r, count) {
    var apart = r.apart.slice();
    Object.keys(r.scatter).forEach(function (k) {
      if (r.scatter[k].length >= 2) apart.push(r.scatter[k]);
    });

    var balance = [];
    var byLabel = {};
    // 男女比（2026-10-05）：'even' 均等にそろえる／'split' 男女で分ける（同じ班に混ぜない）／'' 気にしない
    var gmode = $('hw-gmode').value;
    var split = null;   // 'split' のとき：名前 → ラベル
    if (gmode !== 'even') {
      if (gmode === 'split') split = r.labelOf;
      r = Object.create(r); r.labelOf = {};
    }
    Object.keys(r.labelOf).forEach(function (n) { (byLabel[r.labelOf[n]] = byLabel[r.labelOf[n]] || []).push(n); });
    Object.keys(byLabel).forEach(function (label) {
      if (byLabel[label].length >= 2) balance.push({ label: label, names: byLabel[label] });
    });

    // リーダーが班の数以下なら「1班に1人まで」を必ず守る。多いときは各班になるべく同じ数ずつ配る
    if (r.leaders.length >= 2) {
      if (r.leaders.length <= count) apart.push(r.leaders.slice());
      else balance.push({ label: 'リーダー', names: r.leaders.slice() });
    }
    return { apart: apart, together: r.together, balance: balance, split: split, fixed: r.fixed || {} };
  }

  /* ---------- 班を決める（2026-08-24 版の計算をそのまま使う） ---------- */

  /** 「同じ」でつながった人をひとかたまりにする（A・BとB・Cなら A・B・C が1つ） */
  function buildClusters(names, together) {
    var parent = {};
    names.forEach(function (n) { parent[n] = n; });
    var find = function (x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    };
    together.forEach(function (g) {
      for (var i = 1; i < g.length; i++) parent[find(g[0])] = find(g[i]);
    });
    var byRoot = {};
    names.forEach(function (n) { var r = find(n); (byRoot[r] = byRoot[r] || []).push(n); });
    return Object.keys(byRoot).map(function (k) { return byRoot[k]; });
  }

  /** 人数を班に振り分ける（35人4班なら 9,9,9,8） */
  function groupSizes(total, count) {
    var base = Math.floor(total / count), rem = total % count, sizes = [];
    for (var i = 0; i < count; i++) sizes.push(base + (i < rem ? 1 : 0));
    return sizes;
  }

  /*
   * 班ごとの人数を手で決めたとき（2026-10-05）：customSizes[班] ＝ その班の席の数。
   * 空の班の枠で 班を足す・消す／席を足す・消す をすると入る。班の数・1班の人数のプルダウンを変えると捨てる
   */
  var customSizes = null;

  /** 班ごとの席の数。手で決めていればそれ、なければ「班の数 × 1班の人数」 */
  function seatSizes() {
    if (customSizes) return customSizes.slice();
    // 最初は「---」（何も選んでいない）。両方そろうまで班の枠は出さない
    var num = parseInt($('hw-num').value, 10), per = parseInt($('hw-per').value, 10);
    if (!num || !per) return [];
    var out = [];
    for (var i = 0; i < num; i++) out.push(per);
    return out;
  }

  /**
   * 名簿の人数を、席の数を上限に班へ配る。席があまるときは、なるべく同じ人数になるよう1人ずつ順に入れる
   * （30席に25人なら 5,4,4,4,4,4）。人数のほうが多いときは席の数をそのまま返す（diagnose が止める）
   */
  function plannedSizes(total) {
    var caps = seatSizes();
    if (total >= seatSum(caps)) return caps;
    var sizes = caps.map(function () { return 0; }), left = total;
    while (left > 0) {
      var best = -1;
      for (var i = 0; i < caps.length; i++) {
        if (sizes[i] >= caps[i]) continue;
        if (best < 0 || sizes[i] < sizes[best]) best = i;
      }
      sizes[best]++; left--;
    }
    return sizes;
  }

  function seatSum(sizes) { return sizes.reduce(function (a, b) { return a + b; }, 0); }

  function buildApartMap(apart) {
    var map = {};
    apart.forEach(function (g) {
      g.forEach(function (a) {
        g.forEach(function (b) { if (a !== b) (map[a] = map[a] || {})[b] = true; });
      });
    });
    return map;
  }

  function clusterFits(group, cluster, apartOf) {
    for (var i = 0; i < cluster.length; i++) {
      var mine = apartOf[cluster[i]];
      if (!mine) continue;
      for (var j = 0; j < group.length; j++) if (mine[group[j]]) return false;
    }
    return true;
  }

  /** かたまりごとの固定の班（なければ undefined）。1つのかたまりに別々の班が固定されていれば null */
  function clusterPins(clusters, fixed) {
    return clusters.map(function (cl) {
      var pin;
      for (var i = 0; i < cl.length; i++) {
        var g = fixed[cl[i]];
        if (g === undefined) continue;
        if (pin !== undefined && pin !== g) return null;
        pin = g;
      }
      return pin;
    });
  }

  /** 1回ぶんの割り当て。「どのかたまりを何班に入れたか」を返す */
  function tryOnce(clusters, sizes, apartOf, pins) {
    var count = sizes.length, members = [], remain = sizes.slice();
    for (var i = 0; i < count; i++) members.push([]);
    var assign = new Array(clusters.length);
    // 大きいかたまりほど入る場所が少ないので先に置く。同じ大きさの中はランダム
    var order = clusters.map(function (cl, i) { return i; });
    // 固定の班があるかたまりを先に置く（入れる場所が1つしかない）
    R.shuffle(order).sort(function (a, b) {
      var pa = pins[a] !== undefined ? 1 : 0, pb = pins[b] !== undefined ? 1 : 0;
      return pb - pa || clusters[b].length - clusters[a].length;
    });
    for (var o = 0; o < order.length; o++) {
      var ci = order[o], cl = clusters[ci], cand = [];
      for (var g = 0; g < count; g++) {
        if (pins[ci] !== undefined && pins[ci] !== g) continue;
        if (remain[g] < cl.length || !clusterFits(members[g], cl, apartOf)) continue;
        cand.push(g);
      }
      if (!cand.length) return null;
      var pick = cand[Math.floor(Math.random() * cand.length)];
      members[pick] = members[pick].concat(cl);
      remain[pick] -= cl.length;
      assign[ci] = pick;
    }
    return assign;
  }

  function buildGroups(clusters, assign, count) {
    var groups = [];
    for (var i = 0; i < count; i++) groups.push([]);
    clusters.forEach(function (cl, i) { groups[assign[i]] = groups[assign[i]].concat(cl); });
    return groups;
  }

  function groupOk(list, apartOf) {
    for (var i = 0; i < list.length; i++) {
      var mine = apartOf[list[i]];
      if (!mine) continue;
      for (var j = 0; j < list.length; j++) if (i !== j && mine[list[j]]) return false;
    }
    return true;
  }

  function pairKey(a, b) { return a < b ? a + '' + b : b + '' + a; }

  /**
   * できあがりの「よくなさ」を数える。小さいほどよい。
   * 前回と同じ組み合わせ／ラベルの偏り は、守れないこともある希望なのでスコアにする
   */
  function scoreOf(groups, balance, prevPairs, forcedPairs, split) {
    var repeats = 0;
    if (prevPairs) {
      groups.forEach(function (g) {
        for (var i = 0; i < g.length; i++) {
          for (var j = i + 1; j < g.length; j++) {
            var k = pairKey(g[i], g[j]);
            if (forcedPairs && forcedPairs[k]) continue;   // 「同じ」で組ませた2人は数えない
            if (prevPairs[k]) repeats++;
          }
        }
      });
    }
    var bias = 0;
    balance.forEach(function (b) {
      var set = {};
      b.names.forEach(function (n) { set[n] = true; });
      var ideal = b.names.length / groups.length;
      groups.forEach(function (g) { bias += Math.abs(g.filter(function (n) { return set[n]; }).length - ideal); });
    });
    // 男女で分ける：班の中で少ないほうのラベルの人数を「混ざり」として数える（できるだけ0にする）
    var mix = 0, mixedGroups = 0;
    if (split) {
      groups.forEach(function (g) {
        var cnt = {}, labeled = 0, top = 0;
        g.forEach(function (n) { var l = split[n]; if (!l) return; labeled++; cnt[l] = (cnt[l] || 0) + 1; top = Math.max(top, cnt[l]); });
        mix += labeled - top;
        if (labeled > top) mixedGroups++;
      });
    }
    return { repeats: repeats, bias: bias, mix: mix, mixedGroups: mixedGroups, total: repeats * 10 + bias * 3 + mix * 20 };
  }

  /** 割り切れないぶん、どうやっても残る偏り（警告の基準と打ち切り判定に使う） */
  function minBias(balance, count) {
    return balance.reduce(function (sum, b) {
      var rem = b.names.length % count;
      return sum + 2 * rem * (1 - rem / count);
    }, 0);
  }

  /** 同じ大きさのかたまりを入れ替えて、よくなったときだけ採用する（山登り） */
  function improve(clusters, assign, count, rulesObj, prevPairs, apartOf, floorScore, rounds, forcedPairs, pins) {
    var groups = buildGroups(clusters, assign, count);
    var cur = scoreOf(groups, rulesObj.balance, prevPairs, forcedPairs, rulesObj.split);
    for (var r = 0; r < rounds; r++) {
      if (cur.total <= floorScore + 0.001) break;
      var a = Math.floor(Math.random() * clusters.length);
      var b = Math.floor(Math.random() * clusters.length);
      if (a === b || assign[a] === assign[b] || clusters[a].length !== clusters[b].length) continue;
      if (pins[a] !== undefined || pins[b] !== undefined) continue;   // 固定の班は動かさない
      var ga = assign[a], gb = assign[b];
      assign[a] = gb; assign[b] = ga;
      var next = buildGroups(clusters, assign, count);
      if (!groupOk(next[ga], apartOf) || !groupOk(next[gb], apartOf)) { assign[a] = ga; assign[b] = gb; continue; }
      var s = scoreOf(next, rulesObj.balance, prevPairs, forcedPairs, rulesObj.split);
      if (s.total < cur.total) { cur = s; groups = next; } else { assign[a] = ga; assign[b] = gb; }
    }
    return { groups: groups, score: cur };
  }

  function solve(names, count, rulesObj, prevPairs) {
    var clusters = buildClusters(names, rulesObj.together);
    var sizes = plannedSizes(names.length);
    var pins = clusterPins(clusters, rulesObj.fixed);
    var apartOf = buildApartMap(rulesObj.apart);
    var floorScore = minBias(rulesObj.balance, count) * 3;
    var forcedPairs = {};
    clusters.forEach(function (cl) {
      for (var i = 0; i < cl.length; i++) for (var j = i + 1; j < cl.length; j++) forcedPairs[pairKey(cl[i], cl[j])] = true;
    });
    var best = null, bestScore = Infinity;
    for (var t = 0; t < ATTEMPTS; t++) {
      var assign = tryOnce(clusters, sizes, apartOf, pins);
      if (!assign) continue;
      var got = improve(clusters, assign, count, rulesObj, prevPairs, apartOf, floorScore, IMPROVE_ROUNDS, forcedPairs, pins);
      if (got.score.total < bestScore) {
        bestScore = got.score.total; best = got;
        if (bestScore <= floorScore + 0.001) break;
      }
    }
    return best;
  }

  /* ---------- 作れない理由を具体的に出す ---------- */

  function diagnose(names, count, rulesObj, raw) {
    var msgs = [];
    if (seatSum(seatSizes()) < names.length) {
      msgs.push({ text: '班の席が足りません。', sub: '名簿は' + names.length + '人ですが、班の席は合わせて' + seatSum(seatSizes()) + '席です。班の数・1班の人数を増やすか、班の枠で席を足してください。', error: true });
    }
    if (count > names.length) {
      msgs.push({ text: '班の数が人数より多いです。', sub: '名簿は' + names.length + '人ですが、' + count + '班に分けようとしています。', error: true });
    }
    var clusters = buildClusters(names, rulesObj.together);
    var maxSize = Math.max.apply(null, plannedSizes(names.length));
    clusters.forEach(function (cl) {
      if (cl.length > maxSize) {
        msgs.push({ text: '「同じ」でまとめた人が、1つの班に入りきりません。', sub: '「' + cl.join('・') + '」の' + cl.length + '人ですが、1班は最大' + maxSize + '人です。班の数を減らすか、「同じ」を減らしてください。', error: true });
      }
    });
    Object.keys(rulesObj.fixed).forEach(function (n) {
      if (rulesObj.fixed[n] >= count) msgs.push({ text: '「' + n + '」を固定した ' + (rulesObj.fixed[n] + 1) + '班 がありません。', sub: 'いまは' + count + '班です。', error: true });
    });
    var sizesNow = plannedSizes(names.length), pinCount = {};
    clusterPins(clusters, rulesObj.fixed).forEach(function (pin, i) {
      if (pin === null) msgs.push({ text: '「同じ」でまとめた人に、ちがう班が固定されています。', sub: '「' + clusters[i].join('・') + '」', error: true });
      else if (pin !== undefined) pinCount[pin] = (pinCount[pin] || 0) + clusters[i].length;
    });
    Object.keys(pinCount).forEach(function (g) {
      var cap = seatSizes()[g];
      if (cap !== undefined && pinCount[g] > cap) msgs.push({ text: (Number(g) + 1) + '班に固定した人が入りきりません。', sub: pinCount[g] + '人を固定していますが、' + (Number(g) + 1) + '班は' + cap + '席です。', error: true });
    });
    var rootOf = {};
    clusters.forEach(function (cl, i) { cl.forEach(function (n) { rootOf[n] = i; }); });
    rulesObj.apart.forEach(function (g) {
      for (var i = 0; i < g.length; i++) {
        for (var j = i + 1; j < g.length; j++) {
          if (rootOf[g[i]] === rootOf[g[j]]) {
            msgs.push({ text: '「同じ」と「別々・ちらす・リーダー」がぶつかっています。', sub: '「' + g[i] + '」と「' + g[j] + '」は、同じ班にする指定と、別の班にする指定の両方が効いています。', error: true });
          }
        }
      }
    });
    Object.keys(raw.scatter).forEach(function (k) {
      var g = raw.scatter[k];
      if (g.length > count) {
        msgs.push({ text: 'ちらしきれません。', sub: '「ちらす ' + SCATTER_SETS[k - 1] + '」の' + g.length + '人を別々の班にするには、' + g.length + '班以上が必要です（いまは' + count + '班）。', error: true });
      }
    });
    return msgs;
  }

  /* ---------- 実行 ---------- */

  function showMsgs(list) {
    $('hw-msg').innerHTML = list.map(function (m) {
      return '<div class="hw-note' + (m.error ? ' is-error' : '') + '">' + R.esc(m.text) +
        (m.sub ? '<span>' + R.esc(m.sub) + '</span>' : '') + '</div>';
    }).join('');
  }

  /** 班の数（名簿の人数には左右されない） */
  function groupCount() {
    return seatSizes().length;
  }

  function run() {
    if (!students.length) {
      showMsgs([{ text: '名簿が空です。', sub: '「＋1人」などで行を足すか、「見本を入れる」を押してください。', error: true }]);
      return;
    }
    var got = collect();
    if (got.errors.length) { showMsgs(got.errors.map(function (t) { return { text: t, error: true }; })); return; }

    var names = got.names;
    var count = groupCount();
    if (!count) {
      showMsgs([{ text: '班の数と1班の人数を選んでください。', sub: '1の「班の数」「1班の人数」が未設定です。', error: true }]);
      $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    var rulesObj = solverRules(got.rules, count);
    var problems = diagnose(names, count, rulesObj, got.rules);
    if (problems.length) { showMsgs(problems); return; }

    var usePrev = !!(prevState.pairs && $('hw-prev-avoid').checked);
    var best = solve(names, count, rulesObj, usePrev ? prevState.pairs : null);
    if (!best) {
      showMsgs([{
        text: '配慮を全部守れる分け方が見つかりませんでした。',
        sub: '「別々」「ちらす」「リーダー」が多すぎるか、「同じ」と重なって身動きが取れなくなっている可能性があります。配慮を1つ減らすか、班の数を変えて試してください。',
        error: true
      }]);
      return;
    }

    // リーダー：各班のリーダー候補から1人を選び、班のいちばん上に置く
    var noLeader = 0;
    var groups = best.groups.map(function (g) {
      var cand = R.shuffle(g.filter(function (n) { return got.rules.leaders.indexOf(n) >= 0; }));
      if (!cand.length) { noLeader++; return g.slice(); }
      return [cand[0]].concat(g.filter(function (n) { return n !== cand[0]; }));
    });

    state = { groups: groups, leaders: {}, useLeaders: got.rules.leaders.length > 0, rules: got.rules, balance: rulesObj.balance.filter(function (b) { return b.label !== 'リーダー'; }) };
    syncLeaders();
    picked = null;
    var notes = softNotes(best.score, rulesObj, count, usePrev);
    if (state.useLeaders && noLeader) {
      notes.push({ text: 'リーダーにした子がいない班が ' + noLeader + '班 あります。その班は いちばん上の子をリーダーにしています。', sub: 'リーダーにした子が ' + got.rules.leaders.length + '人で、班は ' + count + '班です。入れかえて決めるか、リーダーを増やしてください。' });
    }
    showMsgs(notes);
    render();
    $('tool').scrollIntoView({ behavior: 'smooth', block: 'start' });
    ['hw-gen', 'hw-gen2'].forEach(function (id) { $(id).textContent = '再配置する'; });
  }

  /**
   * 班のいちばん上の子がリーダー（2026-10-05）。手直しで上に来た子がその班のリーダーになる。
   * 名簿で「リーダー」を1人も付けていなければ、リーダーは出さない
   */
  function syncLeaders() {
    state.leaders = {};
    if (!state.useLeaders) return;
    state.groups.forEach(function (g) { if (g.length) state.leaders[g[0]] = true; });
  }

  /** 守りきれなかった希望を、エラーではなく「お知らせ」として出す */
  function softNotes(score, rulesObj, count, usePrev) {
    var notes = [];
    if (usePrev && score.repeats > 0) {
      notes.push({ text: '前回と同じ班になった組み合わせが ' + score.repeats + '組 あります。', sub: 'この人数と班の数では避けきれませんでした。班の数を増やすと減らせます。' });
    }
    if (rulesObj.balance.length && score.bias > minBias(rulesObj.balance, count) + 0.001) {
      notes.push({ text: '人数に偏りが残りました。', sub: '「同じ」や「別々」を優先したためです。班ごとの内訳は班の見出しで確認してください。' });
    }
    if (rulesObj.split && score.mix > 0) {
      notes.push({ text: balanceWord() + 'が混ざった班が ' + score.mixedGroups + '班 あります。', sub: 'リーダーや「同じ」の指定、または人数が班の大きさで割り切れないためです。班の数か1班の人数を変えると分けきれることがあります。' });
    }
    return notes;
  }

  /* ---------- 1の枠：空の班の枠、または班分けの結果 ---------- */

  var picked = null;   // タップで1人目にえらんだ子 "班,番目"

  function tagsOf(name) {
    var r = state.rules, tags = [];
    if (!r) return tags;
    if (r.apart.some(function (p) { return p.indexOf(name) >= 0; })) tags.push('別々');
    if (r.together.some(function (p) { return p.indexOf(name) >= 0; })) tags.push('同じ');
    Object.keys(r.scatter).forEach(function (k) { if (r.scatter[k].indexOf(name) >= 0) tags.push('ちらす' + SCATTER_SETS[k - 1]); });
    if (r.fixed && r.fixed[name] !== undefined) tags.push('固定');
    return tags;
  }

  function renderBoard() {
    var board = $('hw-board');
    var hasResult = !!state.groups;
    $('hw-board-wrap').classList.toggle('is-result', hasResult);
    var html = '';
    if (hasResult) {
      var names = displayNames(), lbl = {};
      students.forEach(function (s, i) { if (s.label) lbl[names[i]] = s.label; });
      state.groups.forEach(function (g, gi) {
        var counts = labelSet().map(function (l) { return l + ' ' + g.filter(function (n) { return lbl[n] === l; }).length; }).join('・');
        html += '<div class="hw-group" data-g="' + gi + '">' +
          '<div class="hw-group-head"><span class="hw-group-n">' + (gi + 1) + '班</span>' +
          '<span class="hw-group-size">' + g.length + '人' + (counts ? '（' + R.esc(counts) + '）' : '') + '</span></div>' +
          '<ul class="hw-members">' +
          g.map(function (n, mi) {
            var at = gi + ',' + mi;
            var lead = !!state.leaders[n];
            var tags = tagsOf(n);
            return '<li class="hw-mem' + (lead ? ' is-leader' : '') + (picked === at ? ' is-picked' : '') + '"' +
              ' draggable="true" tabindex="0" role="button" data-at="' + at + '" data-name="' + R.esc(n) + '"' +
              ' aria-label="' + (gi + 1) + '班 ' + R.esc(n) + '（えらんで入れかえ）">' +
              '<span class="hw-mem-name">' + R.esc(n) + '</span>' +
              tags.map(function (t) { return '<span class="hw-tag">' + R.esc(t) + '</span>'; }).join('') +
              // リーダーの札は行の右はし（名前の頭をそろえるため。2026-10-05）
              (lead ? '<span class="hw-lead-tag">リーダー</span>' : '') +
              '</li>';
          }).join('') +
          '</ul></div>';
      });
    } else {
      // まだ班分けしていない：班の数と人数だけの空の枠。名前が1人も入っていないうちは枠ごと出さない
      // 枠の中で 班を足す・消す／席を足す・消す ができる（班ごとに人数を変えたいとき）
      var lead = students.some(function (s) { return s.rules.some(function (r) { return r.kind === 'leader'; }); });
      var sizes = seatSizes();
      {
        sizes.forEach(function (size, gi) {
          var slots = '';
          // いちばん上の枠がリーダーの席
          for (var k = 0; k < size; k++) {
            slots += '<li class="hw-slot' + (lead && k === 0 ? ' is-leader' : '') + '">' + (lead && k === 0 ? 'リーダー' : '') +
              (size > 1 ? '<button type="button" class="hw-slot-del" data-g="' + gi + '" aria-label="' + (gi + 1) + '班の席を1つ消す">✕</button>' : '') + '</li>';
          }
          slots += '<li class="hw-slot-add"><button type="button" class="hw-ghost-add" data-g="' + gi + '" aria-label="' + (gi + 1) + '班に席を足す">＋ 席</button></li>';
          html += '<div class="hw-group is-empty"><div class="hw-group-head"><span class="hw-group-n">' + (gi + 1) + '班</span>' +
            '<span class="hw-group-size">' + size + '席</span>' +
            (sizes.length > 1 ? '<button type="button" class="hw-group-del" data-g="' + gi + '" aria-label="' + (gi + 1) + '班を消す">✕</button>' : '') +
            '</div><ul class="hw-members">' + slots + '</ul></div>';
        });
        if (sizes.length && sizes.length < 12) html += '<button type="button" class="hw-group-add" aria-label="班を足す">＋ 班を足す</button>';
      }
    }
    board.innerHTML = html;
    // 班の数・1班の人数が「---」のうちは、枠のかわりに案内だけ出す
    var none = !hasResult && !seatSizes().length;
    $('hw-pick-hint').hidden = !none;
    $('hw-edit-hint').hidden = none;
    updateRowGroups();
    updateSteps();
  }

  /** 結果のまとめ・Excel用テキスト */
  function render() {
    renderBoard();
    var groups = state.groups;
    var total = groups.reduce(function (a, g) { return a + g.length; }, 0);
    $('hw-info').textContent = groups.length + '班 / ' + total + '人';
    $('hw-out').value = groups.map(function (g, i) { return [(i + 1) + '班'].concat(g).join('\t'); }).join('\n');
  }

  function clearResult() {
    state = { groups: null };
    picked = null;
    ['hw-gen', 'hw-gen2'].forEach(function (id) { $(id).textContent = '班分けする'; });
    renderBoard();
  }

  /* ---------- 結果を手で直す ---------- */

  function parseAt(at) { return at.split(',').map(Number); }

  /** 2人を入れかえる */
  function swapMembers(a, b) {
    if (!a || !b || a === b) return;
    var pa = parseAt(a), pb = parseAt(b), g = state.groups;
    var t = g[pa[0]][pa[1]];
    g[pa[0]][pa[1]] = g[pb[0]][pb[1]];
    g[pb[0]][pb[1]] = t;
    afterHandEdit();
  }

  /** 1人を別の班へ移す（班の人数は変わる） */
  function moveMember(a, toGroup) {
    var pa = parseAt(a), g = state.groups;
    if (pa[0] === toGroup) return;
    var name = g[pa[0]].splice(pa[1], 1)[0];
    g[toGroup].push(name);
    afterHandEdit();
  }

  function afterHandEdit() {
    picked = null;
    syncLeaders();
    render();
    var broken = brokenRules();
    showMsgs(broken.length ? [{ text: '手直しで、守れていない配慮があります。', sub: broken.join('／') }] : []);
  }

  function brokenRules() {
    var r = state.rules, groupOf = {}, out = [];
    state.groups.forEach(function (g, i) { g.forEach(function (n) { groupOf[n] = i; }); });
    r.apart.forEach(function (p) { if (groupOf[p[0]] === groupOf[p[1]]) out.push(p[0] + 'と' + p[1] + 'が同じ班です（別々）'); });
    r.together.forEach(function (p) { if (groupOf[p[0]] !== groupOf[p[1]]) out.push(p[0] + 'と' + p[1] + 'が別の班です（同じ）'); });
    Object.keys(r.scatter).forEach(function (k) {
      var seen = {};
      r.scatter[k].forEach(function (n) {
        if (seen[groupOf[n]]) out.push('ちらす' + SCATTER_SETS[k - 1] + 'の子が' + (groupOf[n] + 1) + '班に2人います');
        seen[groupOf[n]] = true;
      });
    });
    state.groups.forEach(function (g, i) {
      var lc = g.filter(function (n) { return state.leaders[n]; }).length;
      if (lc > 1) out.push((i + 1) + '班にリーダーが' + lc + '人います');
    });
    var sizes = state.groups.map(function (g) { return g.length; });
    if (!customSizes && Math.max.apply(null, sizes) - Math.min.apply(null, sizes) >= 2) out.push('班の人数に2人以上の差があります');
    return out;
  }

  function pickMember(at) {
    if (!picked) { picked = at; renderBoard(); return; }
    if (picked === at) { picked = null; renderBoard(); return; }
    swapMembers(picked, at);
  }

  /* ---------- 手順バー ---------- */

  function updateSteps() {
    var bar = $('hw-stepbar');
    if (!bar) return;
    var named = students.some(function (s) { return s.name.trim(); });
    // 1 で班の数と1班の人数を両方選んではじめて 2（名簿と配慮）へ進む
    var now = state.groups ? 4 : !seatSizes().length ? 1 : named ? 3 : 2;
    Array.prototype.forEach.call(bar.children, function (li) {
      var n = Number(li.getAttribute('data-step'));
      li.classList.toggle('is-done', n < now);
      li.classList.toggle('is-on', n === now);
      if (n === now) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }

  function updateCount() {
    // 名簿の人数は名前を入れた子だけ数える（最初の空の行は数えない。1の段で「たりません」と出さない）
    var n = students.filter(function (s) { return s.name.trim(); }).length;
    $('hw-count').textContent = n + '人';
    var info = $('hw-plan');
    info.classList.remove('is-warn');
    var caps = seatSizes(), sum = seatSum(caps);
    $('hw-group-count').textContent = caps.length + '班';
    if (!caps.length) { info.textContent = '班の数と1班の人数を選んでください'; return; }
    info.textContent = (customSizes ? caps.length + '班・合わせて' : caps.length + '班 × ' + caps[0] + '人 ＝ ') + sum + '席' +
      (n ? '（名簿 ' + n + '人' + (sum < n ? '・' + (n - sum) + '席たりません' : sum > n ? '・あき ' + (sum - n) + '席' : '') + '）' : '');
    if (sum < n) info.classList.add('is-warn');
  }

  /* ============================================================
     名簿の表（1人1行）
     ============================================================ */

  function options(list, current) {
    return list.map(function (o) {
      return '<option value="' + R.esc(o[0]) + '"' + (String(o[0]) === String(current) ? ' selected' : '') + '>' + R.esc(o[1]) + '</option>';
    }).join('');
  }

  function partnerOptions(self, current, names) {
    var list = [['', 'だれと？']];
    students.forEach(function (s, i) { if (s.id !== self.id) list.push([s.id, (i + 1) + '　' + names[i]]); });
    return options(list, current || '');
  }

  function ruleHtml(s, rule, ri, names) {
    var k = rule.kind;
    var html = '<span class="hw-rule' + (k ? ' is-' + k : '') + '" data-ri="' + ri + '">' +
      '<select class="hw-kind" aria-label="配慮の種類">' +
      options(KIND_ORDER.map(function (x) { return [x, KIND_LABEL[x]]; }), k) + '</select>';
    if (k === 'apart' || k === 'together') {
      html += '<select class="hw-to" aria-label="' + KIND_LABEL[k] + 'の相手">' + partnerOptions(s, rule.to, names) + '</select>';
    } else if (k === 'fixed') {
      var gl = [];
      for (var gi = 0; gi < Math.max(seatSizes().length, (rule.g || 0) + 1); gi++) gl.push([gi, (gi + 1) + '班']);
      html += '<select class="hw-fg" aria-label="固定する班">' + options(gl, rule.g || 0) + '</select>';
    } else if (k === 'scatter') {
      html += '<select class="hw-set" aria-label="ちらすまとまり">' +
        options(SCATTER_SETS.map(function (l, i) { return [i + 1, l + 'の子']; }), rule.set || 1) + '</select>';
    }
    html += '<button type="button" class="hw-rule-del" aria-label="この配慮を消す">×</button></span>';
    return html;
  }

  function segHtml(s, i) {
    var set = labelSet();
    if (!set.length) return '<span class="hw-seg"></span>';
    return '<span class="hw-seg" role="group" aria-label="' + (i + 1) + '人目の' + R.esc(labelSetName()) + '">' +
      '<button type="button" class="hw-seg-b' + (s.label ? '' : ' is-on') + '" data-label="">—</button>' +
      set.map(function (l) {
        return '<button type="button" class="hw-seg-b' + (s.label === l ? ' is-on' : '') + '" data-label="' + R.esc(l) + '">' + R.esc(l) + '</button>';
      }).join('') + '</span>';
  }

  function renderList() {
    var names = displayNames();
    $('hw-list').innerHTML = students.map(function (s, i) {
      return '<div class="hw-row" data-id="' + s.id + '">' +
        '<span class="hw-no">' + (i + 1) + '</span>' +
        '<input type="text" class="hw-name" value="' + R.esc(s.name) + '" placeholder="' + (i + 1) + '番" aria-label="' + (i + 1) + '人目のなまえ" spellcheck="false" autocomplete="off">' +
        segHtml(s, i) +
        '<div class="hw-rules">' +
        s.rules.map(function (rule, ri) { return ruleHtml(s, rule, ri, names); }).join('') +
        '<button type="button" class="hw-rule-add" aria-label="配慮を追加">＋ 追加</button>' +
        '</div>' +
        '<span class="hw-row-group"></span>' +
        '<button type="button" class="hw-row-del" aria-label="' + (i + 1) + '人目を消す">✕</button>' +
        '</div>';
    }).join('');
    $('hw-list-h-label').textContent = labelSet().length ? labelSetName() : '';
    updateCount();
    if (state.groups) render(); else renderBoard();
  }

  /** 結果があれば、名簿の各行にその子の班（「3班」）を出す */
  function updateRowGroups() {
    var at = {};
    if (state.groups) state.groups.forEach(function (g, i) { g.forEach(function (n) { at[n] = (i + 1) + '班' + (state.leaders[n] ? '・リーダー' : ''); }); });
    var names = displayNames();
    Array.prototype.forEach.call(document.querySelectorAll('#hw-list .hw-row-group'), function (el, i) {
      el.textContent = at[names[i]] || '';
    });
  }

  function refreshPartnerLabels() {
    var names = displayNames(), label = {};
    students.forEach(function (s, i) { label[s.id] = (i + 1) + '　' + names[i]; });
    Array.prototype.forEach.call(document.querySelectorAll('#hw-list .hw-to option'), function (o) {
      if (o.value && label[o.value]) o.textContent = label[o.value];
    });
  }

  function rowOf(el) {
    var row = el.closest('.hw-row');
    return row ? byId(Number(row.getAttribute('data-id'))) : null;
  }

  function ruleOf(el, s) {
    var box = el.closest('.hw-rule');
    return box ? s.rules[Number(box.getAttribute('data-ri'))] : null;
  }

  function addAndFocus(n) {
    var first = students.length;
    addRows(n);
    clearResult();
    renderList();
    var inputs = document.querySelectorAll('#hw-list .hw-name');
    if (inputs[first]) inputs[first].focus();
  }

  function removeStudent(s) {
    students = students.filter(function (x) { return x.id !== s.id; });
    students.forEach(function (x) { x.rules = x.rules.filter(function (rule) { return rule.to !== s.id; }); });
    clearResult();
    renderList();
  }

  /** Excelから縦に何人ぶんか貼られたら、その行から下へ1人ずつ流し込む */
  function pasteNames(s, text) {
    var list = String(text).split(/\r?\n|\t/).map(R.cleanName).filter(Boolean);
    if (list.length < 2) return false;
    var at = students.indexOf(s);
    list.forEach(function (name, i) {
      if (!students[at + i]) students.push(newStudent());
      students[at + i].name = name;
    });
    clearResult();
    renderList();
    rosterNote(list.length + '人ぶん貼り付けました。', 'ok');
    return true;
  }

  /** 名前・ラベルと「名前で書いた配慮」から表を作り直す（見本・CSV読みこみ用） */
  function loadRoster(list, ruleList) {
    nextId = 1;
    students = list.map(function (p) { var s = newStudent(p.name, p.label); s.extra = p.extra || {}; return s; });
    var find = function (name) {
      for (var i = 0; i < students.length; i++) if (students[i].name === name) return students[i];
      return null;
    };
    (ruleList || []).forEach(function (x) {
      var s = find(x[0]);
      if (!s) return;
      if (x[1] === 'apart' || x[1] === 'together') {
        var t = find(x[2]);
        if (t && t !== s) s.rules.push({ kind: x[1], to: t.id });
      } else if (x[1] === 'scatter') {
        s.rules.push({ kind: 'scatter', set: x[2] || 1 });
      } else if (x[1] === 'leader') {
        s.rules.push({ kind: 'leader' });
      } else if (x[1] === 'fixed') {
        s.rules.push({ kind: 'fixed', g: x[2] || 0 });
      }
    });
    clearResult();
    renderList();
  }

  /* ============================================================
     CSV（席替え・クラス分けと共通の形。班分けが読み書きするのは 性別・班の配慮・班）
     ============================================================ */

  function rosterNote(text, kind) {
    var el = $('hw-roster-note');
    if (!text) { el.hidden = true; el.textContent = ''; el.className = 'hw-roster-note'; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = 'hw-roster-note' + (kind ? ' is-' + kind : '');
  }

  /** 読みこんだCSVの「班」列から、前回いっしょだった組み合わせを取り出す */
  function applyPrevGrouping(groups) {
    if (!groups || groups.length < 2) { clearPrev(); return; }
    var pairs = {};
    groups.forEach(function (m) {
      for (var i = 0; i < m.length; i++) for (var j = i + 1; j < m.length; j++) pairs[pairKey(m[i], m[j])] = true;
    });
    prevState = { pairs: pairs };
    $('hw-prev').hidden = false;
    $('hw-prev-lbl').textContent = '読みこんだCSVの班を「前回の班」として使います';
  }

  function clearPrev() {
    prevState = { pairs: null };
    $('hw-prev').hidden = true;
  }

  var csvRows = null, csvRoles = {};   // 列番号 → 'name' | 'label' | 'rule' | 'group'
  var ROLE_LABEL = { '': '（使わない）', name: 'なまえ', label: 'そろえる項目', rule: '配慮', group: '前回の班' };

  /** 見出しから列の役割を当てる。自分が書き出したCSVはそのまま読み戻せる */
  function autoDetectRoles(head) {
    var roles = {};
    head.forEach(function (raw, c) {
      var h = (raw || '').trim();
      if (!h) return;
      if (/^(出席番号|番号|no\.?|#)$/i.test(h)) return;
      // 共通CSVの、ほかのメーカーの列（席・クラス）は読まない（保存のときそのまま残す）
      var rr = R.ruleColumnRole(h, '班の配慮', head);
      if (rr === 'rule') { roles[c] = 'rule'; return; }
      if (rr === 'skip' || /^(席|座席の形|前のクラス|新しいクラス)$/.test(h)) return;
      if (/(なまえ|名前|氏名|生徒名|児童名|姓|名|name)/i.test(h)) roles[c] = 'name';
      else if (/(ラベル|性別|せいべつ|gender|sex)/i.test(h)) roles[c] = 'label';
      else if (/(班|グループ|group|team)/i.test(h)) roles[c] = 'group';
    });
    return roles;
  }

  function readCsvFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = R.decode(reader.result);
      var rows = R.parseDelimited(text, R.detectSep(text));
      if (!rows.length) { rosterNote('このファイルからは名前を読み取れませんでした。', 'error'); return; }
      csvRows = rows;
      csvRoles = $('hw-csv-head').checked ? autoDetectRoles(rows[0]) : {};
      if (!Object.keys(csvRoles).some(function (c) { return csvRoles[c] === 'name'; })) {
        var guess = R.guessNameCol(rows);
        if (guess >= 0) csvRoles[guess] = 'name';
      }
      renderCsvPick();
    };
    reader.onerror = function () { rosterNote('ファイルを読めませんでした。', 'error'); };
    reader.readAsArrayBuffer(file);
  }

  function renderCsvPick() {
    var hasHead = $('hw-csv-head').checked;
    var width = R.colWidth(csvRows);
    var sample = csvRows[hasHead ? 1 : 0] || [];
    var html = '';
    for (var c = 0; c < width; c++) {
      var head = hasHead ? ((csvRows[0][c] || '').trim() || (c + 1) + '列目') : (c + 1) + '列目';
      var val = (sample[c] || '').trim() || '（空）';
      var role = csvRoles[c] || '';
      html += '<div class="hw-csv-col' + (role ? ' is-on' : '') + '">' +
        '<span class="hw-csv-h">' + R.esc(head) + '</span>' +
        '<span class="hw-csv-v">' + R.esc(val) + '</span>' +
        '<select class="hw-csv-role-sel" data-col="' + c + '" aria-label="' + R.esc(head) + 'の役割">' +
        Object.keys(ROLE_LABEL).map(function (k) {
          return '<option value="' + k + '"' + (role === k ? ' selected' : '') + '>' + ROLE_LABEL[k] + '</option>';
        }).join('') + '</select></div>';
    }
    $('hw-csv-cols').innerHTML = html;
    $('hw-csv-pick').hidden = false;
    rosterNote('');
  }

  function colsWithRole(role) {
    return Object.keys(csvRoles).filter(function (c) { return csvRoles[c] === role; })
      .map(Number).sort(function (a, b) { return a - b; });
  }

  /** 「別々1」「同じ2;ちらす3;リーダー」のような書き方をほどく */
  function parseRuleCell(cell) {
    return String(cell || '').split(/[;；,、，\/／\s　]+/).map(function (t) {
      t = t.trim();
      if (/^(リーダー|りーだー|班長)$/.test(t)) return { kind: 'leader' };
      var fx = t.match(/^固定\s*(\d+)\s*班?$/);
      if (fx) return { kind: 'fixed', g: Math.max(0, Number(fx[1]) - 1) };
      var m = t.match(/^(別々|同じ|ちらす)\s*([0-9A-Ea-e]*)$/);
      if (!m) return null;
      var kind = m[1] === '同じ' ? 'together' : (m[1] === 'ちらす' ? 'scatter' : 'apart');
      var no = m[2] || '1';
      if (/[A-Ea-e]/.test(no)) no = String('ABCDE'.indexOf(no.toUpperCase()) + 1);
      return { kind: kind, no: no };
    }).filter(Boolean);
  }

  function applyCsvPick() {
    var nameCols = colsWithRole('name');
    if (!nameCols.length) { rosterNote('「なまえ」の列を1つ以上えらんでください。', 'error'); return; }
    var labelCol = colsWithRole('label')[0];
    var ruleCol = colsWithRole('rule')[0];
    var groupCol = colsWithRole('group')[0];

    var body = $('hw-csv-head').checked ? csvRows.slice(1) : csvRows;
    var head = $('hw-csv-head').checked ? csvRows[0] : [];
    var used = Object.keys(csvRoles).filter(function (c) { return csvRoles[c]; }).map(Number);
    var list = [], ruleCells = [], groupCells = [];
    body.forEach(function (r) {
      var name = nameCols.map(function (c) { return (r[c] || '').trim(); }).filter(Boolean).join(' ').trim();
      if (!name) return;
      list.push({
        name: R.cleanName(name),
        label: labelCol === undefined ? '' : (r[labelCol] || '').trim(),
        extra: R.keepExtras(head, r, used)   // ほかのメーカーの列。保存のときそのまま書き戻す
      });
      ruleCells.push(ruleCol === undefined ? '' : (r[ruleCol] || '').trim());
      groupCells.push(groupCol === undefined ? '' : (r[groupCol] || '').trim());
    });
    if (!list.length) { rosterNote('えらんだ列に名前が入っていませんでした。', 'error'); return; }

    // ラベルの種類を「そろえる項目」に合わせる（女／男 以外の値が入っていたらそれを使う）
    var seenLabels = [];
    list.forEach(function (p) { if (p.label && seenLabels.indexOf(p.label) < 0) seenLabels.push(p.label); });
    if (seenLabels.length && seenLabels.some(function (l) { return labelSet().indexOf(l) < 0; })) {
      $('hw-labelset-input').value = seenLabels.slice(0, 3).join(', ');
      if (labelCol !== undefined && head[labelCol]) $('hw-labelset-name').value = String(head[labelCol]).trim();
      updateBalanceName();
    }

    // 配慮：同じ「種類＋番号」の人どうしが1つの組
    var buckets = {}, ruleList = [];
    ruleCells.forEach(function (cell, i) {
      parseRuleCell(cell).forEach(function (t) {
        if (t.kind === 'leader') { ruleList.push([list[i].name, 'leader']); return; }
        if (t.kind === 'fixed') { ruleList.push([list[i].name, 'fixed', t.g]); return; }
        var key = t.kind + t.no;
        (buckets[key] = buckets[key] || { kind: t.kind, no: t.no, names: [] }).names.push(list[i].name);
      });
    });
    // 3人以上の「別々」（以前のCSV）は「ちらす」と同じ働きなので、空いている記号のちらすにする
    var usedSets = {};
    Object.keys(buckets).forEach(function (k) { if (buckets[k].kind === 'scatter') usedSets[Number(buckets[k].no) || 1] = true; });
    var freeSet = function () {
      for (var n = 1; n <= SCATTER_SETS.length; n++) if (!usedSets[n]) { usedSets[n] = true; return n; }
      return SCATTER_SETS.length;
    };
    Object.keys(buckets).sort().forEach(function (k) {
      var b = buckets[k];
      if (b.kind === 'scatter' || (b.kind === 'apart' && b.names.length >= 3)) {
        var set = b.kind === 'scatter' ? Math.min(Number(b.no) || 1, SCATTER_SETS.length) : freeSet();
        b.names.forEach(function (n) { ruleList.push([n, 'scatter', set]); });
      } else if (b.names.length >= 2) {
        for (var i = 1; i < b.names.length; i++) ruleList.push([b.names[0], b.kind, b.names[i]]);
      }
    });
    loadRoster(list, ruleCol === undefined ? [] : ruleList);

    // 前回の班
    var byGroup = {}, shown = displayNames();
    groupCells.forEach(function (g, i) { if (g) (byGroup[g] = byGroup[g] || []).push(shown[i]); });
    var found = Object.keys(byGroup);
    applyPrevGrouping(found.sort().map(function (k) { return byGroup[k]; }));

    closeCsvPick();
    touchedStep1 = true;
    updateSteps();
    var got = [list.length + '人'];
    if (labelCol !== undefined) got.push(labelSetName());
    if (ruleList.length) got.push('配慮');
    if (found.length > 1) got.push('前回の班');
    rosterNote(got.join('・') + ' を読みこみました。', 'ok');
  }

  function closeCsvPick() {
    $('hw-csv-pick').hidden = true;
    csvRows = null;
    csvRoles = {};
    $('hw-csv').value = '';
  }

  /** Excelで開いても文字化けしないよう BOM を付けて渡す */
  function downloadCsv(filename, rows) {
    var body = rows.map(function (r) {
      return r.map(function (v) {
        var s = String(v == null ? '' : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /** 人ごとの配慮セル（「別々1」「同じ2」「ちらす1」「リーダー」） */
  function ruleCellsByName(r) {
    var cells = {};
    var add = function (n, code) { cells[n] = cells[n] ? cells[n] + ';' + code : code; };
    r.apart.forEach(function (p, i) { add(p[0], '別々' + (i + 1)); add(p[1], '別々' + (i + 1)); });
    r.together.forEach(function (p, i) { add(p[0], '同じ' + (i + 1)); add(p[1], '同じ' + (i + 1)); });
    Object.keys(r.scatter).forEach(function (k) { r.scatter[k].forEach(function (n) { add(n, 'ちらす' + k); }); });
    r.leaders.forEach(function (n) { add(n, 'リーダー'); });
    Object.keys(r.fixed || {}).forEach(function (n) { add(n, '固定' + (r.fixed[n] + 1)); });
    return cells;
  }

  function downloadState(withGroups) {
    if (!students.length) { rosterNote('名簿が空です。', 'error'); return; }
    var got = collect();
    var cells = ruleCellsByName(got.rules);
    var groupOf = {};
    if (withGroups && state.groups) state.groups.forEach(function (g, i) { g.forEach(function (n) { groupOf[n] = (i + 1) + '班'; }); });

    // 席替え・クラス分けと共通の形で書き出す。読みこんだほかのメーカーの列もそのまま残す
    var rows = R.sharedRows(got.names.map(function (n, i) {
      var values = { 'なまえ': n, '班の配慮': cells[n] || '', '班': groupOf[n] || '' };
      values[labelSetName()] = students[i].label || '';   // 既定は「性別」。書き換えていれば右端に足す
      return { values: values, extra: students[i].extra };
    }));
    downloadCsv(withGroups ? '班分け.csv' : '班分け_名簿.csv', rows);
    rosterNote('CSVに保存しました。次回このファイルを「CSVを読む」から取り込めば、' +
      (withGroups ? '名簿・配慮・前回の班' : '名簿と配慮') + 'がそのまま戻ります。', 'ok');
  }

  function downloadTemplate() {
    var sample = [
      ['佐藤 みゆき', '女', 'リーダー'], ['鈴木 けんた', '男', 'リーダー'], ['高橋 あおい', '女', ''],
      ['田中 そうた', '男', '別々1'], ['中村 はると', '男', '別々1'], ['小林 ゆい', '女', '同じ1'],
      ['石川 えま', '女', '同じ1'], ['渡辺 りく', '男', 'ちらす1'], ['林 ゆうき', '男', 'ちらす1']
    ];
    downloadCsv('名簿ひな形.csv', R.sharedRows(sample.map(function (x) {
      return { values: { 'なまえ': x[0], '性別': x[1], '班の配慮': x[2] } };
    })));
    rosterNote('ひな形をダウンロードしました。配慮は「別々1」のように、同じ番号どうしが1つの組になります。「;」で区切ると1人に何個でも付けられます。', 'ok');
  }

  /* ============================================================
     配線
     ============================================================ */

  /*
   * 分け方（2026-10-05）：「班の数」と「1班の人数」を名簿と切りはなして自由に選ぶ。
   * 班の数 × 1班の人数 が席の数。班ごとに変えたいときは、空の班の枠で 班・席 を足し引きする
   */
  function rebuildNums() {
    [['hw-num', '班'], ['hw-per', '人']].forEach(function (x) {
      var sel = $(x[0]), keep = sel.value;
      sel.innerHTML = '<option value="">---</option>';
      for (var i = 1; i <= 12; i++) {
        var o = document.createElement('option');
        o.value = i;
        o.textContent = i + x[1];
        sel.appendChild(o);
      }
      sel.value = keep || '';
    });
  }

  var onSizeChange = function () {
    touchedStep1 = true;
    clearResult();
    updateCount();
  };
  // プルダウンを選び直したら、班ごとに足し引きした席は捨てて「班の数 × 1班の人数」に戻す
  $('hw-num').addEventListener('change', function () { customSizes = null; onSizeChange(); renderList(); });
  $('hw-per').addEventListener('change', function () { customSizes = null; onSizeChange(); });

  /* 空の班の枠で、班ごとに 班・席 を足す／消す（2026-10-05） */
  function editSizes(fn) {
    if (!customSizes) customSizes = seatSizes();
    fn(customSizes);
    onSizeChange();
    renderList();   // 「固定」の班のプルダウンを班の数に合わせる
  }
  $('hw-board').addEventListener('click', function (e) {
    if (state.groups) return;
    var t = e.target.closest('button');
    if (!t) return;
    var g = Number(t.getAttribute('data-g'));
    if (t.classList.contains('hw-ghost-add')) editSizes(function (a) { a[g]++; });
    else if (t.classList.contains('hw-slot-del')) editSizes(function (a) { if (a[g] > 1) a[g]--; });
    else if (t.classList.contains('hw-group-del')) editSizes(function (a) { if (a.length > 1) a.splice(g, 1); });
    else if (t.classList.contains('hw-group-add')) editSizes(function (a) { a.push(Math.min.apply(null, a)); });
  });

  var list = $('hw-list');

  list.addEventListener('input', function (e) {
    if (!e.target.classList.contains('hw-name')) return;
    var s = rowOf(e.target);
    if (!s) return;
    s.name = e.target.value;
    refreshPartnerLabels();
    updateCount();
    updateSteps();
  });

  list.addEventListener('paste', function (e) {
    if (!e.target.classList.contains('hw-name')) return;
    var s = rowOf(e.target);
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (s && pasteNames(s, text)) e.preventDefault();
  });

  // Enter で次の行へ（最後の行なら1行足す）
  list.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing || !e.target.classList.contains('hw-name')) return;
    e.preventDefault();
    var inputs = Array.prototype.slice.call(list.querySelectorAll('.hw-name'));
    var at = inputs.indexOf(e.target);
    if (at === inputs.length - 1) addAndFocus(1);
    else inputs[at + 1].focus();
  });

  list.addEventListener('change', function (e) {
    var t = e.target, s = rowOf(t);
    if (!s) return;
    var rule = ruleOf(t, s);
    if (!rule) return;
    if (t.classList.contains('hw-kind')) {
      rule.kind = t.value;
      delete rule.to; delete rule.set; delete rule.g;
      if (rule.kind === 'scatter') rule.set = 1;
      if (rule.kind === 'fixed') rule.g = 0;
      clearResult();
      renderList();
      var box = list.querySelector('.hw-row[data-id="' + s.id + '"] .hw-rule[data-ri="' + s.rules.indexOf(rule) + '"]');
      var nextSel = box && box.querySelector('.hw-to, .hw-set, .hw-fg');
      (nextSel || (box && box.querySelector('.hw-kind')) || document.body).focus();
    } else if (t.classList.contains('hw-to')) {
      rule.to = t.value ? Number(t.value) : null;
      clearResult();
    } else if (t.classList.contains('hw-set')) {
      rule.set = Number(t.value);
      clearResult();
    } else if (t.classList.contains('hw-fg')) {
      rule.g = Number(t.value);
      clearResult();
    }
  });

  list.addEventListener('click', function (e) {
    var t = e.target, s = rowOf(t);
    if (!s) return;
    var seg = t.closest('.hw-seg-b');
    if (seg) {
      s.label = seg.getAttribute('data-label');
      // 押した行だけ塗り替える（全部描き直すと入力中のフォーカスが飛ぶ）
      Array.prototype.forEach.call(seg.parentNode.querySelectorAll('.hw-seg-b'), function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-label') === s.label);
      });
      if (state.groups) render();
      return;
    }
    if (t.classList.contains('hw-rule-add')) {
      s.rules.push({ kind: '' });
      renderList();
      var boxes = list.querySelectorAll('.hw-row[data-id="' + s.id + '"] .hw-kind');
      if (boxes.length) boxes[boxes.length - 1].focus();
    } else if (t.classList.contains('hw-rule-del')) {
      var rule = ruleOf(t, s);
      s.rules = s.rules.filter(function (x) { return x !== rule; });
      clearResult();
      renderList();
    } else if (t.classList.contains('hw-row-del')) {
      // 名前か配慮が入っている行だけ確かめる（空の行はそのまま消す）
      var label = R.cleanName(s.name) || ((students.indexOf(s) + 1) + '番');
      if ((s.name.trim() || s.rules.length) &&
          !window.confirm('「' + label + '」の行を消します。付けた配慮も消えます。よろしいですか？')) return;
      removeStudent(s);
    }
  });

  /* 名簿の名前を押す（名前欄に入る）と、結果のその子を光らせる */
  function highlight(name) {
    Array.prototype.forEach.call(document.querySelectorAll('#hw-board .is-hl'), function (x) { x.classList.remove('is-hl'); });
    if (!name) return;
    Array.prototype.forEach.call(document.querySelectorAll('#hw-board .hw-mem[data-name]'), function (x) {
      if (x.getAttribute('data-name') === name) x.classList.add('is-hl');
    });
  }
  function nameOfRow(el) {
    var row = el.closest && el.closest('.hw-row');
    if (!row) return null;
    var i = Array.prototype.indexOf.call(list.children, row);
    return i >= 0 ? displayNames()[i] : null;
  }
  list.addEventListener('focusin', function (e) { highlight(nameOfRow(e.target)); });
  list.addEventListener('focusout', function (e) { if (!list.contains(e.relatedTarget)) highlight(null); });

  $('hw-labelset-input').addEventListener('change', function () {
    var set = labelSet();
    students.forEach(function (s) { if (s.label && set.indexOf(s.label) < 0) s.label = ''; });
    renderList();
    updateBalanceName();
  });
  $('hw-labelset-name').addEventListener('change', function () { renderList(); updateBalanceName(); });

  $('hw-add1').addEventListener('click', function () { addAndFocus(1); });
  $('hw-add5').addEventListener('click', function () { addAndFocus(5); });
  $('hw-add10').addEventListener('click', function () { addAndFocus(10); });

  $('hw-gen').addEventListener('click', run);
  $('hw-gen2').addEventListener('click', run);
  $('hw-again').addEventListener('click', run);
  $('hw-copy').addEventListener('click', function () { R.copyText($('hw-out').value, this); });
  $('hw-print').addEventListener('click', function () { window.print(); });
  $('hw-download').addEventListener('click', function () { downloadState(true); });
  $('hw-csv-save').addEventListener('click', function () { downloadState(false); });
  $('hw-sample').addEventListener('click', function () {
    var filled = students.some(function (s) { return s.name.trim() || s.rules.length; });
    if (filled && !window.confirm('いま入っている名簿と配慮を、見本に入れかえます。よろしいですか？')) return;
    // 見本は女／男でラベルを付けてあるので、そろえる項目も既定に戻す
    $('hw-labelset-name').value = '性別';
    $('hw-labelset-input').value = '女, 男';
    updateBalanceName();
    // 見本は名簿（名前・性別・配慮）だけ。班の数などは触らず、班分けもしない（押すのは先生。2026-10-05）
    loadRoster(SAMPLE.map(function (x) { return { name: x[0], label: x[1] }; }), SAMPLE_RULES);
    clearPrev();
    showMsgs([]);
    rosterNote('見本の名簿（30人）を入れました。1で班の数などを選んで「班分けする」を押してください。', 'ok');
  });
  $('hw-prev-clear').addEventListener('click', clearPrev);

  /* 結果の入れかえ：ドラッグ＆ドロップ、またはタップで2人えらぶ。班の空いた所に落とすと移動 */
  var board = $('hw-board');
  var memAt = function (el) {
    var m = el && el.closest && el.closest('.hw-mem[data-at]');
    return m ? m.getAttribute('data-at') : null;
  };
  var groupAt = function (el) {
    var g = el && el.closest && el.closest('.hw-group[data-g]');
    return g ? Number(g.getAttribute('data-g')) : null;
  };
  board.addEventListener('click', function (e) {
    if (!state.groups) return;
    var at = memAt(e.target);
    if (at) { pickMember(at); return; }
    var g = groupAt(e.target);
    if (picked && g !== null) moveMember(picked, g);
  });
  board.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var at = memAt(e.target);
    if (!at) return;
    e.preventDefault();
    pickMember(at);
    var again = board.querySelector('.hw-mem[data-at="' + at + '"]');
    if (again) again.focus();
  });
  var dragFrom = null;
  var clearOver = function () {
    Array.prototype.forEach.call(board.querySelectorAll('.is-over'), function (x) { x.classList.remove('is-over'); });
  };
  board.addEventListener('dragstart', function (e) {
    dragFrom = memAt(e.target);
    if (!dragFrom) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragFrom);
    e.target.classList.add('is-dragging');
  });
  board.addEventListener('dragover', function (e) {
    if (!dragFrom || groupAt(e.target) === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearOver();
    (e.target.closest('.hw-mem') || e.target.closest('.hw-group')).classList.add('is-over');
  });
  board.addEventListener('drop', function (e) {
    if (!dragFrom) return;
    var to = memAt(e.target), g = groupAt(e.target);
    if (to === null && g === null) return;
    e.preventDefault();
    var from = dragFrom;
    dragFrom = null;
    clearOver();
    if (to) swapMembers(from, to); else moveMember(from, g);
  });
  board.addEventListener('dragend', function () {
    dragFrom = null;
    clearOver();
    Array.prototype.forEach.call(board.querySelectorAll('.is-dragging'), function (x) { x.classList.remove('is-dragging'); });
  });

  /* CSV */
  $('hw-csv').addEventListener('change', function () { if (this.files && this.files[0]) readCsvFile(this.files[0]); });
  $('hw-csv-template').addEventListener('click', downloadTemplate);
  $('hw-csv-head').addEventListener('change', function () { if (csvRows) renderCsvPick(); });
  $('hw-csv-cancel').addEventListener('click', closeCsvPick);
  $('hw-csv-ok').addEventListener('click', applyCsvPick);
  $('hw-csv-cols').addEventListener('change', function (e) {
    if (!e.target.classList.contains('hw-csv-role-sel')) return;
    csvRoles[Number(e.target.getAttribute('data-col'))] = e.target.value;
    renderCsvPick();
  });

  rebuildNums();
  addRows(START_ROWS);
  renderList();
})();
