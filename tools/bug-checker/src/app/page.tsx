'use client';

import { useState, useEffect, useCallback } from 'react';
import AppHeader, { PageHero } from '@/components/AppHeader';
import ScrollTopButton from '@/components/ScrollTopButton';
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

  const updatedDate = process.env.NEXT_PUBLIC_UPDATED_DATE ?? '2026-07-13';

  return (
    <main className="min-h-screen flex flex-col">
      <AppHeader />
      <div className="app-paper flex-1 flex flex-col">
      <PageHero counter={counter} />
      <div className="mx-auto px-5 w-full" style={{ maxWidth: '900px', paddingTop: '12px', paddingBottom: '24px' }}>
        <div className="w-full max-w-[860px] mx-auto">

        {limitExceeded && <LimitBanner />}

        <UploadZone
          preview={imagePreview}
          onUpload={handleUpload}
          onReset={handleReset}
          disabled={scanning}
        />

        <div className="mb-3">
          <div className="field-label">テスト状況・補足メモ</div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            disabled={scanning}
            placeholder="操作していた内容・エラーの状況・気になったことなど（任意）"
            className="w-full border border-[#a8a79f] rounded-xl px-4 py-2.5 text-[14px] text-ink bg-white resize-none h-[68px] outline-none focus:border-[#555] transition-colors placeholder:text-[#999] disabled:opacity-50"
          />
        </div>
        <ScanButton disabled={!imagePreview || scanning || !!verdict} onClick={handleScan} />

        {!verdict && !scanning && (
          <>
            <section className="app-section">
              <span className="app-eyebrow">使い方</span>
              <h2 className="app-h2">3ステップで完了。</h2>
              <p className="app-lead">調査の入口として気軽に回せるように、流れはシンプルです。初見でも迷わず使えます。</p>
              <div className="app-steps">
                <article className="app-step-card">
                  <div className="app-step-no">1</div>
                  <h3>スクショを貼る</h3>
                  <p>気になる画面のスクリーンショットをドラッグ＆ドロップ、またはクリックして選択します。</p>
                </article>
                <article className="app-step-card">
                  <div className="app-step-no">2</div>
                  <h3>バグスキャン実行</h3>
                  <p>ボタンを押すだけで、AIが内容を解析し、判断の材料を整理します。</p>
                </article>
                <article className="app-step-card">
                  <div className="app-step-no">3</div>
                  <h3>起票内容をコピー</h3>
                  <p>生成された内容を、そのままチケットに貼り付けて次のやりとりへ進めます。</p>
                </article>
              </div>
              <div className="app-flow-badges">
                <span className="app-chip">🆓 月1万回まで無料</span>
                <span className="app-chip">📱 スマホ対応</span>
                <span className="app-chip">🔒 登録不要</span>
                <span className="app-chip">🌐 ブラウザで動く</span>
                <span className="app-chip">⚡ インストール不要</span>
              </div>
            </section>

            <section className="app-section">
              <span className="app-eyebrow">FAQ</span>
              <h2 className="app-h2">よくある質問</h2>
              <div className="app-faq-grid">
                <article className="app-faq-card">
                  <h3>Q. 本当に画像を貼るだけですか？</h3>
                  <p>A. はい。スクリーンショットを貼り、必要であれば補足メモを加えるだけで使えます。ログイン・インストールは不要です。</p>
                </article>
                <article className="app-faq-card">
                  <h3>Q. 判定結果は絶対ですか？</h3>
                  <p>A. AIの判定は判断の補助です。最終判断は、仕様や実際の文脈にあわせて確認してください。</p>
                </article>
                <article className="app-faq-card">
                  <h3>Q. どんな内容が出力されますか？</h3>
                  <p>A. バグか否かの整理に加えて、タイトル・再現手順・期待値・実際の結果・環境など、起票の下書きになる情報を出力します。</p>
                </article>
                <article className="app-faq-card">
                  <h3>Q. 無料で使えますか？</h3>
                  <p>A. 月1万回まで無料で使えます。会員登録は不要で、ブラウザを開けばすぐに試せます。</p>
                </article>
              </div>
            </section>
          </>
        )}

        <ScanningArea phase={scanPhase} />

        {verdict && !limitExceeded && <VerdictCard result={verdict} />}

        <div className="content-footer">
          <p className="content-footer-notice">
            ※ AIの判定は参考情報です。誤りが含まれる場合があります。<br />
            アップロードされた画像はAI判定のためAnthropicのAPIに送信されます。<br />
            モデルの学習には利用されません。当サイトにデータベースはなく、画像を保存・収集することもありません。
          </p>
          {(imagePreview || verdict) && (
            <div className="content-footer-row">
              <button
                onClick={handleReset}
                className="text-[11px] text-[#888780] hover:text-ink transition-colors font-mono underline underline-offset-2"
              >
                クリア
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
      <p className="paper-release">更新日：{updatedDate}</p>
      </div>

      <div className="footer-heroes">
        <img src="/images/footer-heroes.jpg" alt="" aria-hidden="true" width="2172" height="264" loading="lazy" />
      </div>
      {/* テスト検証用ツールのフッター：浮世絵バナー（ロゴ焼き込み済み）→ナビリンク→プライバシー・会社名。
          バナーがロゴを兼ねるためBEETLEテキストロゴは出さない。PC・スマホとも中央揃え */}
      <footer className="site-footer-app">
        <nav className="sfa-nav">
          <a href="https://www.beetle-web.jp/" target="_blank" rel="noopener">ホーム</a>
          <a href="https://www.beetle-web.jp/test-tools.html" target="_blank" rel="noopener">ツール</a>
          <a href="https://www.beetle-web.jp/blog/" target="_blank" rel="noopener">コラム</a>
          <a href="mailto:info@beetle-web.jp">お問い合わせ</a>
        </nav>
        <div className="sfa-copy">
          <a href="https://www.beetle-web.jp/privacy" target="_blank" rel="noopener">プライバシーポリシー</a>
          <span>© 2026 BEETLE Co., LLC</span>
        </div>
      </footer>
      <ScrollTopButton />
    </main>
  );
}
