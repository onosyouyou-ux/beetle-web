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
        body: JSON.stringify({ image: base64, mimeType, subscriptionToken: token }),
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

        <ScanButton disabled={!imagePreview || scanning || !!verdict} onClick={handleScan} />

        <ScanningArea phase={scanPhase} />

        {verdict && !limitExceeded && <VerdictCard result={verdict} />}

        <footer className="mt-8 pt-3 border-t border-[#e0dfd8] flex justify-between items-center">
          <div className="text-[12px] font-semibold text-ink">🐛 これってバグなの？</div>
          <div className="text-[11px] text-[#b4b2a9] font-mono">リリース日：{releaseDate}</div>
        </footer>
      </div>
    </main>
  );
}
