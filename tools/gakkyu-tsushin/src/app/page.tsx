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
import type { NewsletterResult } from '@/lib/claude';
import type { ToneId, EventId, FontId, SizeId } from '@/lib/templates';

let _uid = 0;
const newId = () => `a${++_uid}`;

const emptyArticle = (): ArticleItem => ({ id: newId(), text: '', illustration: '' });

export default function Home() {
  const [articles, setArticles] = useState<ArticleItem[]>(() => [emptyArticle(), emptyArticle()]);
  const [fixed, setFixed] = useState<FixedFieldValues>({ events: '', items: '', caution: '' });

  const [tone, setTone] = useState<ToneId>('lower');
  const [event, setEvent] = useState<EventId>('normal');
  const [font, setFont] = useState<FontId>('round');
  const [size, setSize] = useState<SizeId>('medium');

  const [title, setTitle] = useState('');
  const [meta, setMeta] = useState('');

  const [result, setResult] = useState<NewsletterResult | null>(null);
  const [revision, setRevision] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const eventsRef = useRef<HTMLTextAreaElement>(null);

  const filledArticleCount = useMemo(
    () => articles.filter((a) => a.text.trim()).length,
    [articles],
  );
  const fixedEmpty = !fixed.events.trim() && !fixed.items.trim() && !fixed.caution.trim();
  const showHint = filledArticleCount > 0 && filledArticleCount < 3 && fixedEmpty;

  function updateArticle(id: string, patch: Partial<Omit<ArticleItem, 'id'>>) {
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }
  function deleteArticle(id: string) {
    setArticles((prev) => (prev.length > 1 ? prev.filter((a) => a.id !== id) : prev));
  }
  function addArticle() {
    setArticles((prev) => [...prev, emptyArticle()]);
  }

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
          articles: articles.map((a) => ({ text: a.text, illustration: a.illustration })),
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

  function focusFixed() {
    eventsRef.current?.focus();
    eventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <>
      <AppHeader />

      <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── 左：プレビュー ── */}
          <section className="lg:sticky lg:top-[64px] lg:self-start">
            <div className="field-label">プレビュー</div>
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
            <NewspaperPreview result={result} font={font} size={size} title={title} meta={meta} />

            <RevisionBox
              value={revision}
              onChange={setRevision}
              onRegenerate={() => callGenerate(true)}
              disabled={!result}
              loading={loading}
            />
          </section>

          {/* ── 右：入力 ── */}
          <section className="space-y-4">
            <div className="field-label">入力エリア</div>

            {/* 紙面の見出し */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="新聞のタイトル（例：なかよし新聞）"
                className="border border-[#dddddd] rounded-lg px-3 py-2 text-[14px] text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
              />
              <input
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="クラス・号数（例：3年2組 6月号）"
                className="border border-[#dddddd] rounded-lg px-3 py-2 text-[14px] text-[#1c1c2e] focus:outline-none focus:border-[#C0634C]"
              />
            </div>

            {/* 記事ボックス */}
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

            <FixedFields ref={eventsRef} values={fixed} onChange={(p) => setFixed((prev) => ({ ...prev, ...p }))} />

            {showHint && <WhitespaceHint onAdd={focusFixed} />}

            {error && (
              <div className="text-[13px] text-[#a32d2d] bg-[#fcebeb] border border-[#f7c1c1] rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={() => callGenerate(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#1c1c2e] text-white text-[15px] font-bold py-3.5 hover:bg-[#2a2a44] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <span className="spin inline-block">↻</span> : '✦'}
              {loading ? '生成中...' : '新聞を生成する'}
            </button>
          </section>
        </div>
      </main>

      <AppFooter />
    </>
  );
}
