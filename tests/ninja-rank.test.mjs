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
  assert.deepEqual({ ...score(10, 10, 4, 4) }, { rate: 1, accuracy: 600, speed: 400, total: 1000 });
  assert.equal(score(10, 10, 8, 4).speed, 200);           // 基準の2倍かかると はやさ点は半分
  assert.equal(score(10, 10, 2, 4).speed, 400);           // 基準より はやくても満点どまり
  assert.equal(score(5, 10, 1, 4).speed, 200);            // 正解率50%なら はやさ点も半分
  assert.equal(score(0, 10, 1, 4).total, 0);              // でたらめに はやく押しても0点
  assert.equal(score(0, 0, 0, 4).total, 0);
});

test('各ランクの下限と上限', () => {
  RANKS.forEach((r, i) => {
    const s = S(r.min, 1, 400);
    assert.equal(rankFor(s), i + 1, r.name + ' の下限');
    if (i > 0) assert.equal(rankFor(S(r.min - 1, 1, 400)), i, r.name + ' の1点下');
  });
});

test('追加条件で止まる', () => {
  assert.equal(name(S(900, 0.9, 300)), '里長');           // 1問ミスなら 900点でも 里長
  assert.equal(name(S(800, 0.8, 320)), '副頭領');         // 正解率90%未満は 副頭領どまり
  assert.equal(name(S(995, 1, 389)), '神出鬼没');         // はやさ点が足りないと 忍神にならない
  assert.equal(name(S(990, 1, 390)), '忍神');
});

test('実際の点の出かた', () => {
  assert.equal(RANKS[rankFor(score(0, 10, 3, 4)) - 1].name, '村人');
  assert.equal(RANKS[rankFor(score(10, 10, 4, 4)) - 1].name, '忍神');
  assert.equal(RANKS[rankFor(score(10, 10, 4 * 400 / 220, 4)) - 1].name, '里長'); // モックアップの 600+220=820
});
