'use client';

import { useState, useEffect, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
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
    fetch('/api/count')
      .then(r => r.json())
      .then((d: CounterData) => setCounter(d))
      .catch(() => null);
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
        setCounter(prev => prev ? { ...prev, remaining: data.remaining, used: prev.limit - data.remaining } : prev);
      }
    }

    setScanning(false);
  }

  const releaseDate = process.env.NEXT_PUBLIC_RELEASE_DATE ?? '2026-06-01';

  return (
    <main className="bg-[#f5f5f3] min-h-screen flex justify-center py-8 px-4">
      <div className="w-full max-w-[560px]">
        <AppHeader counter={counter} />

        {limitExceeded && <LimitBanner />}

        <UploadZone
          preview={imagePreview}
          onUpload={handleUpload}
          onReset={handleReset}
          disabled={scanning}
        />

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          disabled={scanning}
          placeholder="操作していた内容・エラーの状況・気になったことなど、補足があれば書いてください（任意）"
          className="w-full border border-[#c8c7c0] rounded-xl px-4 py-3 text-[13px] text-ink bg-[#fafaf8] resize-none h-[72px] outline-none focus:border-[#888780] transition-colors mb-4 placeholder:text-[#b4b2a9] disabled:opacity-50"
        />
        <ScanButton disabled={!imagePreview || scanning || !!verdict} onClick={handleScan} />
        <p className="text-[11px] text-[#b4b2a9] text-center mt-2">
          ※ AIの判定は参考情報です。誤りが含まれる場合があります。
        </p>

        <ScanningArea phase={scanPhase} />

        {verdict && !limitExceeded && <VerdictCard result={verdict} />}

        <footer className="mt-8 pt-3 border-t border-[#e0dfd8] flex justify-between items-center">
          <div className="text-[12px] font-semibold text-ink">🐛 これってバグなの？</div>
          <div className="flex items-center gap-3">
            {(imagePreview || verdict) && (
              <button
                onClick={handleReset}
                className="text-[11px] text-[#888780] hover:text-ink transition-colors font-mono underline underline-offset-2"
              >
                クリア
              </button>
            )}
            <div className="text-[11px] text-[#b4b2a9] font-mono">リリース日：{releaseDate}</div>
          </div>
        </footer>
      </div>
    </main>
  );
}
