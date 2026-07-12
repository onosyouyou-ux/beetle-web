'use client';

import { useState, useEffect, useCallback } from 'react';
import AppHeader, { PageHero } from '@/components/AppHeader';
import UploadZone from '@/components/UploadZone';
import ScanButton from '@/components/ScanButton';
import ScanningArea from '@/components/ScanningArea';
import VerdictCard from '@/components/VerdictCard';
import LimitBanner from '@/components/LimitBanner';
import type { ScanResult } from '@/lib/claude';

interface CounterData {
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

type ScanResponse = ScanResult & { remaining: number; error?: string };

export default function HomePage() {
  const [counter, setCounter] = useState<CounterData | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState(0);
  const [verdict, setVerdict] = useState<ScanResponse | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  useEffect(() => {
    const CACHE_KEY = 'beetle_count_cache';
    fetch('/api/count')
      .then(r => {
        if (!r.ok) throw new Error('count unavailable');
        return r.json();
      })
      .then((d: CounterData) => {
        setCounter(d);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch {}
      })
      .catch(() => {
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) setCounter(JSON.parse(cached));
        } catch {}
      });
  }, []);

  const handleUpload = useCallback((file: File, dataUrl: string) => {
    setImageFile(file);
    setImagePreview(dataUrl);
    setVerdict(null);
    setLimitExceeded(false);
  }, []);

  const handleReset = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setNote('');
    setVerdict(null);
    setLimitExceeded(false);
    setScanPhase(0);
  }, []);

  async function handleScan() {
    if (!imageFile || !imagePreview || scanning) return;

    setScanning(true);
    setVerdict(null);
    setLimitExceeded(false);
    setScanPhase(1);

    const base64 = imagePreview.split(',')[1];
    const mimeType = imageFile.type;

    const token = typeof window !== 'undefined'
      ? localStorage.getItem('subscriptionToken') ?? undefined
      : undefined;

    const [data] = await Promise.all([
      fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType, subscriptionToken: token, note: note.trim() || undefined }),
      }).then(r => r.json() as Promise<ScanResponse>),
      new Promise<void>(resolve => {
        setTimeout(() => setScanPhase(2), 900);
        setTimeout(() => setScanPhase(3), 1800);
        setTimeout(() => { setScanPhase(4); resolve(); }, 2700);
      }),
    ]);

    await new Promise(r => setTimeout(r, 400));
    setScanPhase(0);

    if (data.error === 'FREE_LIMIT_EXCEEDED') {
      setLimitExceeded(true);
    } else if (data.error) {
      alert('スキャンに失敗しました。しばらく経ってから再試行してください。');
    } else {
      setVerdict(data);
      if (data.remaining !== undefined) {
        setCounter(prev => {
          if (!prev) return prev;
          const next = { ...prev, remaining: data.remaining, used: prev.limit - data.remaining };
          try { localStorage.setItem('beetle_count_cache', JSON.stringify(next)); } catch {}
          return next;
        });
      }
    }

    setScanning(false);
  }

  const releaseDate = process.env.NEXT_PUBLIC_RELEASE_DATE ?? '2026-06-01';

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader />
      <div className="app-paper flex-1">
      <PageHero counter={counter} />
      <div className="mx-auto px-5" style={{ maxWidth: '780px', paddingTop: '24px', paddingBottom: '64px' }}>
        <div className="w-full max-w-[720px] mx-auto">

        {limitExceeded && <LimitBanner />}

        <UploadZone
          preview={imagePreview}
          onUpload={handleUpload}
          onReset={handleReset}
          disabled={scanning}
        />

        <div className="mb-4">
          <div className="field-label">テスト状況・補足メモ</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={scanning}
            placeholder="操作していた内容・エラーの状況・気になったことなど（任意）"
            className="w-full border border-[#c8c7c0] rounded-xl px-4 py-3 text-[13px] text-ink bg-[#fafaf8] resize-none h-[72px] outline-none focus:border-[#888780] transition-colors placeholder:text-[#b4b2a9] disabled:opacity-50"
          />
        </div>
        <ScanButton disabled={!imagePreview || scanning || !!verdict} onClick={handleScan} />
        <p className="text-[11px] text-[#b4b2a9] text-center mt-2">
          ※ AIの判定は参考情報です。誤りが含まれる場合があります。
        </p>

        {!verdict && !scanning && (
          <div className="how-to">
            <div className="how-to-label">使い方</div>
            <div className="how-to-steps">
              <div className="how-to-step">
                <span className="how-to-num">①</span>
                <span className="how-to-text">気になる画面のスクショを貼る</span>
              </div>
              <span className="how-to-arrow">→</span>
              <div className="how-to-step">
                <span className="how-to-num">②</span>
                <span className="how-to-text">バグスキャンを実行する</span>
              </div>
              <span className="how-to-arrow">→</span>
              <div className="how-to-step">
                <span className="how-to-num">③</span>
                <span className="how-to-text">判定結果と起票内容をコピー</span>
              </div>
            </div>
          </div>
        )}

        <ScanningArea phase={scanPhase} />

        {verdict && !limitExceeded && <VerdictCard result={verdict} />}

        <div className="content-footer">
          <div className="content-footer-row">
            <span className="text-[11px] text-[#b4b2a9] font-mono">リリース日：{releaseDate}</span>
            {(imagePreview || verdict) && (
              <button
                onClick={handleReset}
                className="text-[11px] text-[#888780] hover:text-ink transition-colors font-mono underline underline-offset-2"
              >
                クリア
              </button>
            )}
          </div>
          <p className="content-footer-notice">
            アップロードされた画像はAI判定のためAnthropicのAPIに送信されます。モデルの学習には利用されません。
          </p>
        </div>
        </div>
      </div>
      </div>

      <footer className="site-footer-app">
        <div className="sfa-left">
          <a href="https://www.beetle-web.jp" target="_blank" rel="noopener" className="sfa-logo">
            BEET<span>LE</span>
          </a>
          <nav className="sfa-nav">
            <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">ホーム</a>
            <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
            <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
            <a href="mailto:info@beetle-web.jp">お問い合わせ</a>
          </nav>
        </div>
        <div className="sfa-right">
          <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
          <span>© 2026 BEETLE Co., LLC</span>
        </div>
      </footer>
    </main>
  );
}
