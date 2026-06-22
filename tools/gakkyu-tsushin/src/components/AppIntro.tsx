'use client';

interface Props {
  onStart: () => void;
}

const PAINS = [
  { img: '/illust/lp/pain-time.jpg', text: '今月の出来事はあるけど、文章にする時間がない' },
  { img: '/illust/lp/pain-heading.jpg', text: '見出しを考えるのが地味に大変' },
  { img: '/illust/lp/pain-layout.jpg', text: 'Wordでレイアウトを整えるのが面倒' },
  { img: '/illust/lp/pain-photo.jpg', text: '子どもの写真を使うのは少し気になる' },
];

const FEATURES = [
  { tag: 'A', img: '/illust/lp/feat-write.jpg', name: 'メモから文章化', desc: '箇条書きでもOK。AIが読みやすい文章に整えます。', tint: 'bg-[#fef6ef] border-[#f3e2d3]' },
  { tag: 'B', img: '/illust/lp/feat-illust.jpg', name: 'イラストで安心', desc: '写真なしでも使えるから、顔出しが気になる場面でも安心。', tint: 'bg-[#f0f7fb] border-[#d8e9f2]' },
  { tag: 'C', img: '/illust/lp/feat-pdf.jpg', name: 'PDFですぐ配れる', desc: '仕上がった紙面をそのままダウンロードして印刷できます。', tint: 'bg-[#f3f8f0] border-[#dcebd5]' },
];

const STEPS = [
  { n: '1', img: '/illust/lp/step-memo.jpg', title: '今月の出来事をメモする', note: '箇条書きでOK。思いついたことを書き出します。' },
  { n: '2', img: '/illust/lp/step-ai.jpg', title: 'AIで見出しと文章を整える', note: 'AIが見出しを考え、読みやすい文章にまとめます。' },
  { n: '3', img: '/illust/lp/step-pdf.jpg', title: 'PDFで保存して印刷する', note: 'A4の紙面をPDFで保存して、そのまま印刷できます。' },
];

