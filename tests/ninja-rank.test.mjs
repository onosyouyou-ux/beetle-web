// 忍者ランクの判定（#173）。node --test tests/ninja-rank.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ctx = { globalThis: {} };
ctx.globalThis = ctx;
vm.runInNewContext(readFileSync(new URL('../js/ninja-rank.js', import.meta.url), 'utf8'), ctx);
const { score, rankFor, RANKS } = ctx.NinjaRank;
const name = (s) => RANKS[rankFor(s) - 1].name;
// スコアの合計と内訳を直接つくる（境界を確かめるため）
const S = (total, rate = 1, speed = 0) => ({ total, rate, speed, accuracy: total - speed });

test('24段階ある', () => assert.equal(RANKS.length, 24));

test('スコアの計算', () => {
  assert.deepEqual({ ...score(10, 10, 4, 4) }, { rate: 1, accuracy: 400, speed: 600, total: 1000 });
  assert.equal(score(10, 10, 8, 4).speed, 300);           // 基準の2倍かかると はやさ点は半分
  assert.equal(score(10, 10, 2, 4).speed, 600);           // 基準より はやくても満点どまり
  assert.equal(score(5, 10, 1, 4).speed, 150);            // 正解率50%なら はやさ点は 1/4
  assert.equal(score(0, 10, 1, 4).total, 0);              // でたらめに はやく押しても0点
  assert.equal(score(0, 0, 0, 4).total, 0);
});

test('各ランクの下限と上限', () => {
  RANKS.forEach((r, i) => {
    const s = S(r.min, 1, 600);
    assert.equal(rankFor(s), i + 1, r.name + ' の下限');
    if (i > 0) assert.equal(rankFor(S(r.min - 1, 1, 600)), i, r.name + ' の1点下');
  });
});

test('追加条件で止まる', () => {
  assert.equal(name(S(900, 0.9, 540)), '里長');           // 1問ミスなら 900点でも 里長
  assert.equal(name(S(800, 0.8, 480)), '副頭領');         // 正解率90%未満は 副頭領どまり
  assert.equal(name(S(995, 1, 584)), '神出鬼没');         // はやさ点が足りないと 忍神にならない
  assert.equal(name(S(990, 1, 585)), '忍神');
});

test('実際の点の出かた', () => {
  assert.equal(RANKS[rankFor(score(0, 10, 3, 4)) - 1].name, '村人');            // 全問不正解は 村人
  assert.equal(RANKS[rankFor(score(3, 10, 1, 4)) - 1].name, '下忍・二段');      // 3もん正解は はやくても 下忍
  assert.equal(RANKS[rankFor(score(9, 10, 1, 4)) - 1].name, '里長');            // 1問ミスなら 最速でも 里長まで
  assert.equal(RANKS[rankFor(score(10, 10, 4, 4)) - 1].name, '忍神');
  assert.equal(RANKS[rankFor(score(10, 10, 600, 4)) - 1].name, '上忍・初段');   // 全問正解なら どれだけ遅くても 上忍
  assert.equal(RANKS[rankFor(score(9, 10, 600, 4)) - 1].name, '中忍・三段');    // 1問ミスで遅いと 上忍に届かない
  assert.equal(RANKS[rankFor(score(10, 10, 8, 4)) - 1].name, '副頭領');         // 基準の2倍の時間で 400+300=700
});
