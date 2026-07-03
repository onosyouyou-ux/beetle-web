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
          <h1 className="title">ふりがなメーカー</h1>
        </div>
      </div>
      <p className="lead">
        ぶんしょうを はりつけると、かんじに ふりがなが つくよ。がぞうから ぶんしょうを よみこむこともできるよ。
      </p>

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
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      <div className={`toast${toast ? ' show' : ''}`}>{toast}</div>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
