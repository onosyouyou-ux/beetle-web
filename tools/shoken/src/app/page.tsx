'use client';

import { useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import ScrollTopButton from '@/components/ScrollTopButton';

type StyleId = 'desu' | 'dearu';
interface DraftSet {
  no: number;
  drafts: string[];
}

const GRADES = ['小学1年', '小学2年', '小学3年', '小学4年', '小学5年', '小学6年', '中学1年', '中学2年', '中学3年'];
const TERMS = ['1学期', '2学期', '3学期', '前期', '後期', '学年末'];
const LENGTHS = [80, 100, 120, 150, 200];
const FOCUS_OPTIONS = ['学習面', '生活面', '行事・特別活動', '係・当番', '友達との関わり', '学期を通した成長'];

/**
 * 1リクエストあたりの人数。
 * Vercelの関数上限は60秒。4人×2案×120字で約46秒かかったため、
 * 「案の数 × 文字数」から1回の分量を見積もって、上限に余裕をもって収まる人数に割る。
 */
const CHUNK_BUDGET = 800; // 1リクエストで作る「案の数 × 文字数」の目安（960で約46秒だったので余裕を見る）
function chunkSize(drafts: number, length: number): number {
  return Math.min(8, Math.max(1, Math.floor(CHUNK_BUDGET / (drafts * length))));
}

const SAMPLE_MEMO = `1 音読の宿題を毎日続けた。漢字の小テストで満点が増えた。
2 係の仕事を忘れずにやる。発表のとき声が小さい。
3 運動会のリレーで最後まで走りきった。授業中に隣の子と話してしまうことがある。
4 図工の作品づくりに時間をかけて取り組んだ。友達に道具を貸してあげていた。
5 計算のやり方を友達に教えていた。忘れ物が続いた時期があったが、後半は減った。`;

/** 「1 たろう」「1: …」のような行頭番号を落として本文だけ取り出す */
function parseMemoLines(text: string): { no: number; memo: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, i) => {
      const m = line.match(/^(\d+)\s*[.．、:：]?\s*(.*)$/);
      if (m && m[2]) return { no: Number(m[1]), memo: m[2].trim() };
      return { no: i + 1, memo: line };
    });
}