export default function AppIntro({ onStart }: Props) {
  return (
    <>
      {/* ───────── ヒーロー ───────── */}
      <section className="bg-gradient-to-b from-[#fdf3e3] to-[#fffaf2] border-b border-[#f0e4cf]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* 左：コピー */}
          <div>
            <div className="text-[12px] font-extrabold tracking-[0.18em] text-[#C0634C]">CLASS NEWSLETTER MAKER</div>
            <h1 className="mt-3 text-[30px] sm:text-[42px] font-extrabold text-[#1c1c2e] leading-[1.2] tracking-tight">
              学級通信、<br />メモだけで完成。
            </h1>
            <p className="mt-5 text-[14px] sm:text-[15px] text-[#5a544c] leading-[1.95]">
              連絡会、遠足、今月の様子、持ち物連絡。<br />
              園だよりやクラスだよりで、AIが見出しと文章を整えます。<br />
              A4の紙面に流し込み、PDFでダウンロードできます。
            </p>
            <div className="mt-8">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center gap-2 rounded-full bg-[#C0634C] text-white text-[16px] font-bold px-10 py-4 shadow-[0_10px_28px_rgba(192,99,76,0.32)] hover:bg-[#a9543f] hover:-translate-y-0.5 transition-all"
              >
                無料で作ってみる <span className="text-[18px]">›</span>
              </button>
              <p className="mt-3 text-[12px] text-[#9a938a]">登録不要・ブラウザだけで使えます</p>
            </div>
          </div>

          {/* 右：疑似プレビュー（HTML / SEO・レスポンシブ対応） */}
          <div className="relative" aria-hidden="true">
            <div className="rounded-2xl bg-white border border-[#ece6da] shadow-[0_16px_40px_rgba(0,0,0,0.08)] p-3 sm:p-4 flex gap-3">
              {/* 紙面ミニ */}
              <div className="flex-1 min-w-0 rounded-lg border border-[#eee] p-3">
                <div className="flex justify-between text-[8px] text-[#999]">
                  <span>○○小学校　3年1組</span><span>2024年5月号</span>
                </div>
                <div className="text-center text-[18px] font-extrabold text-[#5a3a2e] my-1.5" style={{ fontFamily: "'Shippori Mincho', serif" }}>クラスだより</div>
                <div className="text-center text-[9px] font-bold bg-[#fdf3e3] rounded py-1 mb-1.5">みんなでがんばった運動会！</div>
                <div className="h-16 rounded bg-gradient-to-b from-[#bfe0f5] to-[#cfeccd] flex items-center justify-center text-[22px]">🏃‍♂️🏃‍♀️</div>
                <div className="mt-1.5 space-y-0.5">
                  <div className="h-1 bg-[#eee] rounded w-full" /><div className="h-1 bg-[#eee] rounded w-[92%]" /><div className="h-1 bg-[#eee] rounded w-[80%]" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  <div className="rounded border border-[#eee] p-1.5"><div className="text-[8px] font-bold mb-0.5">今月の様子</div><div className="h-0.5 bg-[#eee] rounded mb-0.5" /><div className="h-0.5 bg-[#eee] rounded w-[80%]" /></div>
                  <div className="rounded border border-[#eee] p-1.5"><div className="text-[8px] font-bold mb-0.5">お知らせ</div><div className="h-0.5 bg-[#eee] rounded mb-0.5" /><div className="h-0.5 bg-[#eee] rounded w-[80%]" /></div>
                </div>
              </div>
              {/* 入力パネルミニ */}
              <div className="w-[34%] shrink-0 text-[8px] text-[#666] space-y-2">
                <div className="font-bold text-[9px] text-[#1c1c2e]">メモを入力</div>
                <div><div className="font-bold">記事1</div><div className="text-[#999]">・運動会をがんばった<br />・力を合わせた</div></div>
                <div><div className="font-bold">今月の行事</div><div className="text-[#999]">・遠足</div></div>
                <div><div className="font-bold">イラストを選ぶ</div><div className="flex gap-0.5 mt-0.5">{['🎌','🏃','🌸','🌳'].map((e,i)=>(<span key={i} className="w-4 h-4 rounded bg-[#f3efe7] flex items-center justify-center text-[9px]">{e}</span>))}</div></div>
                <div className="rounded bg-[#C0634C] text-white text-center font-bold py-1 text-[8px]">✦ AIで整える</div>
              </div>
            </div>
            <div className="absolute -top-3 -right-2 text-[34px] opacity-80 select-none">☁️</div>
          </div>
        </div>
      </section>

      <div className="max-w-[1180px] mx-auto px-4 sm:px-6">

        {/* ───────── 悩み ───────── */}
        <section className="py-12 sm:py-14">
          <h2 className="text-center text-[20px] sm:text-[24px] font-extrabold text-[#1c1c2e]">こんなことで止まっていませんか？</h2>
          <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {PAINS.map((p) => (
              <div key={p.text} className="rounded-2xl bg-white border border-[#eee6d8] p-4 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img} alt="" className="w-full aspect-[4/3] object-contain" />
                <div className="mt-1 text-[13px] text-[#5a544c] leading-relaxed">{p.text}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── できること ───────── */}
        <section id="features" className="py-12 sm:py-14">
          <h2 className="text-center text-[20px] sm:text-[24px] font-extrabold text-[#1c1c2e]">学級通信メーカーでできること</h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.tag} className={`rounded-2xl border p-5 ${f.tint}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.img} alt="" className="w-full aspect-[4/3] object-contain rounded-xl bg-white" />
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#C0634C] text-white text-[12px] font-bold flex items-center justify-center shrink-0">{f.tag}</span>
                  <span className="text-[15px] font-extrabold text-[#1c1c2e]">{f.name}</span>
                </div>
                <p className="mt-2 text-[13px] text-[#5a544c] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ───────── 3ステップ ───────── */}
        <section id="steps" className="py-12 sm:py-14">
          <h2 className="text-center text-[20px] sm:text-[24px] font-extrabold text-[#1c1c2e]">使い方は3ステップ</h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative rounded-2xl bg-white border border-[#eee6d8] p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C0634C] to-[#dd8a5c] text-white font-extrabold flex items-center justify-center shadow-[0_4px_12px_rgba(192,99,76,0.3)]">{s.n}</span>
                  <span className="text-[14px] font-bold text-[#1c1c2e]">{s.title}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt="" className="w-16 h-12 object-contain shrink-0" />
                  <p className="text-[12px] text-[#6a635a] leading-relaxed">{s.note}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <span className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-[#cbb9a8] text-[18px] z-10">▶</span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ───────── 入力例 ───────── */}
        <section className="py-12 sm:py-14">
          <h2 className="text-center text-[20px] sm:text-[24px] font-extrabold text-[#1c1c2e]">このくらいのメモでOK</h2>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="rounded-2xl bg-[#fffaf0] border border-[#f0e4cf] p-5">
              <div className="text-[11px] font-bold text-[#b08534] tracking-wide mb-2">入力例</div>
              <ul className="text-[13px] text-[#5a544c] leading-[1.95] list-disc pl-5">
                <li>運動会の練習をがんばった</li>
                <li>リレーのバトンパスが上手になった</li>
                <li>給食当番の準備が早くなった</li>
                <li>来週は遠足。水筒と帽子を忘れずに</li>
              </ul>
            </div>
            <div className="text-center text-[#dd8a5c] text-[28px] md:rotate-0 rotate-90">➜</div>
            <div className="rounded-2xl bg-[#f0f7fb] border border-[#d8e9f2] p-5">
              <div className="text-[11px] font-bold text-[#3f7ba0] tracking-wide mb-2">できあがりイメージ</div>
              <div className="text-[13px] text-[#3a4a52] leading-[1.95]">
                先日の運動会では、子どもたちが一生懸命練習に取り組み、リレーのバトンパスもとても上手になりました。みんなで協力し、最後まであきらめずにがんばる姿がとても頼もしかったです。来週は遠足。水筒と帽子を忘れずに持ってきてください。
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ───────── ツールへの導入見出し ───────── */}
      <section className="bg-[#eef6fb] border-y border-[#d8e9f2]">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 py-7 text-center">
          <h2 className="text-[20px] sm:text-[24px] font-extrabold text-[#1c1c2e]">✂️ そのまま下で作れます</h2>
          <p className="mt-2 text-[13px] text-[#5a7585]">下の入力欄にメモを書いて「AIで整える」を押すだけ。</p>
        </div>
      </section>
    </>
  );
}
