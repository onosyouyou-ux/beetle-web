/* ============================================================
   hanwake.js — 班分けメーカー（先生向け）
   名簿と配慮からグループ分けを作る。席替えメーカーの姉妹ツールで、
   名簿まわり（貼り付け・CSV取り込み・保存）は class-roster.js を共有する。
   計算はすべてブラウザ内で完結し、名簿はサーバーに送らない。
   ============================================================ */
(function () {
  'use strict';

  var R = window.BeetleRoster;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('hw-names') || !R) return;

  var ATTEMPTS = 60;         // ランダムに置き直す回数（1回ごとに下の入れ替えで詰める）
  var IMPROVE_ROUNDS = 1200; // 1回の割り当てに対する入れ替えの試行回数

  var SAMPLE_NAMES = [
    '1 佐藤 みゆき', '2 鈴木 けんた', '3 高橋 あおい', '4 田中 そうた', '5 伊藤 ひなた',
    '6 渡辺 りく', '7 山本 さくら', '8 中村 はると', '9 小林 ゆい', '10 加藤 だいち',
    '11 吉田 めい', '12 山田 かなた', '13 佐々木 のあ', '14 山口 いつき', '15 松本 ひまり',
    '16 井上 そら', '17 木村 あかり', '18 林 ゆうき', '19 清水 みなと', '20 山崎 ひなの',
    '21 森 かいと', '22 池田 つむぎ', '23 橋本 りひと', '24 石川 えま', '25 前田 あさひ',
    '26 藤田 ことね', '27 後藤 はやと', '28 岡田 みお', '29 長谷川 れん', '30 村上 ゆあ'
  ].join('\n');

  var SAMPLE_RULES = [
    '別々: 田中 そうた, 中村 はると',
    '同じ: 小林 ゆい, 石川 えま',
    'ちらす: 佐藤 みゆき, 渡辺 りく, 林 ゆうき, 前田 あさひ, 村上 ゆあ',
    'そろえる: 女子 = 佐藤 みゆき, 高橋 あおい, 伊藤 ひなた, 山本 さくら, 小林 ゆい, 吉田 めい, 松本 ひまり, 木村 あかり, 山崎 ひなの, 池田 つむぎ, 石川 えま, 藤田 ことね, 岡田 みお, 村上 ゆあ, 佐々木 のあ'
  ].join('\n');

  var splitOnSpace = false;

  /* ---------- 配慮を読む ---------- */

  function parseRules(text, names) {
    // tagOf は表示専用。「別々」と「ちらす」は中身が同じ制約なので、
    // 先生が書いたほうの言葉をそのまま結果に出すために覚えておく
    var rules = { apart: [], together: [], balance: [], tagOf: {} };
    var errors = [];
    var known = {};
    names.forEach(function (n) { known[n] = true; });

    // 名簿がフルネームでも、配慮欄には「田中」だけ書けるようにする
    var resolve = function (n, lineNo) {
      if (known[n]) return n;
      var hit = names.filter(function (x) { return x.indexOf(n) >= 0; });
      if (hit.length === 1) return hit[0];
      if (hit.length > 1) {
        errors.push(lineNo + '行目：「' + n + '」に当てはまる人が' + hit.length + '人います。名簿と同じ書き方にしてください。');
        return null;
      }
      errors.push(lineNo + '行目：「' + n + '」は名簿にありません。');
      return null;
    };

    var resolveList = function (body, lineNo) {
      var list = R.splitList(body).map(function (n) { return resolve(n, lineNo); });
      return list.some(function (x) { return !x; }) ? null : list;
    };

    text.split('\n').forEach(function (raw, i) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var lineNo = i + 1;
      var m = line.match(/^([^:：]+)[:：](.*)$/);
      if (!m) {
        errors.push(lineNo + '行目：「別々: 田中, 佐藤」のように、種類と名前を「:」で区切って書いてください。');
        return;
      }
      var kind = m[1].trim(), body = m[2].trim();

      // 「別々」も「ちらす」も中身は同じ制約（全員ちがう班）。
      // 書く人の気持ちが違うだけなので、両方の言い方を受ける。
      var isScatter = /^(ちらす|散らす|分散|リーダー)$/.test(kind);
      if (/^(別々|別|わける|分ける|ちがう|違う)$/.test(kind) || isScatter) {
        var apart = resolveList(body, lineNo);
        if (!apart) return;
        if (apart.length < 2) { errors.push(lineNo + '行目：「' + kind + '」は2人以上を「,」で並べてください。'); return; }
        rules.apart.push(apart);
        apart.forEach(function (n) { rules.tagOf[n] = isScatter ? 'ちらす' : '別々'; });

      } else if (/^(同じ|同|いっしょ|一緒)$/.test(kind)) {
        var together = resolveList(body, lineNo);
        if (!together) return;
        if (together.length < 2) { errors.push(lineNo + '行目：「同じ」は2人以上を「,」で並べてください。'); return; }
        rules.together.push(together);
        together.forEach(function (n) { rules.tagOf[n] = '同じ'; });

      } else if (/^(そろえる|揃える|均等|バランス)$/.test(kind)) {
        var parts = body.split(/[=＝]/);
        if (parts.length < 2) {
          errors.push(lineNo + '行目：「そろえる: 女子 = 佐藤, 高橋」のように、まとまりの名前と人を「=」で区切ってください。');
          return;
        }
        var label = parts[0].trim() || 'まとまり';
        var members = resolveList(parts.slice(1).join('='), lineNo);
        if (!members) return;
        if (!members.length) { errors.push(lineNo + '行目：「そろえる」に人が書かれていません。'); return; }
        rules.balance.push({ label: label, names: members });

      } else {
        errors.push(lineNo + '行目：「' + kind + '」は使えません。別々・同じ・ちらす・そろえる のどれかにしてください。');
      }
    });

    return { rules: rules, errors: errors };
  }

  /* ---------- 班を決める ---------- */

  /** 「同じ」でつながった人をひとかたまりにする（A・BとB・Cなら A・B・C が1つ） */
  function buildClusters(names, together) {
    var parent = {};
    names.forEach(function (n) { parent[n] = n; });
    var find = function (x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    };
    var union = function (a, b) { parent[find(a)] = find(b); };

    together.forEach(function (g) {
      for (var i = 1; i < g.length; i++) union(g[0], g[i]);
    });

    var byRoot = {};
    names.forEach(function (n) {
      var r = find(n);
      (byRoot[r] = byRoot[r] || []).push(n);
    });
    return Object.keys(byRoot).map(function (k) { return byRoot[k]; });
  }

  /** 人数を班に振り分ける（35人4班なら 9,9,9,8） */
  function groupSizes(total, count) {
    var base = Math.floor(total / count);
    var rem = total % count;
    var sizes = [];
    for (var i = 0; i < count; i++) sizes.push(base + (i < rem ? 1 : 0));
    return sizes;
  }

  function buildApartMap(apart) {
    var map = {};
    apart.forEach(function (g) {
      g.forEach(function (a) {
        g.forEach(function (b) {
          if (a !== b) (map[a] = map[a] || {})[b] = true;
        });
      });
    });
    return map;
  }

  function clusterFits(group, cluster, apartOf) {
    for (var i = 0; i < cluster.length; i++) {
      var mine = apartOf[cluster[i]];
      if (!mine) continue;
      for (var j = 0; j < group.length; j++) {
        if (mine[group[j]]) return false;
      }
    }
    return true;
  }

  /**
   * 1回ぶんの割り当て。「どのかたまりを何班に入れたか」を返す
   * （あとで入れ替えて改善するので、班の中身ではなく割り当てを持つ）。
   * うまく入らなければ null を返して呼び出し側でやり直す。
   */
  function tryOnce(clusters, sizes, apartOf) {
    var count = sizes.length;
    var members = [], remain = sizes.slice();
    for (var i = 0; i < count; i++) members.push([]);

    var assign = new Array(clusters.length);
    // 大きいかたまりほど入る場所が少ないので先に置く。同じ大きさの中はランダム
    var order = clusters.map(function (cl, i) { return i; });
    R.shuffle(order).sort(function (a, b) { return clusters[b].length - clusters[a].length; });

    for (var o = 0; o < order.length; o++) {
      var ci = order[o], cl = clusters[ci];
      var cand = [];
      for (var g = 0; g < count; g++) {
        if (remain[g] < cl.length) continue;
        if (!clusterFits(members[g], cl, apartOf)) continue;
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

  /** その班の中に「別々」の相手どうしが同居していないか */
  function groupOk(list, apartOf) {
    for (var i = 0; i < list.length; i++) {
      var mine = apartOf[list[i]];
      if (!mine) continue;
      for (var j = 0; j < list.length; j++) {
        if (i !== j && mine[list[j]]) return false;
      }
    }
    return true;
  }

  /**
   * できた班を入れ替えて改善する（山登り）。
   * ランダムに置くだけだと「前回と同じ顔ぶれ」がなかなか0にならないため、
   * 同じ大きさのかたまりを2つ選んで交換し、よくなったときだけ採用する。
   * 班の人数を崩さないよう、交換するのは同じ大きさのかたまりだけにしている。
   */
  function improve(clusters, assign, count, rules, prevPairs, apartOf, floorScore, rounds, forcedPairs) {
    var groups = buildGroups(clusters, assign, count);
    var cur = scoreOf(groups, rules.balance, prevPairs, forcedPairs);

    for (var r = 0; r < rounds; r++) {
      if (cur.total <= floorScore + 0.001) break;
      var a = Math.floor(Math.random() * clusters.length);
      var b = Math.floor(Math.random() * clusters.length);
      if (a === b || assign[a] === assign[b]) continue;
      if (clusters[a].length !== clusters[b].length) continue;

      var ga = assign[a], gb = assign[b];
      assign[a] = gb; assign[b] = ga;
      var next = buildGroups(clusters, assign, count);

      if (!groupOk(next[ga], apartOf) || !groupOk(next[gb], apartOf)) {
        assign[a] = ga; assign[b] = gb;
        continue;
      }
      var s = scoreOf(next, rules.balance, prevPairs, forcedPairs);
      if (s.total < cur.total) {
        cur = s; groups = next;
      } else {
        assign[a] = ga; assign[b] = gb;
      }
    }
    return { groups: groups, score: cur };
  }

  function pairKey(a, b) {
    return a < b ? a + '' + b : b + '' + a;
  }

  /**
   * できあがりの「よくなさ」を数える。小さいほどよい。
   * 前回と同じ組み合わせ／まとまりの偏り は、守れないこともある希望なので
   * エラーにせずスコアにして、いちばんマシなものを選ぶ。
   */
  function scoreOf(groups, balance, prevPairs, forcedPairs) {
    var repeats = 0;
    if (prevPairs) {
      groups.forEach(function (g) {
        for (var i = 0; i < g.length; i++) {
          for (var j = i + 1; j < g.length; j++) {
            var k = pairKey(g[i], g[j]);
            // 「同じ」で先生が組ませた2人は、前回も今回も一緒で当たり前。
            // ここを数えると「避けきれませんでした」と嘘の警告が出る
            if (forcedPairs && forcedPairs[k]) continue;
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
      groups.forEach(function (g) {
        var c = g.filter(function (n) { return set[n]; }).length;
        bias += Math.abs(c - ideal);
      });
    });

    return { repeats: repeats, bias: bias, total: repeats * 10 + bias * 3 };
  }

  /**
   * 「そろえる」の偏りは、完璧に配っても0にはならない。
   * 15人を6班に配れば1班2.5人が理想で、実際は2人か3人にしかできず 0.5×6＝3 残る。
   * この「どうやっても残る分」を先に出しておき、警告の基準と打ち切り判定に使う。
   */
  function minBias(balance, count) {
    return balance.reduce(function (sum, b) {
      var m = b.names.length;
      var rem = m % count;
      return sum + 2 * rem * (1 - rem / count);
    }, 0);
  }

  function solve(names, count, rules, prevPairs) {
    var clusters = buildClusters(names, rules.together);
    var sizes = groupSizes(names.length, count);
    var apartOf = buildApartMap(rules.apart);
    var floorScore = minBias(rules.balance, count) * 3;   // これ以上はよくならない

    // 「同じ」で必ず一緒になる2人。前回と同じでも当然なので、重複には数えない
    var forcedPairs = {};
    clusters.forEach(function (cl) {
      for (var i = 0; i < cl.length; i++) {
        for (var j = i + 1; j < cl.length; j++) forcedPairs[pairKey(cl[i], cl[j])] = true;
      }
    });

    var best = null, bestScore = Infinity;
    for (var t = 0; t < ATTEMPTS; t++) {
      var assign = tryOnce(clusters, sizes, apartOf);
      if (!assign) continue;

      // 置いただけでは「前回と同じ顔ぶれ」が残るので、入れ替えて詰める
      var got = improve(clusters, assign, count, rules, prevPairs, apartOf, floorScore, IMPROVE_ROUNDS, forcedPairs);
      if (got.score.total < bestScore) {
        bestScore = got.score.total;
        best = got;
        if (bestScore <= floorScore + 0.001) break;
      }
    }
    return best;
  }

  /* ---------- 作れない理由を具体的に出す ---------- */

  function diagnose(names, count, rules) {
    var msgs = [];
    if (count < 1) {
      msgs.push({ text: '班の数が0です。', error: true });
      return msgs;
    }
    if (count > names.length) {
      msgs.push({
        text: '班の数が人数より多いです。',
        sub: '名簿は' + names.length + '人ですが、' + count + '班に分けようとしています。',
        error: true
      });
    }

    var clusters = buildClusters(names, rules.together);
    var sizes = groupSizes(names.length, count);
    var maxSize = Math.max.apply(null, sizes);

    clusters.forEach(function (cl) {
      if (cl.length > maxSize) {
        msgs.push({
          text: '「同じ」でまとめた人が、1つの班に入りきりません。',
          sub: '「' + cl.join('・') + '」の' + cl.length + '人ですが、1班は最大' + maxSize + '人です。班の数を減らすか、「同じ」を減らしてください。',
          error: true
        });
      }
    });

    // 「同じ」と「別々」が同じ2人に付いていたら成立しない
    var rootOf = {};
    clusters.forEach(function (cl, i) { cl.forEach(function (n) { rootOf[n] = i; }); });
    rules.apart.forEach(function (g) {
      for (var i = 0; i < g.length; i++) {
        for (var j = i + 1; j < g.length; j++) {
          if (rootOf[g[i]] === rootOf[g[j]]) {
            msgs.push({
              text: '「同じ」と「別々」が矛盾しています。',
              sub: '「' + g[i] + '」と「' + g[j] + '」は、同じ班にする指定と、別の班にする指定の両方が効いています。',
              error: true
            });
          }
        }
      }
    });

    rules.apart.forEach(function (g) {
      if (g.length > count) {
        msgs.push({
          text: 'ちらしきれません。',
          sub: '「' + g.join('・') + '」の' + g.length + '人を別々の班にするには、' + g.length + '班以上が必要です（いまは' + count + '班）。',
          error: true
        });
      }
    });

    return msgs;
  }

  /* ---------- 画面に出す ---------- */

  var state = { groups: null, rules: null, score: null };
  var prevState = { pairs: null, when: '' };
  var currentRosterId = '';

  function showMsgs(list) {
    $('hw-msg').innerHTML = list.map(function (m) {
      return '<div class="hw-note' + (m.error ? ' is-error' : '') + '">' + R.esc(m.text) +
        (m.sub ? '<span>' + R.esc(m.sub) + '</span>' : '') + '</div>';
    }).join('');
  }

  /** 「班の数」で指定されたか「1班の人数」で指定されたかを、班の数に直す */
  function groupCount(total) {
    var n = parseInt($('hw-num').value, 10);
    if ($('hw-mode').value === 'per') return Math.max(1, Math.ceil(total / n));
    return n;
  }

  function run() {
    var names = R.parseNames($('hw-names').value, splitOnSpace);
    if (!names.length) {
      $('hw-result').classList.remove('is-on');
      showMsgs([{ text: '名簿が空です。', sub: '名前を1行に1人ずつ貼り付けるか、「見本を入れる」を押してください。', error: true }]);
      return;
    }

    var count = groupCount(names.length);
    var parsed = parseRules($('hw-rules').value, names);
    if (parsed.errors.length) {
      $('hw-result').classList.remove('is-on');
      showMsgs(parsed.errors.map(function (t) { return { text: t, error: true }; }));
      return;
    }

    var problems = diagnose(names, count, parsed.rules);
    if (problems.length) {
      $('hw-result').classList.remove('is-on');
      showMsgs(problems);
      return;
    }

    var usePrev = !!(prevState.pairs && $('hw-prev-avoid').checked);
    var best = solve(names, count, parsed.rules, usePrev ? prevState.pairs : null);
    if (!best) {
      $('hw-result').classList.remove('is-on');
      showMsgs([{
        text: '配慮を全部守れる分け方が見つかりませんでした。',
        sub: '「別々」や「ちらす」の指定が多すぎるか、「同じ」と重なって身動きが取れなくなっている可能性があります。条件を1つ減らすか、班の数を変えて試してください。',
        error: true
      }]);
      return;
    }

    state = { groups: best.groups, rules: parsed.rules, score: best.score };
    showMsgs(softNotes(best.score, parsed.rules, count, usePrev));
    render();
  }

  /** 守りきれなかった希望を、エラーではなく「お知らせ」として出す */
  function softNotes(score, rules, count, usePrev) {
    var notes = [];
    if (usePrev && score.repeats > 0) {
      notes.push({
        text: '前回と同じ班になった組み合わせが ' + score.repeats + '組 あります。',
        sub: 'この人数と班の数では避けきれませんでした。班の数を増やすと減らせます。'
      });
    }
    // 割り切れないぶんの偏り（どうやっても残る）を超えたときだけ知らせる
    if (rules.balance.length && score.bias > minBias(rules.balance, count) + 0.001) {
      notes.push({
        text: '「そろえる」に偏りが残りました。',
        sub: '「同じ」や「別々」を優先したためです。班ごとの内訳は下の表で確認してください。'
      });
    }
    return notes;
  }

  function render() {
    var groups = state.groups, rules = state.rules;
    var board = $('hw-board');

    var html = '';
    groups.forEach(function (g, i) {
      var members = g.map(function (n) {
        var tag = rules.tagOf[n];
        return '<li>' + R.esc(n) + (tag ? '<span class="hw-tag">' + R.esc(tag) + '</span>' : '') + '</li>';
      }).join('');

      // 「そろえる」を指定していたら、班ごとの内訳を出して先生が目で確かめられるようにする
      var counts = rules.balance.map(function (b) {
        var set = {};
        b.names.forEach(function (x) { set[x] = true; });
        var c = g.filter(function (n) { return set[n]; }).length;
        return R.esc(b.label) + ' ' + c;
      }).join('・');

      html += '<div class="hw-group">' +
        '<div class="hw-group-head"><span class="hw-group-n">' + (i + 1) + '班</span>' +
        '<span class="hw-group-size">' + g.length + '人' + (counts ? '（' + counts + '）' : '') + '</span></div>' +
        '<ul class="hw-members">' + members + '</ul>' +
        '</div>';
    });
    board.innerHTML = html;
    $('hw-result').classList.add('is-on');

    var total = groups.reduce(function (a, g) { return a + g.length; }, 0);
    $('hw-info').textContent = groups.length + '班 / ' + total + '人';

    // Excelに貼れるようタブ区切りで出す（1行＝1班）
    var lines = groups.map(function (g, i) { return [(i + 1) + '班'].concat(g).join('\t'); });
    $('hw-out').value = lines.join('\n');
  }

  function updateCount() {
    var names = R.parseNames($('hw-names').value, splitOnSpace);
    var n = names.length;
    $('hw-count').textContent = n + '人';
    updateSepNote(names);

    var info = $('hw-plan');
    if (!n) { info.textContent = '—'; return; }
    var count = groupCount(n);
    var sizes = groupSizes(n, count);
    var min = Math.min.apply(null, sizes), max = Math.max.apply(null, sizes);
    info.textContent = count + '班（1班 ' + (min === max ? min + '人' : min + '〜' + max + '人') + '）';
  }

  // 「1行に1人」が伝わりにくいので、詰まって見えるときだけその場で直せるようにする
  function updateSepNote(names) {
    var note = $('hw-sep-note');
    if (!note) return;
    if (splitOnSpace) {
      note.hidden = false;
      note.innerHTML = 'スペースでも区切って ' + names.length + '人 として読んでいます。' +
        '<button type="button" class="hw-mini" id="hw-sep-off">もとに戻す</button>';
      $('hw-sep-off').addEventListener('click', function () { splitOnSpace = false; updateCount(); });
      return;
    }
    if (R.looksCrammed(names)) {
      note.hidden = false;
      note.innerHTML = '名前が1行に詰まっていませんか？ いまは ' + names.length + '人 として読んでいます。' +
        '<button type="button" class="hw-mini" id="hw-sep-on">スペースでも区切る</button>';
      $('hw-sep-on').addEventListener('click', function () { splitOnSpace = true; updateCount(); });
      return;
    }
    note.hidden = true;
    note.innerHTML = '';
  }

  /* ---------- 名簿の保存・よびだし ---------- */

  function rosterNote(text, kind) {
    var el = $('hw-roster-note');
    if (!text) { el.hidden = true; el.textContent = ''; el.className = 'hw-roster-note'; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = 'hw-roster-note' + (kind ? ' is-' + kind : '');
  }

  function refreshRosterList() {
    var sel = $('hw-roster-list');
    var list = R.load();
    sel.innerHTML = '<option value="">' + (list.length ? '保存した名簿…' : '保存した名簿はまだありません') + '</option>';
    list.forEach(function (r) {
      var o = document.createElement('option');
      o.value = r.id;
      o.textContent = r.label + '（' + R.parseNames(r.names || '').length + '人・' + r.savedAt + '）';
      sel.appendChild(o);
    });
    sel.value = currentRosterId && list.some(function (r) { return r.id === currentRosterId; }) ? currentRosterId : '';
  }

  function doSaveRoster(label) {
    var current = R.find(currentRosterId) || {};
    var rec = {
      id: currentRosterId || R.newId(),
      label: label,
      names: $('hw-names').value,
      // 配慮は席替えと班分けで書き方が違うので、それぞれ別に持つ
      rules: current.rules || '',
      hanwakeRules: $('hw-rules').value,
      cols: current.cols,
      rows: current.rows,
      seating: current.seating || null,
      seatingAt: current.seatingAt,
      grouping: current.grouping || null,
      groupingAt: current.groupingAt,
      savedAt: R.today()
    };
    if (!R.upsert(rec)) {
      rosterNote('このブラウザでは保存できませんでした（プライベートモードなどの可能性があります）。', 'error');
      return;
    }
    currentRosterId = rec.id;
    refreshRosterList();
    rosterNote('「' + label + '」を保存しました。席替えメーカーからも同じ名簿を使えます。', 'ok');
  }

  function doLoadRoster(id) {
    var rec = R.find(id);
    if (!rec) { rosterNote('よびだす名簿をえらんでください。', 'error'); return; }
    currentRosterId = rec.id;
    $('hw-names').value = rec.names || '';
    $('hw-rules').value = rec.hanwakeRules || '';
    splitOnSpace = false;
    applyPrevGrouping(rec);
    updateCount();
    rosterNote('「' + rec.label + '」をよびだしました。', 'ok');
  }

  function doDeleteRoster(id) {
    var rec = R.find(id);
    if (!rec) { rosterNote('消す名簿をえらんでください。', 'error'); return; }
    if (!window.confirm('「' + rec.label + '」を消します。席替えメーカーからも消えます。よろしいですか？')) return;
    R.remove(id);
    if (currentRosterId === id) { currentRosterId = ''; clearPrev(); }
    refreshRosterList();
    rosterNote('「' + rec.label + '」を消しました。', 'ok');
  }

  /* ---------- 前回の班 ---------- */

  function applyPrevGrouping(rec) {
    var g = rec && rec.grouping;
    if (!g || !g.length) { clearPrev(); return; }
    var pairs = {};
    g.forEach(function (members) {
      for (var i = 0; i < members.length; i++) {
        for (var j = i + 1; j < members.length; j++) pairs[pairKey(members[i], members[j])] = true;
      }
    });
    prevState = { pairs: pairs, when: rec.groupingAt || rec.savedAt };
    $('hw-prev').hidden = false;
    $('hw-prev-lbl').textContent = '前回の班（' + prevState.when + '）をよみこみました';
  }

  function clearPrev() {
    prevState = { pairs: null, when: '' };
    $('hw-prev').hidden = true;
  }

  function rememberGrouping() {
    if (!state.groups) return;
    if (!currentRosterId) {
      rosterNote('先に「保存」で名簿に名前をつけてください。班はその名簿におぼえます。', 'error');
      return;
    }
    var rec = R.find(currentRosterId);
    if (!rec) { rosterNote('保存した名簿が見つかりませんでした。', 'error'); return; }
    rec.grouping = state.groups;
    rec.groupingAt = R.today();
    if (!R.upsert(rec)) { rosterNote('このブラウザでは保存できませんでした。', 'error'); return; }
    applyPrevGrouping(rec);
    rosterNote('この班を「' + rec.label + '」におぼえました。次の班分けで避けられます。', 'ok');
  }

  /* ---------- CSV取り込み ---------- */

  var csvRows = null, csvPicked = {};

  function readCsvFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var text = R.decode(reader.result);
      var rows = R.parseDelimited(text, R.detectSep(text));
      if (!rows.length) { rosterNote('このファイルからは名前を読み取れませんでした。', 'error'); return; }
      csvRows = rows;
      csvPicked = {};
      var guess = R.guessNameCol(rows);
      if (guess >= 0) csvPicked[guess] = true;
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
      html += '<button type="button" class="hw-csv-col' + (csvPicked[c] ? ' is-on' : '') +
        '" data-col="' + c + '"><span class="hw-csv-h">' + R.esc(head) + '</span>' +
        '<span class="hw-csv-v">' + R.esc(val) + '</span></button>';
    }
    $('hw-csv-cols').innerHTML = html;
    $('hw-csv-pick').hidden = false;
    rosterNote('');
  }

  function applyCsvPick() {
    var cols = Object.keys(csvPicked).filter(function (c) { return csvPicked[c]; })
      .map(Number).sort(function (a, b) { return a - b; });
    if (!cols.length) { rosterNote('名前の列を1つ以上えらんでください。', 'error'); return; }

    var body = $('hw-csv-head').checked ? csvRows.slice(1) : csvRows;
    var names = body.map(function (r) {
      return cols.map(function (c) { return (r[c] || '').trim(); }).filter(Boolean).join(' ').trim();
    }).filter(Boolean);

    if (!names.length) { rosterNote('えらんだ列に名前が入っていませんでした。', 'error'); return; }

    $('hw-names').value = names.join('\n');
    splitOnSpace = false;
    closeCsvPick();
    updateCount();
    rosterNote(names.length + '人を読みこみました。', 'ok');
  }

  function closeCsvPick() {
    $('hw-csv-pick').hidden = true;
    csvRows = null;
    csvPicked = {};
    $('hw-csv').value = '';
  }

  /* ---------- 配線 ---------- */

  (function fillNums() {
    var sel = $('hw-num');
    sel.innerHTML = '';
    var mode = $('hw-mode').value;
    for (var i = 2; i <= 12; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = mode === 'per' ? i + '人ずつ' : i + '班';
      if ((mode === 'per' && i === 4) || (mode === 'groups' && i === 6)) o.selected = true;
      sel.appendChild(o);
    }
  })();

  $('hw-mode').addEventListener('change', function () {
    var sel = $('hw-num');
    var mode = this.value;
    var keep = sel.value;
    sel.innerHTML = '';
    for (var i = 2; i <= 12; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = mode === 'per' ? i + '人ずつ' : i + '班';
      sel.appendChild(o);
    }
    sel.value = keep;
    updateCount();
  });

  $('hw-names').addEventListener('input', updateCount);
  $('hw-num').addEventListener('change', updateCount);
  $('hw-gen').addEventListener('click', run);
  $('hw-again').addEventListener('click', run);
  $('hw-copy').addEventListener('click', function () { R.copyText($('hw-out').value, this); });
  $('hw-print').addEventListener('click', function () { window.print(); });
  $('hw-remember').addEventListener('click', rememberGrouping);

  $('hw-sample').addEventListener('click', function () {
    $('hw-names').value = SAMPLE_NAMES;
    $('hw-rules').value = SAMPLE_RULES;
    $('hw-mode').value = 'groups';
    $('hw-mode').dispatchEvent(new Event('change'));
    $('hw-num').value = '6';
    currentRosterId = '';
    clearPrev();
    refreshRosterList();
    rosterNote('');
    updateCount();
    run();
  });

  $('hw-roster-list').addEventListener('change', function () {
    if (this.value) doLoadRoster(this.value);
  });
  $('hw-roster-load').addEventListener('click', function () { doLoadRoster($('hw-roster-list').value); });
  $('hw-roster-del').addEventListener('click', function () { doDeleteRoster($('hw-roster-list').value); });
  $('hw-roster-save').addEventListener('click', function () {
    if (!R.parseNames($('hw-names').value, splitOnSpace).length) {
      rosterNote('名簿が空です。名前を入れてから保存してください。', 'error');
      return;
    }
    var current = R.find(currentRosterId);
    $('hw-save-name').value = current ? current.label : '';
    $('hw-save-row').hidden = false;
    $('hw-save-name').focus();
  });
  $('hw-save-cancel').addEventListener('click', function () { $('hw-save-row').hidden = true; });
  $('hw-save-ok').addEventListener('click', function () {
    var label = $('hw-save-name').value.trim();
    if (!label) { rosterNote('名簿の名前を入れてください（例：3年2組）。', 'error'); return; }
    $('hw-save-row').hidden = true;
    doSaveRoster(label);
  });
  $('hw-save-name').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $('hw-save-ok').click(); }
  });

  $('hw-prev-clear').addEventListener('click', clearPrev);

  $('hw-csv').addEventListener('change', function () {
    if (this.files && this.files[0]) readCsvFile(this.files[0]);
  });
  $('hw-csv-head').addEventListener('change', function () { if (csvRows) renderCsvPick(); });
  $('hw-csv-cancel').addEventListener('click', closeCsvPick);
  $('hw-csv-ok').addEventListener('click', applyCsvPick);
  $('hw-csv-cols').addEventListener('click', function (e) {
    var btn = e.target.closest('.hw-csv-col');
    if (!btn) return;
    var c = btn.getAttribute('data-col');
    csvPicked[c] = !csvPicked[c];
    btn.classList.toggle('is-on', !!csvPicked[c]);
  });

  refreshRosterList();
  updateCount();
})();
