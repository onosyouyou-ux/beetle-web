'use client';

interface Props {
  onStart: () => void;
}

const PAINS = [
  '今月の出来事はあるけど、文章にする時間がない',
  '見出しを考えるのが地味に大変',
  'Wordでレイアウトを整えるのが面倒',
  '子どもの写真を使うのは少し気になる',
];

const STEPS = [
  { n: '1', title: '今月の出来事をメモする', note: '運動会・遠足・持ち物連絡など、箇条書きでOK。' },
  { n: '2', title: 'AIで見出しと文章を整える', note: 'ボタンひとつで読みやすい紙面の文章に。' },
  { n: '3', title: 'PDFで保存して印刷する', note: 'A4でダウンロード。そのまま配れます。' },
];

const FEATURES = [
  { icon: '✏️', label: 'メモから文章化' },
  { icon: '📑', label: '見出しを自動作成' },
  { icon: '🎨', label: 'イラスト付きで作成' },
  { icon: '📄', label: 'PDFで保存' },
];

export default function AppIntro({ onStart }: Props) {
  return (
    <section className="border-b border-[#eee6d8] bg-gradient-to-b from-[#fffaf0] to-[#ffffff]">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* ── ファーストビュー ── */}
        <div className="text-center max-w-[680px] mx-auto">
          <h1 className="text-[26px] sm:text-[34px] font-extrabold text-[#1c1c2e] leading-tight tracking-tight">
            学級通信、メモだけで完成。
          </h1>
          <p className="mt-4 text-[14px] sm:text-[15px] text-[#5a544c] leading-[1.9]">
            運動会、遠足、今月の様子、持ち物連絡。<br className="hidden sm:block" />
            箇条書きで入れるだけで、AIが見出しと文章を整えます。<br className="hidden sm:block" />
            A4の紙面に流し込み、PDFでダウンロードできます。
          </p>
          <div className="mt-7">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full bg-[#C0634C] text-white text-[15px] sm:text-[16px] font-bold px-9 py-3.5 shadow-[0_8px_24px_rgba(192,99,76,0.3)] hover:bg-[#a9543f] hover:-translate-y-0.5 transition-all"
            >
              ✏️ 無料で作ってみる
            </button>
            <p className="mt-3 text-[12px] text-[#9a938a]">登録不要・ブラウザだけで使えます</p>
          </div>

          {/* 機能（4つだけ） */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {FEATURES.map((f) => (
              <div key={f.label} className="rounded-xl bg-white border border-[#eee6d8] py-3 px-2">
                <div className="text-[22px] leading-none">{f.icon}</div>
                <div className="mt-1.5 text-[12px] font-bold text-[#3a352e]">{f.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── こんなことで止まっていませんか？ ── */}
        <div className="mt-12 max-w-[760px] mx-auto">
          <h2 className="text-center text-[18px] sm:text-[20px] font-extrabold text-[#1c1c2e]">
            こんなことで止まっていませんか？
          </h2>
          <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PAINS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 rounded-xl bg-[#fef6ef] border border-[#f3e2d3] px-4 py-3 text-[13px] text-[#5a544c] leading-relaxed">
                <span className="text-[#C0634C] shrink-0">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 3ステップ ── */}
        <div className="mt-12 max-w-[860px] mx-auto">
          <h2 className="text-center text-[18px] sm:text-[20px] font-extrabold text-[#1c1c2e]">かんたん3ステップ</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white border border-[#eee6d8] p-5 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-gradient-to-br from-[#C0634C] to-[#dd8a5c] text-white font-extrabold text-[17px] flex items-center justify-center shadow-[0_4px_12px_rgba(192,99,76,0.3)]">
                  {s.n}
                </div>
                <div className="mt-3 text-[14px] font-bold text-[#1c1c2e]">{s.title}</div>
                <div className="mt-1.5 text-[12px] text-[#6a635a] leading-relaxed">{s.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 入力例 → できあがり例 ── */}
        <div className="mt-12 max-w-[860px] mx-auto">
          <h2 className="text-center text-[18px] sm:text-[20px] font-extrabold text-[#1c1c2e]">
            こんな“雑なメモ”でOK
          </h2>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            {/* 入力例 */}
            <div className="rounded-2xl bg-[#fffaf0] border border-[#f0e4cf] p-5">
              <div className="text-[11px] font-bold text-[#b08534] tracking-wide mb-2">入力（メモ）</div>
              <ul className="text-[13px] text-[#5a544c] leading-[1.9] list-disc pl-5">
                <li>運動会の練習をがんばった</li>
                <li>リレーのバトンパスが上手になった</li>
                <li>給食当番の準備が早くなった</li>
                <li>来週は遠足。水筒と帽子を忘れずに</li>
              </ul>
            </div>
            {/* できあがり例 */}
            <div className="rounded-2xl bg-[#f0f7fb] border border-[#d8e9f2] p-5">
              <div className="text-[11px] font-bold text-[#3f7ba0] tracking-wide mb-2">できあがり（AIが整える）</div>
              <div className="text-[13px] text-[#3a4a52] leading-[1.95]">
                <span className="block font-bold text-[#1c1c2e] mb-1.5">運動会に向けて、毎日がんばっています</span>
                運動会に向けて、子どもたちは毎日の練習をがんばっています。特にリレーでは、バトンパスの声かけが少しずつ上手になってきました。給食当番の準備も早くなり、クラス全体で協力する姿が増えています。
              </div>
            </div>
          </div>
          <div className="mt-7 text-center">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-full bg-[#C0634C] text-white text-[15px] font-bold px-9 py-3.5 shadow-[0_8px_24px_rgba(192,99,76,0.3)] hover:bg-[#a9543f] hover:-translate-y-0.5 transition-all"
            >
              ✏️ 下の入力欄からそのまま作れます
            </button>
            <p className="mt-3 text-[12px] text-[#9a938a]">登録不要・ブラウザだけで使えます</p>
          </div>
        </div>

      </div>
    </section>
  );
}