/** 名前らしき語が残っていないかの目安（ブロックはしない） */
function looksLikeName(entries: { memo: string }[]): boolean {
  return entries.some((e) => /[ぁ-んァ-ヶ一-龠]{1,4}(さん|くん|君|ちゃん)/.test(e.memo));
}

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);
  const [grade, setGrade] = useState('小学3年');
  const [term, setTerm] = useState('1学期');
  const [length, setLength] = useState(120);
  const [style, setStyle] = useState<StyleId>('desu');
  const [drafts, setDrafts] = useState<1 | 2>(2);
  const [focus, setFocus] = useState<string[]>([]);
  const [common, setCommon] = useState('');
  const [memoText, setMemoText] = useState('');

  const [results, setResults] = useState<DraftSet[]>([]);
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');

  const entries = useMemo(() => parseMemoLines(memoText), [memoText]);
  const nameWarning = useMemo(() => looksLikeName(entries), [entries]);
  const busy = progress !== null;

  function toggleFocus(f: string) {
    setFocus((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function keyOf(no: number, i: number) {
    return `${no}-${i}`;
  }

  function textOf(no: number, i: number, fallback: string) {
    const k = keyOf(no, i);
    return edited[k] !== undefined ? edited[k] : fallback;
  }

  async function run() {
    if (!entries.length) {
      setError('メモを1人分以上入力してください。');
      return;
    }
    setError('');
    setResults([]);
    setEdited({});

    const chunks: { no: number; memo: string }[][] = [];
    const size = chunkSize(drafts, length);
    for (let i = 0; i < entries.length; i += size) chunks.push(entries.slice(i, i + size));

    setProgress({ done: 0, total: entries.length });
    const acc: DraftSet[] = [];

    try {
      for (const chunk of chunks) {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ grade, term, length, style, focus, common, drafts, entries: chunk }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? '生成に失敗しました');
        acc.push(...(data.results as DraftSet[]));
        setResults([...acc]);
        setProgress({ done: acc.length, total: entries.length });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成に失敗しました。もう一度お試しください。');
    } finally {
      setProgress(null);
    }
  }

  function copy(text: string, el: HTMLButtonElement) {
    const done = () => {
      const old = el.textContent;
      el.textContent = 'コピーしました';
      setTimeout(() => {
        el.textContent = old;
      }, 1400);
    };
    navigator.clipboard?.writeText(text).then(done, done);
  }

  function allText(): string {
    return results
      .map((r) => {
        const body = textOf(r.no, 0, r.drafts[0] ?? '');
        return `${r.no}\t${body}`;
      })
      .join('\n');
  }

  return (
    <>
      <AppHeader />

      <div className="app-paper">
        {/* ── ヒーロー（たたみ機能つき。初期表示をノートPC1画面に収める） ── */}
        <div className="hero-band">
          <div className="ph-toggle-row">
            <button type="button" className="ph-toggle" onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? '説明をひらく ▽' : '説明をたたむ △'}
            </button>
          </div>
          {collapsed ? (
            <div className="ph-collapsed">
              <span className="ph-collapsed-title">所見メーカー</span>
            </div>
          ) : (
            <div className="hero-inner">
              <div className="hero-copy">
                <h1 className="hero-title">所見メーカー</h1>
                <p className="hero-desc">
                  子どもの様子のメモを、人数分まとめて貼るだけ。通知表の所見の下書きを一気に作ります。
                  <br />
                  <b>名前は入力しません</b>（番号だけで並べます）。できた文章は先生が直してから使ってください。
                </p>
                <a className="ph-ref" href="https://www.beetle-web.jp/tools/shoken/" target="_blank" rel="noopener">
                  リファレンス
                </a>
              </div>
              <div className="hero-visual" aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/hero-shoken.jpg" alt="" className="hero-img" />
              </div>
            </div>
          )}
        </div>

        <main className="mx-auto w-full max-w-[900px] px-5 pb-10 pt-6">
          {/* ── 設定 ── */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="ctrl-grid">
              <label className="ctrl-row">
                <span className="ctrl-lbl">学年</span>
                <select className="ctrl-select" value={grade} onChange={(e) => setGrade(e.target.value)}>
                  {GRADES.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </label>
              <label className="ctrl-row">
                <span className="ctrl-lbl">学期</span>
                <select className="ctrl-select" value={term} onChange={(e) => setTerm(e.target.value)}>
                  {TERMS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="ctrl-row">
                <span className="ctrl-lbl">文字数</span>
                <select
                  className="ctrl-select"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                >
                  {LENGTHS.map((l) => (
                    <option key={l} value={l}>
                      {l}字
                    </option>
                  ))}
                </select>
              </label>
              <label className="ctrl-row">
                <span className="ctrl-lbl">文体</span>
                <select
                  className="ctrl-select"
                  value={style}
                  onChange={(e) => setStyle(e.target.value as StyleId)}
                >
                  <option value="desu">です・ます</option>
                  <option value="dearu">である</option>
                </select>
              </label>
              <label className="ctrl-row">
                <span className="ctrl-lbl">案の数</span>
                <select
                  className="ctrl-select"
                  value={drafts}
                  onChange={(e) => setDrafts(Number(e.target.value) === 2 ? 2 : 1)}
                >
                  <option value={1}>1案</option>
                  <option value={2}>2案</option>
                </select>
              </label>
            </div>

            <div className="mt-4">
              <span className="field-label">入れたい観点（任意・複数可）</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {FOCUS_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleFocus(f)}
                    className={`rounded-md border px-3 py-1.5 text-[13px] font-bold transition-colors ${
                      focus.includes(f)
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-white text-ink hover:border-accent'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="field-label" htmlFor="sk-common">
                クラス共通のできごと（任意）
              </label>
              <input
                id="sk-common"
                className="input-base mt-1"
                value={common}
                onChange={(e) => setCommon(e.target.value)}
                placeholder="例：運動会・校外学習・音楽会"
              />
              <p className="mt-1 text-xs text-muted">
                その子のメモに関係する範囲でだけ使われます。参加のようすを勝手に作ることはしません。
              </p>
            </div>
          </section>

          {/* ── メモ入力 ── */}
          <section className="mt-5 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <span className="field-label">子どものようすメモ</span>
              <span className="text-xs font-bold text-accent">{entries.length}人</span>
              <button
                type="button"
                className="ml-auto rounded border border-border bg-white px-3 py-1 text-xs font-bold hover:border-accent"
                onClick={() => setMemoText(SAMPLE_MEMO)}
              >
                見本を入れる
              </button>
            </div>
            <textarea
              className="textarea-base mt-2"
              rows={10}
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              spellCheck={false}
              placeholder={'1 音読を毎日続けた。漢字テストで満点が増えた。\n2 係の仕事を忘れずにやる。発表の声が小さい。\n\n↑ 1行に1人ずつ。行頭の番号は出席番号（なくても大丈夫）'}
            />
            <p className="mt-2 text-xs leading-relaxed text-muted">
              <b>1行に1人</b>ずつ、その子で見えたことを短く書きます。よかったことも気になることも、事実のまま書いてください。
              気になることは「次に伸びる書き方」に変換して文章にします。
              メモはこの画面から生成のためだけに送られ、<b>保存はしていません</b>。
            </p>
            {nameWarning && (
              <p className="mt-2 rounded-md border border-amber-border bg-amber-bg px-3 py-2 text-xs font-bold text-amber-text">
                名前らしき言葉が入っています。所見に名前は要りません（番号だけで並べられます）。消してから作ることをおすすめします。
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={run}
                disabled={busy}
                className="rounded bg-accent px-6 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
              >
                {busy ? '作成中…' : '所見の下書きを作る'}
              </button>
              {progress && (
                <span className="text-sm font-bold text-ink">
                  {progress.done} / {progress.total} 人
                </span>
              )}
              {error && (
                <span className="rounded border border-red-border bg-red-bg px-3 py-2 text-xs font-bold text-red-text">
                  {error}
                </span>
              )}
            </div>
          </section>

          {/* ── 結果 ── */}
          {results.length > 0 && (
            <section className="mt-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="app-h2 !mt-0">できた下書き</h2>
                <button
                  type="button"
                  className="ml-auto rounded border border-border bg-white px-3 py-1.5 text-xs font-bold hover:border-accent"
                  onClick={(e) => copy(allText(), e.currentTarget)}
                >
                  1案目をまとめてコピー
                </button>
              </div>
              <p className="mt-1 text-xs text-muted">
                そのまま使わず、必ず先生が読み直して直してください。文章はこの画面で直接編集できます。
              </p>

              <div className="mt-4 grid gap-4">
                {results.map((r) => (
                  <div key={r.no} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-ink px-2 py-0.5 text-xs font-bold text-white">{r.no}</span>
                    </div>
                    <div className="grid gap-3">
                      {r.drafts.map((d, i) => {
                        const value = textOf(r.no, i, d);
                        return (
                          <div key={i}>
                            <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                              <span className="font-bold">案{i + 1}</span>
                              <span>{value.length}字</span>
                              <button
                                type="button"
                                className="ml-auto rounded border border-border bg-white px-2 py-0.5 font-bold hover:border-accent"
                                onClick={(e) => copy(value, e.currentTarget)}
                              >
                                コピー
                              </button>
                            </div>
                            <textarea
                              className="textarea-base"
                              rows={3}
                              value={value}
                              onChange={(e) =>
                                setEdited((prev) => ({ ...prev, [keyOf(r.no, i)]: e.target.value }))
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 使い方 ── */}
          <section className="app-section" id="howto">
            <p className="app-eyebrow">How to use</p>
            <h2 className="app-h2">使い方</h2>
            <div className="app-steps">
              <div className="app-step-card">
                <span className="app-step-no">1</span>
                <h3>ようすをメモする</h3>
                <p>
                  1行に1人ずつ、その子で見えたことを書きます。名前は要りません。行頭に出席番号を付けておくと、あとで名簿と突き合わせやすくなります。
                </p>
              </div>
              <div className="app-step-card">
                <span className="app-step-no">2</span>
                <h3>学年・文字数を決める</h3>
                <p>
                  学年・学期・文字数・文体を選びます。通知表の欄に合わせて文字数を決めてください。入れたい観点があれば選びます。
                </p>
              </div>
              <div className="app-step-card">
                <span className="app-step-no">3</span>
                <h3>作って、直して、使う</h3>
                <p>
                  人数分の下書きが並びます。その場で直せるので、言い回しを整えてからコピーして通知表に貼ってください。
                </p>
              </div>
            </div>
          </section>

          {/* ── FAQ（ランディングと同内容。変えるときは両方直す） ── */}
          <section className="app-section" id="faq">
            <p className="app-eyebrow">FAQ</p>
            <h2 className="app-h2">よくある質問</h2>
            <div className="app-faq-grid">
              <div className="app-faq-card">
                <h3>子どもの名前や成績は送られますか？</h3>
                <p>
                  名前を入力する欄がありません。送られるのは先生が書いたメモの文章だけで、サーバーにもブラウザにも保存していません。画面を閉じれば残りません。
                </p>
              </div>
              <div className="app-faq-card">
                <h3>気になる点を書いても大丈夫ですか？</h3>
                <p>
                  そのまま書いてください。事実は消さずに、次の学期に向けた前向きな言い方に変えて文章にします。決めつけや、他の子との比較は書きません。
                </p>
              </div>
              <div className="app-faq-card">
                <h3>そのまま通知表に貼っていいですか？</h3>
                <p>
                  下書きとして使ってください。所見はその子を見てきた先生の言葉です。事実の確認と最後の言い回しは、必ず先生の手で直してください。
                </p>
              </div>
              <div className="app-faq-card">
                <h3>何人分まで一度に作れますか？</h3>
                <p>
                  人数の上限はありません。8人ずつ順番に作るので、40人でも1回の操作で最後まで進みます。途中経過は画面に出ます。
                </p>
              </div>
            </div>
          </section>

          <p className="paper-release">更新日：{process.env.NEXT_PUBLIC_UPDATED_DATE}</p>
        </main>
      </div>

      <AppFooter />
      <ScrollTopButton />
    </>
  );
}
