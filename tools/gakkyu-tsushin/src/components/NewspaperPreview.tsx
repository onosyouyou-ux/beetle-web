'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { FONTS, SIZES, type FontId, type SizeId } from '@/lib/templates';
import type { NewsletterResult } from '@/lib/claude';

interface Props {
  data: NewsletterResult | null;
  font: FontId;
  size: SizeId;
  title: string;
  meta: string;
  photo: string | null;
  onOverflowChange?: (isOverflow: boolean) => void;
}

const NewspaperPreview = forwardRef<HTMLDivElement, Props>(function NewspaperPreview(
  { data, font, size, title, meta, photo, onOverflowChange },
  ref,
) {
  const fontClass = FONTS.find((f) => f.id === font)?.className ?? 'font-round';
  const sizeClass = SIZES.find((s) => s.id === size)?.className ?? 'size-medium';
  const leftColRef  = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onOverflowChange) return;
    const timer = setTimeout(() => {
      const leftEl  = leftColRef.current;
      const rightEl = rightColRef.current;
      const leftOver  = leftEl  ? leftEl.scrollHeight  > leftEl.clientHeight  + 2 : false;
      const rightOver = rightEl ? rightEl.scrollHeight > rightEl.clientHeight + 2 : false;
      onOverflowChange(leftOver || rightOver);
    }, 150);
    return () => clearTimeout(timer);
  }, [data, font, size, title, meta, photo, onOverflowChange]);

  const articles = data?.articles ?? [];
  const isEmpty =
    articles.every((a) => !a.body?.trim() && !a.heading?.trim()) &&
    !data?.events?.trim() &&
    !data?.items?.trim() &&
    !data?.caution?.trim();

  const leftArticles = articles.slice(0, 2);
  const article3     = articles[2];

  return (
    <div ref={ref} className={`paper ${fontClass} ${sizeClass}`}>
      <div className="paper-head">
        <div className="paper-title">{title || 'クラスだより'}</div>
        <div className="paper-meta">{meta || '○年○組　○月号'}</div>
      </div>

      {photo && (
        <div className="paper-visual">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" style={{ display: 'block', width: '100%', height: 'auto' }} />
        </div>
      )}

      {isEmpty ? (
        <div className="paper-empty">
          右の入力欄に記事を書くと<br />ここに紙面が表示されます。<br />
          <span className="paper-empty-sub">「AIで整える」を押すと見出しも付きます。</span>
        </div>
      ) : (
        <div className="paper-body">
          {/* 左カラム：記事1・2 */}
          <div className="paper-col" ref={leftColRef}>
            {leftArticles.map((a, i) =>
              (a.heading?.trim() || a.body?.trim()) ? (
                <div className="paper-article" key={i}>
                  {a.heading?.trim() && <div className="paper-article-head">{a.heading}</div>}
                  {a.illustFile && (
                    <div className="paper-illust">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.illustFile} alt="" />
                    </div>
                  )}
                  <div className="paper-article-body">{a.body}</div>
                </div>
              ) : null
            )}
          </div>

          {/* 右カラム：記事3 + 固定欄 + 先生から */}
          <div className="paper-col" ref={rightColRef}>
            {article3 && (article3.heading?.trim() || article3.body?.trim()) && (
              <div className="paper-article">
                {article3.heading?.trim() && <div className="paper-article-head">{article3.heading}</div>}
                {article3.illustFile && (
                  <div className="paper-illust">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={article3.illustFile} alt="" />
                  </div>
                )}
                <div className="paper-article-body">{article3.body}</div>
              </div>
            )}

            {data?.events?.trim() && (
              <div className="paper-box">
                <div className="paper-box-title">📅 今月の行事</div>
                <div className="paper-box-body">{data.events}</div>
              </div>
            )}
            {data?.items?.trim() && (
              <div className="paper-box">
                <div className="paper-box-title">🎒 忘れ物・持ち物連絡</div>
                <div className="paper-box-body">{data.items}</div>
              </div>
            )}
            {data?.caution?.trim() && (
              <div className="paper-box caution">
                <div className="paper-box-title">⚠ 注意事項</div>
                <div className="paper-box-body">{data.caution}</div>
              </div>
            )}

            {data?.fill?.trim() && (
              <div className="paper-fill">
                <span className="paper-fill-label">✏ 先生から</span>
                {data.fill}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default NewspaperPreview;
