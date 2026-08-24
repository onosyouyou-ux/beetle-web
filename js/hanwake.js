/* ============================================================
   hanwake.js — 班分けメーカー（先生向け）
   名簿と配慮からグループ分けを作る。席替えメーカーの姉妹ツールで、
   CSV取り込み・名前の読み取りは class-roster.js を共有する。
   計算はすべてブラウザ内で完結し、名簿はサーバーに送らない。

   ■ 入力は「1人1行」「配慮1件1行」のフォーム（2026-08-24に textarea から変更）
   名前を手で打ち直す／名簿と同じ書き方をさせる、という負担をなくすため、
   配慮の名前は**名簿から選ぶ**方式にした。打ち間違いも「名簿にありません」も起きない。
   「そろえる」は名簿側のトグルが担うので、配慮は 別々・同じ・ちらす の3種類だけになった。

   ■ 保存はCSVファイルだけ（2026-08-24決定）
   配慮も前回の班もCSVに入るようになったので、ブラウザ保存（localStorage）は役割が重なった。
   ブラウザ保存は端末ごとに分かれて職員室と自宅で共有できないうえ、
   「名簿は一切保存しません」と言い切れなくなるため、CSVに一本化した。
   35人をExcelから貼る流れは残したいので、「まとめて貼り付け」も併存させている。
   ============================================================ */
