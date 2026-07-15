'use client';

import { useRef, useState } from 'react';

interface Segment {
  text: string;
  ruby: string;
}

type Level = 'all' | 'hard';

const PEN_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
);

export default function Home() {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<Level>('all');
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [running, setRunning] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }

  async function annotate() {
    if (!text.trim()) {
      setError('ぶんしょうを いれてね。');
      return;
    }
    setError('');
    setSegments(null);
    setRunning(true);
    try {
      const res = await fetch('/api/annotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), level }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'うまく できなかったよ。もういちど ためしてね。');
      setSegments(data.segments as Segment[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'こまったことが おきたよ。');
    } finally {
      setRunning(false);
    }
  }

  async function handleImage(file: File) {
    const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!supported.includes(file.type)) {
      setError('つかえない がぞうの しゅるいだよ。JPEG / PNG / GIF / WEBPを つかってね。');
      return;
    }
    setError('');
    setOcrLoading(true);
    setFilename('よみこみちゅう…');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('がぞうを よみこめなかったよ。'));
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType: file.type, data: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'がぞうの よみこみで こまったことが おきたよ。');

      setText(data.text as string);
      setFilename(file.name);
      showToast('がぞうから よみこんだよ！');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'がぞうの よみこみで こまったことが おきたよ。');
      setFilename('');
    } finally {
      setOcrLoading(false);
    }
  }

  async function copyHtml() {
    if (!segments) return;
    const html = segments
      .map((seg) => {
        const esc = escapeHtml(seg.text).replace(/\n/g, '<br>');
        return seg.ruby.trim() ? `<ruby>${esc}<rt>${escapeHtml(seg.ruby)}</rt></ruby>` : esc;
      })
      .join('');
    try {
      await navigator.clipboard.writeText(html);
      showToast('HTMLを コピーしたよ！');
    } catch {
      showToast('コピーできなかったよ。');
    }
  }

  async function copyText() {
    if (!segments) return;
    const plain = segments
      .map((seg) => (seg.ruby.trim() ? `${seg.text}(${seg.ruby})` : seg.text))
      .join('');
    try {
      await navigator.clipboard.writeText(plain);
      showToast('テキストを コピーしたよ！');
    } catch {
      showToast('コピーできなかったよ。');
    }
  }

  return (
    <div className="app">
      <div className="header-row">
        <svg className="mascot" width="48" height="48" viewBox="0 0 46 46" fill="none">
          <rect x="10" y="4" width="14" height="30" rx="6" fill="#FFC93C" transform="rotate(8 17 19)" />
          <path d="M12 30 L22 32 L16 40 Z" fill="#F4A65B" transform="rotate(8 17 19)" />
          <circle cx="30" cy="26" r="13" fill="#FFFFFF" stroke="#DFF1FC" strokeWidth="2" />
          <circle cx="26" cy="24" r="1.8" fill="#3A3A3A" />
          <circle cx="34" cy="24" r="1.8" fill="#3A3A3A" />
          <circle cx="24.5" cy="29" r="2.2" fill="#BEE6FF" opacity="0.9" />
          <circle cx="35.5" cy="29" r="2.2" fill="#BEE6FF" opacity="0.9" />
          <path d="M27 30 Q30 33 33 30" stroke="#3A3A3A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
        <div>
          <p className="eyebrow">かんじに ふりがなを つけよう！</p>
          <h1 className="title">ルビメーカー</h1>
        </div>
      </div>
      <p className="lead">
        ぶんしょうを はりつけると、かんじに ふりがなが つくよ。がぞうから ぶんしょうを よみこむこともできるよ。
      </p>
      {/* リファレンス（ランディングへ）。ヘッダーから移設（2026-07-15） */}
      <a className="ph-ref" href="https://www.beetle-web.jp/tools/rubi-shokunin/" target="_blank" rel="noopener">リファレンス</a>

      {/* LPメインビジュアル */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="header-visual" src="/hero-lp.jpg" alt="" aria-hidden="true" width="960" height="720" />

      <div className="card">
        <div className="image-row">
          <button
            type="button"
            className={`upload-btn${ocrLoading ? ' loading' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            がぞうから よみこむ
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImage(file);
              e.target.value = '';
            }}
          />
          <span className="filename">{filename}</span>
        </div>

        <div className="options">
          <label className={level === 'all' ? 'active' : ''}>
            <input type="radio" name="level" checked={level === 'all'} onChange={() => setLevel('all')} />
            すべてのかんじ
          </label>
          <label className={level === 'hard' ? 'active' : ''}>
            <input type="radio" name="level" checked={level === 'hard'} onChange={() => setLevel('hard')} />
            むずかしいかんじだけ
          </label>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ここに ぶんしょうを はりつけてね"
        />
        <p className="hint">いちどに できるのは 400〜500じ くらいだよ。ながい ぶんしょうは わけて はりつけてね。</p>

        <button type="button" className="run-btn" onClick={annotate} disabled={running}>
          {running ? (
            'かんがえちゅう…'
          ) : (
            <>
              {PEN_ICON} ふりがなを つける
            </>
          )}
        </button>

        {segments && (
          <div className="output-wrap">
            <div className="seal">できた！</div>
            <div className="output">
              {segments.map((seg, i) =>
                seg.ruby.trim() ? (
                  <ruby key={i}>
                    {seg.text}
                    <rt>{seg.ruby}</rt>
                  </ruby>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </div>
            <div className="output-actions">
              <button type="button" onClick={copyHtml}>HTMLでコピー</button>
              <button type="button" onClick={copyText}>かんじ(よみ)でコピー</button>
              <button type="button" onClick={() => window.print()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                いんさつする
              </button>
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      {/* ── ランディング準拠の使い方3ステップ ── */}
      <section className="app-section">
        <p className="app-eyebrow">使い方</p>
        <h2 className="app-h2">3ステップですぐ完成。</h2>
        <div className="app-steps">
          <article className="app-step-card">
            <div className="app-step-no">1</div>
            <h3>文章を入力</h3>
            <p>ルビを入れたい文章を貼りつけるか、画像から読み込みます。</p>
          </article>
          <article className="app-step-card">
            <div className="app-step-no">2</div>
            <h3>範囲を選ぶ</h3>
            <p>すべての漢字、またはむずかしい漢字だけを選びます。</p>
          </article>
          <article className="app-step-card">
            <div className="app-step-no">3</div>
            <h3>コピーして使う</h3>
            <p>教材、プリント、Webページなどに貼りつけます。</p>
          </article>
        </div>
      </section>

      {/* ── ランディング準拠のFAQ ── */}
      <section className="app-section">
        <p className="app-eyebrow">FAQ</p>
        <h2 className="app-h2">よくある質問</h2>
        <div className="app-faq-grid">
          <article className="app-faq-card">
            <h3>Q. 無料で使えますか？</h3>
            <p>A. はい、登録不要・無料でお使いいただけます。</p>
          </article>
          <article className="app-faq-card">
            <h3>Q. 一度にどのくらいの文章を処理できますか？</h3>
            <p>A. 一度に400〜500字程度が目安です。長い文章は分けて貼りつけてください。</p>
          </article>
          <article className="app-faq-card">
            <h3>Q. 入力した文章は保存されますか？</h3>
            <p>A. 入力した文章はふりがなの生成にのみ使用し、サーバーに保存しません。</p>
          </article>
        </div>
      </section>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
