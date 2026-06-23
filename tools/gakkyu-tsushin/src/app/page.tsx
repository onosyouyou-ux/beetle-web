'use client';

import { useMemo, useRef, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import PreviewControls from '@/components/PreviewControls';
import NewspaperPreview from '@/components/NewspaperPreview';
import ArticleBox, { type ArticleItem } from '@/components/ArticleBox';
import FixedFields, { type FixedFieldValues } from '@/components/FixedFields';
import RevisionBox from '@/components/RevisionBox';
import WhitespaceHint from '@/components/WhitespaceHint';
import MainVisual from '@/components/MainVisual';
import { downloadPaperPdf } from '@/lib/pdf';
import type { NewsletterResult } from '@/lib/claude';
import { DEFAULT_CROP, type ToneId, type EventId, type FontId, type SizeId, type VisualSizeId, type PhotoCrop } from '@/lib/templates';

let _uid = 0;
const newId = () => `a${++_uid}`;

const emptyArticle = (): ArticleItem => ({ id: newId(), heading: '', text: '', illustration: '', illustFile: '' });

export default function Home() {
  const [articles, setArticles] = useState<ArticleItem[]>(() => [emptyArticle(), emptyArticle()]);
  const [fixed, setFixed] = useState<FixedFieldValues>({ events: '', items: '', caution: '' });

  const [tone, setTone] = useState<ToneId>('lower');
  const [event, setEvent] = useState<EventId>('normal');
  const [font, setFont] = useState<FontId>('round');
  const [size, setSize] = useState<SizeId>('medium');

  const [title, setTitle] = useState('');
  const [meta, setMeta] = useState('');

  const [photo, setPhoto] = useState<string | null>(null);
  const [photoSize, setPhotoSize] = useState<VisualSizeId>('medium');
  const [photoCrop, setPhotoCrop] = useState<PhotoCrop>({ ...DEFAULT_CROP });

  const [result, setResult] = useState<NewsletterResult | null>(null);
  const [revision, setRevision] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');

  const eventsRef = useRef<HTMLTextAreaElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const filledArticleCount = useMemo(
    () => articles.filter((a) => a.text.trim()).length,
    [articles],
  );
  const fixedEmpty = !fixed.events.trim() && !fixed.items.trim() && !fixed.caution.trim();
  const showHint = filledArticleCount > 0 && filledArticleCount < 3 && fixedEmpty;

  function updateArticle(id: string, patch: Partial<Omit<ArticleItem, 'id'>>) {
    if ('text' in patch) setResult(null);
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function deleteArticle(id: string) {
    setResult(null);
    setArticles((prev) => (prev.length <= 1 ? prev : prev.filter((a) => a.id !== id)));
  }
  function addArticle() {
    setResult(null);
    setArticles((prev) => [...prev, emptyArticle()]);
  }
  function updateFixed(patch: Partial<FixedFieldValues>) {
    setResult(null);
    setFixed((prev) => ({ ...prev, ...patch }));
  }

  const preview = useMemo<NewsletterResult>(() => {
    if (result) {
      return {
        ...result,
        articles: result.articles.map((a, i) => ({
          ...a,
          illustration: articles[i]?.illustration ?? '',
          illustFile: articles[i]?.illustFile ?? '',
        })),
      };
    }
    return {
      articles: articles
        .filter((a) => a.text.trim())
        .map((a) => ({ heading: a.heading || '', body: a.text.trim(), illustration: a.illustration, illustFile: a.illustFile })),
      events: fixed.events,
      items: fixed.items,
      caution: fixed.caution,
      fill: '',
    };
  }, [result, articles, fixed]);

  async function callGenerate(withRevision: boolean) {
    if (filledArticleCount === 0) {
      setError('記事の内容を入力してください。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: articles.map((a) => ({ text: a.text, heading: a.heading, illustration: a.illustration, illustFile: a.illustFile })),
          events: fixed.events,
          items: fixed.items,
          caution: fixed.caution,
          tone,
          event,
          ...(withRevision && result ? { revision, previous: result } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '生成に失敗しました。');
        return;
      }
      setResult(data as NewsletterResult);
    } catch {
      setError('通信に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!paperRef.current) return;
    setPdfLoading(true);
    try {
      const name = `${(title.trim() || 'クラスだより').replace(/[\\/:*?"<>|]/g, '_')}.pdf`;
      await downloadPaperPdf(paperRef.current, name);
    } catch {
      setError('PDFの作成に失敗しました。もう一度お試しください。');
    } finally {
      setPdfLoading(false);
    }
  }

  function focusFixed() {
    eventsRef.current?.focus();
    eventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <>
      <AppHeader />

      {/* ── ヒーロー ── */}
      <section className="hero-band">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="page-header-en">NEWSLETTER MAKER</div>
            <h1 className="hero-title">学級通信メーカー</h1>
            <p className="hero-desc">
              今月の出来事をメモするだけ。AIが見出しと文章を整えて、学級通信の紙面に流し込みます。<br />
              写真なしでもイラスト付きで作れるので、子どもの顔出しが気になるクラスだよりにも。
            </p>
          </div>
          {/* 静的プレビュー画像＋装飾 */}
          <div className="hero-visual" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero-preview.jpg" alt="" className="hero-img" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/04_notepaper_clip.png" alt="" className="deco deco-clip" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/05_leaf_sprig.png" alt="" className="deco deco-leaf" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/06_music_note.png" alt="" className="deco deco-note" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/07_flower.png" alt="" className="deco deco-flower" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/08_green_pencil.png" alt="" className="deco deco-pencil" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/09_smile_sticky.png" alt="" className="deco deco-sticky" />
          </div>
        </div>
      </section>

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── 左：プレビュー ── */}
          <section className="lg:sticky lg:top-[56px] lg:self-start">
            <div className="sec-label">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/10_preview_search.png" alt="" className="sec-icon" />
              プレビュー
            </div>

            {/* タイトル・号情報 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="タイトル（例：クラスだより）"
                className="border border-[#dddddd] rounded-lg px-3 py-2 text-[13px] text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
              />
              <input
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="クラス・号（例：3年1組 6月号）"
                className="border border-[#dddddd] rounded-lg px-3 py-2 text-[13px] text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
              />
            </div>

            <PreviewControls
              tone={tone}
              event={event}
              font={font}
              size={size}
              onChange={(p) => {
                if (p.tone !== undefined) setTone(p.tone);
                if (p.event !== undefined) setEvent(p.event);
                if (p.font !== undefined) setFont(p.font);
                if (p.size !== undefined) setSize(p.size);
              }}
            />
            <NewspaperPreview
              ref={paperRef}
              data={preview}
              font={font}
              size={size}
              title={title}
              meta={meta}
              photo={photo}
              photoSize={photoSize}
              crop={photoCrop}
            />

            <RevisionBox
              value={revision}
              onChange={setRevision}
              onRegenerate={() => callGenerate(true)}
              disabled={!result}
              loading={loading}
            />
          </section>

          {/* ── 右：入力エリア ── */}
          <section className="space-y-4">
            <div className="sec-label">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/11_input_pencil.png" alt="" className="sec-icon" />
              入力エリア
            </div>

            <MainVisual
              photo={photo}
              size={photoSize}
              crop={photoCrop}
              onChange={(p) => {
                if (p.photo !== undefined) setPhoto(p.photo);
                if (p.size !== undefined) setPhotoSize(p.size);
                if (p.crop !== undefined) setPhotoCrop(p.crop);
              }}
            />

            {/* 記事ボックス */}
            <div>
              <div className="text-[13px] font-bold text-[#1c1c2e] mb-2">記事</div>
              <div className="space-y-3">
                {articles.map((a, i) => (
                  <ArticleBox
                    key={a.id}
                    index={i}
                    item={a}
                    canDelete={articles.length > 1}
                    onChange={(patch) => updateArticle(a.id, patch)}
                    onDelete={() => deleteArticle(a.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addArticle}
                  className="w-full border border-dashed border-[#cbc8c0] rounded-xl text-[14px] text-[#555] py-3 hover:border-[#C0634C] hover:text-[#C0634C] transition-colors"
                >
                  ＋ 記事を追加
                </button>
              </div>
            </div>

            <FixedFields ref={eventsRef} values={fixed} onChange={updateFixed} />

            {showHint && <WhitespaceHint onAdd={focusFixed} />}

            {/* 仕上げ */}
            <div>
              <div className="text-[13px] font-bold text-[#1c1c2e] mb-3">仕上げ</div>

              {error && (
                <div className="text-[13px] text-[#a32d2d] bg-[#fcebeb] border border-[#f7c1c1] rounded-lg px-3 py-2.5 mb-3">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => callGenerate(false)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#ef8a3c] text-white text-[15px] font-bold py-3.5 hover:bg-[#e07428] transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-3"
              >
                {loading ? <span className="spin inline-block">↻</span> : '✦'}
                {loading ? 'AIが整えています...' : 'AIで整える（見出し＆文章を作成）'}
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1c1c2e] text-white text-[15px] font-bold py-3.5 hover:bg-[#2a2a44] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {pdfLoading ? <span className="spin inline-block">↻</span> : '⬇'}
                {pdfLoading ? 'PDFを作成中...' : 'PDFをダウンロード'}
              </button>

              <p className="text-[12px] text-[#999] text-center mt-2">
                押さなくても入力した文章はそのまま紙面に反映されます。
              </p>
            </div>
          </section>
        </div>
      </main>

      <AppFooter />
    </>
  );
}