(function () {
  'use strict';

  var R = window.BeetleRoster;
  var $ = function (id) { return document.getElementById(id); };
  if (!$('hw-rows') || !R) return;

  var ATTEMPTS = 60;         // ランダムに置き直す回数（1回ごとに下の入れ替えで詰める）
  var IMPROVE_ROUNDS = 1200; // 1回の割り当てに対する入れ替えの試行回数

  var KIND_LABEL = { apart: '別々', together: '同じ', scatter: 'ちらす' };

  /* ---------- 画面の状態 ---------- */

  var seq = 0;
  var people = [];   // [{id, name, label}]
  var rules = [];    // [{id, kind, ids:[personId]}]
  var prevState = { pairs: null, when: '' };
  var state = { groups: null, tagOf: null };

  function nextId() { return ++seq; }

  function personById(id) {
    for (var i = 0; i < people.length; i++) if (people[i].id === id) return people[i];
    return null;
  }

  /**
   * 表示用の名前を確定させる。同姓同名は区別できないので2人目以降に印をつける
   * （席替えメーカーの名簿テキストと同じ考え方）。
   */
  function displayNames() {
    var seen = {}, map = {};
    people.forEach(function (p) {
      var n = (p.name || '').trim();
      if (!n) { map[p.id] = ''; return; }
      seen[n] = (seen[n] || 0) + 1;
      map[p.id] = seen[n] > 1 ? n + '（' + seen[n] + '）' : n;
    });
    return map;
  }

  function filledPeople() {
    return people.filter(function (p) { return (p.name || '').trim(); });
  }

  /* ---------- 名簿の行 ---------- */

  /** そろえる項目の名前（既定は「性別」）。CSVの見出しにも使う */
  function labelSetName() {
    return ($('hw-labelset-name').value || '').trim() || '性別';
  }

  /** そろえる項目の選択肢（既定は 女／男）。ここを変えれば係や委員会でも使える */
  function labelSet() {
    var raw = ($('hw-labelset-input').value || '').split(/[,、，\/／\s　]+/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    // 3つを超えると1行に収まらないので切る
    return raw.slice(0, 3);
  }

  function renderRows() {
    var set = labelSet();
    var html = '';
    people.forEach(function (p, i) {
      // 性別のような2〜3択は、打つより押すほうが速いのでトグルにする
      var seg = '<span class="hw-seg" role="group" aria-label="' + R.esc(p.name || (i + 1) + '人目') + 'の項目">' +
        '<button type="button" class="hw-seg-b' + (p.label ? '' : ' is-on') + '" data-label="">—</button>' +
        set.map(function (l) {
          return '<button type="button" class="hw-seg-b' + (p.label === l ? ' is-on' : '') +
            '" data-label="' + R.esc(l) + '">' + R.esc(l) + '</button>';
        }).join('') +
        '</span>';

      html += '<div class="hw-row" data-id="' + p.id + '">' +
        '<span class="hw-row-n">' + (i + 1) + '</span>' +
        '<input class="hw-row-name" type="text" value="' + R.esc(p.name) + '" placeholder="なまえ" autocomplete="off" spellcheck="false">' +
        seg +
        '<button type="button" class="hw-row-del" aria-label="' + R.esc(p.name || (i + 1) + '人目') + 'を消す">×</button>' +
        '</div>';
    });
    $('hw-rows').innerHTML = html;
    $('hw-rows-h-label').textContent = set.length ? labelSetName() : '—';
  }

  function addPerson(name, label, focus) {
    var p = { id: nextId(), name: name || '', label: label || '' };
    people.push(p);
    if (focus) {
      renderRows();
      var el = $('hw-rows').querySelector('.hw-row[data-id="' + p.id + '"] .hw-row-name');
      if (el) el.focus();
    }
    return p;
  }

  function removePerson(id) {
    people = people.filter(function (p) { return p.id !== id; });
    // 消した人が配慮に入っていたら、そこからも外す
    rules.forEach(function (r) {
      r.ids = r.ids.filter(function (x) { return x !== id; });
    });
    renderRows();
    renderRules();
    updateCount();
  }

  function setPeople(list) {
    people = list.map(function (p) {
      return { id: nextId(), name: (p.name || '').trim(), label: (p.label || '').trim() };
    });
    if (!people.length) addPerson();
    renderRows();
    updateCount();
  }

  /* ---------- 配慮の行 ---------- */

  function renderRules() {
    var names = displayNames();
    var html = '';

    rules.forEach(function (r) {
      var chips = r.ids.map(function (pid) {
        var p = personById(pid);
        if (!p) return '';
        return '<span class="hw-chip">' + R.esc(names[pid] || p.name || '（未入力）') +
          '<button type="button" class="hw-chip-x" data-rule="' + r.id + '" data-person="' + pid + '" aria-label="外す">×</button></span>';
      }).join('');

      // まだ選ばれていない人だけを候補に出す
      var options = '<option value="">＋ 人をえらぶ</option>';
      people.forEach(function (p) {
        if (!(p.name || '').trim()) return;
        if (r.ids.indexOf(p.id) >= 0) return;
        options += '<option value="' + p.id + '">' + R.esc(names[p.id]) + '</option>';
      });

      html += '<div class="hw-rule" data-rule="' + r.id + '">' +
        '<select class="hw-rule-kind" aria-label="配慮の種類">' +
          Object.keys(KIND_LABEL).map(function (k) {
            return '<option value="' + k + '"' + (r.kind === k ? ' selected' : '') + '>' + KIND_LABEL[k] + '</option>';
          }).join('') +
        '</select>' +
        '<div class="hw-rule-body">' + chips +
          '<select class="hw-rule-add" aria-label="人を追加">' + options + '</select>' +
        '</div>' +
        '<button type="button" class="hw-rule-del" aria-label="この配慮を消す">×</button>' +
        '</div>';
    });

    $('hw-rules').innerHTML = html;
    $('hw-rules-empty').hidden = rules.length > 0;
    $('hw-rule-count').textContent = rules.length + '件';
  }

  function addRule(kind, ids) {
    rules.push({ id: nextId(), kind: kind || 'apart', ids: ids || [] });
    renderRules();
  }

  /* ---------- 入力を解く形に組み立てる ---------- */

  /**
   * 画面の状態から、解く側が使う形に変換する。
   * balance（そろえる）は配慮欄ではなく、名簿のラベルから作る。
   */
  function buildInput() {
    var names = displayNames();
    var list = filledPeople().map(function (p) { return names[p.id]; });

    var out = { apart: [], together: [], balance: [], tagOf: {} };
    var errors = [];

    rules.forEach(function (r) {
      var picked = r.ids
        .map(function (pid) { return names[pid]; })
        .filter(function (n) { return n; });
      if (!picked.length) return;                      // 空の行は無視する
      if (picked.length < 2) {
        errors.push('「' + KIND_LABEL[r.kind] + '」は2人以上えらんでください。');
        return;
      }
      if (r.kind === 'together') {
        out.together.push(picked);
        picked.forEach(function (n) { out.tagOf[n] = '同じ'; });
      } else {
        out.apart.push(picked);
        picked.forEach(function (n) { out.tagOf[n] = KIND_LABEL[r.kind]; });
      }
    });

    // ラベルごとに「そろえる」を作る。1人だけのラベルは配りようがないので入れない
    var byLabel = {};
    filledPeople().forEach(function (p) {
      if (!p.label) return;
      (byLabel[p.label] = byLabel[p.label] || []).push(names[p.id]);
    });
    Object.keys(byLabel).forEach(function (label) {
      if (byLabel[label].length < 2) return;
      out.balance.push({ label: label, names: byLabel[label] });
    });

    return { names: list, rules: out, errors: errors };
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

  /** 1回ぶんの割り当て。「どのかたまりを何班に入れたか」を返す */
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

  function pairKey(a, b) {
    return a < b ? a + '' + b : b + '' + a;
  }

  /**
   * できあがりの「よくなさ」を数える。小さいほどよい。
   * 前回と同じ組み合わせ／ラベルの偏り は、守れないこともある希望なので
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
   * ラベルの偏りは、完璧に配っても0にはならない。
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

  /**
   * できた班を入れ替えて改善する（山登り）。
   * ランダムに置くだけだと「前回と同じ顔ぶれ」がなかなか0にならないため、
   * 同じ大きさのかたまりを2つ選んで交換し、よくなったときだけ採用する。
   * 班の人数を崩さないよう、交換するのは同じ大きさのかたまりだけにしている。
   */
  function improve(clusters, assign, count, rulesObj, prevPairs, apartOf, floorScore, rounds, forcedPairs) {
    var groups = buildGroups(clusters, assign, count);
    var cur = scoreOf(groups, rulesObj.balance, prevPairs, forcedPairs);

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
      var s = scoreOf(next, rulesObj.balance, prevPairs, forcedPairs);
      if (s.total < cur.total) {
        cur = s; groups = next;
      } else {
        assign[a] = ga; assign[b] = gb;
      }
    }
    return { groups: groups, score: cur };
  }

  function solve(names, count, rulesObj, prevPairs) {
    var clusters = buildClusters(names, rulesObj.together);
    var sizes = groupSizes(names.length, count);
    var apartOf = buildApartMap(rulesObj.apart);
    var floorScore = minBias(rulesObj.balance, count) * 3;   // これ以上はよくならない

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
      var got = improve(clusters, assign, count, rulesObj, prevPairs, apartOf, floorScore, IMPROVE_ROUNDS, forcedPairs);
      if (got.score.total < bestScore) {
        bestScore = got.score.total;
        best = got;
        if (bestScore <= floorScore + 0.001) break;
      }
    }
    return best;
  }

  /* ---------- 作れない理由を具体的に出す ---------- */

  function diagnose(names, count, rulesObj) {
    var msgs = [];
    if (count > names.length) {
      msgs.push({
        text: '班の数が人数より多いです。',
        sub: '名簿は' + names.length + '人ですが、' + count + '班に分けようとしています。',
        error: true
      });
    }

    var clusters = buildClusters(names, rulesObj.together);
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
    rulesObj.apart.forEach(function (g) {
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

    rulesObj.apart.forEach(function (g) {
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
    var input = buildInput();
    if (!input.names.length) {
      $('hw-result').classList.remove('is-on');
      showMsgs([{ text: '名簿が空です。', sub: '名前を入れるか、「見本を入れる」を押してください。', error: true }]);
      return;
    }
    if (input.errors.length) {
      $('hw-result').classList.remove('is-on');
      showMsgs(input.errors.map(function (t) { return { text: t, error: true }; }));
      return;
    }

    var count = groupCount(input.names.length);
    var problems = diagnose(input.names, count, input.rules);
    if (problems.length) {
      $('hw-result').classList.remove('is-on');
      showMsgs(problems);
      return;
    }

    var usePrev = !!(prevState.pairs && $('hw-prev-avoid').checked);
    var best = solve(input.names, count, input.rules, usePrev ? prevState.pairs : null);
    if (!best) {
      $('hw-result').classList.remove('is-on');
      showMsgs([{
        text: '配慮を全部守れる分け方が見つかりませんでした。',
        sub: '「別々」や「ちらす」が多すぎるか、「同じ」と重なって身動きが取れなくなっている可能性があります。配慮を1つ減らすか、班の数を変えて試してください。',
        error: true
      }]);
      return;
    }

    state = { groups: best.groups, tagOf: input.rules.tagOf, balance: input.rules.balance };
    showMsgs(softNotes(best.score, input.rules, count, usePrev));
    render();
  }

  /** 守りきれなかった希望を、エラーではなく「お知らせ」として出す */
  function softNotes(score, rulesObj, count, usePrev) {
    var notes = [];
    if (usePrev && score.repeats > 0) {
      notes.push({
        text: '前回と同じ班になった組み合わせが ' + score.repeats + '組 あります。',
        sub: 'この人数と班の数では避けきれませんでした。班の数を増やすと減らせます。'
      });
    }
    // 割り切れないぶんの偏り（どうやっても残る）を超えたときだけ知らせる
    if (rulesObj.balance.length && score.bias > minBias(rulesObj.balance, count) + 0.001) {
      notes.push({
        text: 'ラベルの人数に偏りが残りました。',
        sub: '「同じ」や「別々」を優先したためです。班ごとの内訳は下の表で確認してください。'
      });
    }
    return notes;
  }

  function render() {
    var groups = state.groups, tagOf = state.tagOf, balance = state.balance;
    var html = '';

    groups.forEach(function (g, i) {
      var members = g.map(function (n) {
        var tag = tagOf[n];
        return '<li>' + R.esc(n) + (tag ? '<span class="hw-tag">' + R.esc(tag) + '</span>' : '') + '</li>';
      }).join('');

      // ラベルを使っていたら、班ごとの内訳を出して先生が目で確かめられるようにする
      var counts = balance.map(function (b) {
        var set = {};
        b.names.forEach(function (x) { set[x] = true; });
        return R.esc(b.label) + ' ' + g.filter(function (n) { return set[n]; }).length;
      }).join('・');

      html += '<div class="hw-group">' +
        '<div class="hw-group-head"><span class="hw-group-n">' + (i + 1) + '班</span>' +
        '<span class="hw-group-size">' + g.length + '人' + (counts ? '（' + counts + '）' : '') + '</span></div>' +
        '<ul class="hw-members">' + members + '</ul>' +
        '</div>';
    });

    $('hw-board').innerHTML = html;
    $('hw-result').classList.add('is-on');

    var total = groups.reduce(function (a, g) { return a + g.length; }, 0);
    $('hw-info').textContent = groups.length + '班 / ' + total + '人';

    // Excelに貼れるようタブ区切りで出す（1行＝1班）
    $('hw-out').value = groups.map(function (g, i) {
      return [(i + 1) + '班'].concat(g).join('\t');
    }).join('\n');
  }

  function updateCount() {
    var n = filledPeople().length;
    $('hw-count').textContent = n + '人';

    var info = $('hw-plan');
    info.classList.remove('is-warn');
    if (!n) { info.textContent = '—'; return; }

    var count = groupCount(n);
    if (count > n) {
      // 「6班（1班 0〜1人）」のような意味のない表示を出さない
      info.textContent = n + '人を' + count + '班には分けられません';
      info.classList.add('is-warn');
      return;
    }
    var sizes = groupSizes(n, count);
    var min = Math.min.apply(null, sizes), max = Math.max.apply(null, sizes);
    info.textContent = count + '班（1班 ' + (min === max ? min + '人' : min + '〜' + max + '人') + '）';
  }

  /* ---------- 名簿の保存・よびだし ---------- */

  function rosterNote(text, kind) {
    var el = $('hw-roster-note');
    if (!text) { el.hidden = true; el.textContent = ''; el.className = 'hw-roster-note'; return; }
    el.hidden = false;
    el.textContent = text;
    el.className = 'hw-roster-note' + (kind ? ' is-' + kind : '');
  }

  /* ---------- 前回の班 ---------- */

  /**
   * 読みこんだCSVの「班」列から、前回いっしょだった組み合わせを取り出す。
   * ブラウザには何も保存しないので、前回の班はCSV経由でしか入ってこない。
   */
  function applyPrevGrouping(groups, when) {
    if (!groups || groups.length < 2) { clearPrev(); return; }
    var pairs = {};
    groups.forEach(function (members) {
      for (var i = 0; i < members.length; i++) {
        for (var j = i + 1; j < members.length; j++) pairs[pairKey(members[i], members[j])] = true;
      }
    });
    prevState = { pairs: pairs, when: when || '' };
    $('hw-prev').hidden = false;
    $('hw-prev-lbl').textContent = '読みこんだCSVの班を「前回の班」として使います';
  }

  function clearPrev() {
    prevState = { pairs: null, when: '' };
    $('hw-prev').hidden = true;
  }

  /* ---------- CSV ---------- */

  var csvRows = null, csvRoles = {};   // 列番号 → 'name' | 'label' | 'rule' | 'group'

  var ROLE_LABEL = { '': '（使わない）', name: 'なまえ', label: 'ラベル', rule: '配慮', group: '前回の班' };

  /** 見出しから列の役割を当てる。自分が書き出したCSVはそのまま読み戻せる */
  function autoDetectRoles(head) {
    var roles = {};
    head.forEach(function (raw, c) {
      var h = (raw || '').trim();
      if (!h) return;
      if (/^(出席番号|番号|no\.?|#)$/i.test(h)) return;              // 番号は使わない
      if (/(なまえ|名前|氏名|生徒名|児童名|姓|名|name)/i.test(h)) roles[c] = 'name';
      else if (/(ラベル|性別|せいべつ|gender|sex)/i.test(h)) roles[c] = 'label';
      else if (/(配慮|はいりょ)/i.test(h)) roles[c] = 'rule';
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
        }).join('') +
        '</select></div>';
    }
    $('hw-csv-cols').innerHTML = html;
    $('hw-csv-pick').hidden = false;
    rosterNote('');
  }

  function colsWithRole(role) {
    return Object.keys(csvRoles).filter(function (c) { return csvRoles[c] === role; })
      .map(Number).sort(function (a, b) { return a - b; });
  }

  /** 「別々1」「同じ2;ちらす3」のような書き方をほどく */
  function parseRuleCell(cell) {
    return String(cell || '').split(/[;；,、，\/／\s　]+/).map(function (t) {
      var m = t.trim().match(/^(別々|同じ|ちらす)\s*(\d*)$/);
      if (!m) return null;
      var kind = m[1] === '同じ' ? 'together' : (m[1] === 'ちらす' ? 'scatter' : 'apart');
      return { kind: kind, no: m[2] || '1' };
    }).filter(Boolean);
  }

  function applyCsvPick() {
    var nameCols = colsWithRole('name');
    if (!nameCols.length) { rosterNote('「なまえ」の列を1つ以上えらんでください。', 'error'); return; }
    var labelCol = colsWithRole('label')[0];
    var ruleCol = colsWithRole('rule')[0];
    var groupCol = colsWithRole('group')[0];

    var body = $('hw-csv-head').checked ? csvRows.slice(1) : csvRows;
    var list = [], ruleCells = [], groupCells = [];

    body.forEach(function (r) {
      var name = nameCols.map(function (c) { return (r[c] || '').trim(); }).filter(Boolean).join(' ').trim();
      if (!name) return;
      list.push({ name: name, label: labelCol >= 0 && labelCol !== undefined ? (r[labelCol] || '').trim() : '' });
      ruleCells.push(ruleCol === undefined ? '' : (r[ruleCol] || '').trim());
      groupCells.push(groupCol === undefined ? '' : (r[groupCol] || '').trim());
    });

    if (!list.length) { rosterNote('えらんだ列に名前が入っていませんでした。', 'error'); return; }

    setPeople(list);

    // 配慮：同じ「種類＋番号」の人どうしを1件にまとめる
    rules = [];
    var buckets = {};
    ruleCells.forEach(function (cell, i) {
      parseRuleCell(cell).forEach(function (t) {
        var key = t.kind + t.no;
        (buckets[key] = buckets[key] || { kind: t.kind, ids: [] }).ids.push(people[i].id);
      });
    });
    Object.keys(buckets).sort().forEach(function (k) {
      if (buckets[k].ids.length >= 2) rules.push({ id: nextId(), kind: buckets[k].kind, ids: buckets[k].ids });
    });
    renderRules();

    // 前回の班：班ごとに名前を集めて「同じ顔ぶれを避ける」の材料にする
    var byGroup = {};
    groupCells.forEach(function (g, i) {
      if (!g) return;
      (byGroup[g] = byGroup[g] || []).push(list[i].name);
    });
    var groupsFound = Object.keys(byGroup);
    applyPrevGrouping(groupsFound.sort().map(function (k) { return byGroup[k]; }));

    closeCsvPick();
    var got = [list.length + '人'];
    if (labelCol !== undefined) got.push('ラベル');
    if (rules.length) got.push('配慮' + rules.length + '件');
    if (groupsFound.length > 1) got.push('前回の班');
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

  var KIND_JP = { apart: '別々', together: '同じ', scatter: 'ちらす' };

  /** 人ごとの配慮セル（「別々1」「同じ2;ちらす3」）を作る */
  function ruleCellsByPerson() {
    var cells = {};
    var no = { apart: 0, together: 0, scatter: 0 };
    rules.forEach(function (r) {
      if (r.ids.length < 2) return;
      no[r.kind] += 1;
      var code = KIND_JP[r.kind] + no[r.kind];
      r.ids.forEach(function (pid) {
        cells[pid] = cells[pid] ? cells[pid] + ';' + code : code;
      });
    });
    return cells;
  }

  function downloadTemplate() {
    downloadCsv('班分け_名簿ひな形.csv', [
      ['出席番号', 'なまえ', '性別', '配慮', '班'],
      ['1', '佐藤 みゆき', '女', 'ちらす1', ''],
      ['2', '鈴木 けんた', '男', '', ''],
      ['3', '高橋 あおい', '女', '', ''],
      ['4', '田中 そうた', '男', '別々1', ''],
      ['5', '中村 はると', '男', '別々1', ''],
      ['6', '小林 ゆい', '女', '同じ1', ''],
      ['7', '石川 えま', '女', '同じ1', '']
    ]);
    rosterNote('ひな形をダウンロードしました。配慮は「別々1」のように、同じ番号どうしが1つの組になります。', 'ok');
  }

  /**
   * 名簿・そろえる項目・配慮・（あれば）できた班を1枚に書き出す。
   * このファイルを読み戻せば全部そのまま復元でき、班の列は「前回の班」として使われる。
   */
  function downloadState(withGroups) {
    var names = displayNames();
    var cells = ruleCellsByPerson();
    var groupOf = {};
    if (withGroups && state.groups) {
      state.groups.forEach(function (g, i) {
        g.forEach(function (n) { groupOf[n] = (i + 1) + '班'; });
      });
    }

    var rows = [['出席番号', 'なまえ', labelSetName(), '配慮', '班']];
    filledPeople().forEach(function (p, i) {
      var n = names[p.id];
      rows.push([String(i + 1), n, p.label || '', cells[p.id] || '', groupOf[n] || '']);
    });
    downloadCsv(withGroups ? '班分け.csv' : '班分け_名簿.csv', rows);
    rosterNote('CSVに保存しました。次回このファイルを「CSVを読む」から取り込めば、' +
      (withGroups ? '名簿・配慮・前回の班' : '名簿と配慮') + 'がそのまま戻ります。', 'ok');
  }

  /* ---------- まとめて貼り付け ---------- */

  function openBulk() {
    $('hw-names').value = namesText();
    $('hw-bulk').hidden = false;
    $('hw-names').focus();
  }

  function applyBulk() {
    var names = R.parseNames($('hw-names').value, false);
    if (!names.length) { rosterNote('名前が読み取れませんでした。', 'error'); return; }
    // 同じ名前の人には、いま付いているラベルを引き継ぐ
    var labelOf = {};
    people.forEach(function (p) { if (p.name.trim() && p.label) labelOf[p.name.trim()] = p.label; });
    setPeople(names.map(function (n) { return { name: n, label: labelOf[n] || '' }; }));
    renderRules();
    $('hw-bulk').hidden = true;
    rosterNote(names.length + '人にしました。', 'ok');
  }

  /* ---------- 見本 ---------- */

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

  function loadSample() {
    // 見本は女／男でラベルを付けてあるので、そろえる項目も既定に戻す
    $('hw-labelset-name').value = '性別';
    $('hw-labelset-input').value = '女, 男';
    setPeople(SAMPLE.map(function (s) { return { name: s[0], label: s[1] }; }));
    var idOf = {};
    people.forEach(function (p) { idOf[p.name] = p.id; });
    rules = [
      { id: nextId(), kind: 'apart', ids: [idOf['田中 そうた'], idOf['中村 はると']] },
      { id: nextId(), kind: 'together', ids: [idOf['小林 ゆい'], idOf['石川 えま']] },
      { id: nextId(), kind: 'scatter', ids: ['佐藤 みゆき', '渡辺 りく', '林 ゆうき', '前田 あさひ', '村上 ゆあ'].map(function (n) { return idOf[n]; }) }
    ];
    renderRules();
    $('hw-mode').value = 'groups';
    rebuildNums();
    $('hw-num').value = '6';
    clearPrev();
    rosterNote('');
    $('hw-bulk').hidden = true;
    updateCount();
    run();
  }

  /* ---------- 配線 ---------- */

  function rebuildNums() {
    var sel = $('hw-num');
    var mode = $('hw-mode').value;
    var keep = sel.value;
    sel.innerHTML = '';
    for (var i = 2; i <= 12; i++) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = mode === 'per' ? i + '人ずつ' : i + '班';
      sel.appendChild(o);
    }
    sel.value = keep || (mode === 'per' ? '4' : '6');
  }

  $('hw-mode').addEventListener('change', function () { rebuildNums(); updateCount(); });
  $('hw-num').addEventListener('change', updateCount);

  /* 名簿の行 */
  $('hw-rows').addEventListener('input', function (e) {
    var row = e.target.closest('.hw-row');
    if (!row) return;
    var p = personById(Number(row.getAttribute('data-id')));
    if (!p) return;
    if (e.target.classList.contains('hw-row-name')) {
      p.name = e.target.value;
      updateCount();
      renderRules();   // 配慮の候補と表示名を追従させる
    }
  });

  $('hw-rows').addEventListener('click', function (e) {
    var seg = e.target.closest('.hw-seg-b');
    if (seg) {
      var r = seg.closest('.hw-row');
      var p = personById(Number(r.getAttribute('data-id')));
      if (!p) return;
      p.label = seg.getAttribute('data-label');
      // 押した行だけ塗り替える（全部描き直すと入力中のフォーカスが飛ぶ）
      [].forEach.call(r.querySelectorAll('.hw-seg-b'), function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-label') === p.label);
      });
      return;
    }
    var btn = e.target.closest('.hw-row-del');
    if (!btn) return;
    removePerson(Number(btn.closest('.hw-row').getAttribute('data-id')));
  });

  $('hw-labelset-input').addEventListener('change', function () {
    // 項目から外れたラベルが人に残らないようにする
    var set = labelSet();
    people.forEach(function (p) { if (p.label && set.indexOf(p.label) < 0) p.label = ''; });
    renderRows();
  });

  // なまえ欄で Enter → 次の人へ。最後の行なら1人足す
  $('hw-rows').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target.classList.contains('hw-row-name')) return;
    e.preventDefault();
    var row = e.target.closest('.hw-row');
    var next = row.nextElementSibling;
    if (next) {
      next.querySelector('.hw-row-name').focus();
    } else {
      addPerson('', '', true);
      updateCount();
    }
  });

  // 複数行を貼られたら、そのぶんの行に展開する（Excelからの貼り付けを1行に潰さない）
  $('hw-rows').addEventListener('paste', function (e) {
    if (!e.target.classList.contains('hw-row-name')) return;
    var text = (e.clipboardData || window.clipboardData).getData('text');
    if (!/[\n\r\t]/.test(text)) return;
    e.preventDefault();

    var names = R.parseNames(text, false);
    if (!names.length) return;
    var row = e.target.closest('.hw-row');
    var id = Number(row.getAttribute('data-id'));
    var at = -1;
    people.forEach(function (p, i) { if (p.id === id) at = i; });

    var added = names.map(function (n) { return { id: nextId(), name: n, label: '' }; });
    people.splice.apply(people, [at, 1].concat(added));
    renderRows();
    renderRules();
    updateCount();
    rosterNote(names.length + '人を貼り付けました。', 'ok');
  });

  $('hw-add').addEventListener('click', function () { addPerson('', '', true); updateCount(); });
  $('hw-bulk-toggle').addEventListener('click', openBulk);
  $('hw-bulk-apply').addEventListener('click', applyBulk);
  $('hw-bulk-cancel').addEventListener('click', function () { $('hw-bulk').hidden = true; });

  /* 配慮の行 */
  $('hw-rule-add').addEventListener('click', function () { addRule('apart', []); });

  $('hw-rules').addEventListener('change', function (e) {
    var wrap = e.target.closest('.hw-rule');
    if (!wrap) return;
    var rid = Number(wrap.getAttribute('data-rule'));
    var rule = null;
    rules.forEach(function (r) { if (r.id === rid) rule = r; });
    if (!rule) return;

    if (e.target.classList.contains('hw-rule-kind')) {
      rule.kind = e.target.value;
      renderRules();
    } else if (e.target.classList.contains('hw-rule-add')) {
      var pid = Number(e.target.value);
      if (pid && rule.ids.indexOf(pid) < 0) rule.ids.push(pid);
      renderRules();
    }
  });

  $('hw-rules').addEventListener('click', function (e) {
    var x = e.target.closest('.hw-chip-x');
    if (x) {
      var rid = Number(x.getAttribute('data-rule')), pid = Number(x.getAttribute('data-person'));
      rules.forEach(function (r) {
        if (r.id === rid) r.ids = r.ids.filter(function (i) { return i !== pid; });
      });
      renderRules();
      return;
    }
    var del = e.target.closest('.hw-rule-del');
    if (del) {
      var id = Number(del.closest('.hw-rule').getAttribute('data-rule'));
      rules = rules.filter(function (r) { return r.id !== id; });
      renderRules();
    }
  });

  /* 実行・結果 */
  $('hw-gen').addEventListener('click', run);
  $('hw-again').addEventListener('click', run);
  $('hw-copy').addEventListener('click', function () { R.copyText($('hw-out').value, this); });
  $('hw-print').addEventListener('click', function () { window.print(); });
  $('hw-download').addEventListener('click', function () { downloadState(true); });
  $('hw-csv-save').addEventListener('click', function () { downloadState(false); });
  $('hw-sample').addEventListener('click', loadSample);

  $('hw-prev-clear').addEventListener('click', clearPrev);

  /* CSV */
  $('hw-csv').addEventListener('change', function () {
    if (this.files && this.files[0]) readCsvFile(this.files[0]);
  });
  $('hw-csv-template').addEventListener('click', downloadTemplate);
  $('hw-csv-head').addEventListener('change', function () { if (csvRows) renderCsvPick(); });
  $('hw-csv-cancel').addEventListener('click', closeCsvPick);
  $('hw-csv-ok').addEventListener('click', applyCsvPick);
  // 列ごとに役割をえらぶ（見出しから自動で当たっていることが多い）
  $('hw-csv-cols').addEventListener('change', function (e) {
    if (!e.target.classList.contains('hw-csv-role-sel')) return;
    csvRoles[Number(e.target.getAttribute('data-col'))] = e.target.value;
    renderCsvPick();
  });

  rebuildNums();
  setPeople([{ name: '' }, { name: '' }, { name: '' }]);
  renderRules();

})();
