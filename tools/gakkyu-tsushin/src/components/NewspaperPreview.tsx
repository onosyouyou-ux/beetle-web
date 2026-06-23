'use client';

import { forwardRef } from 'react';
import { FONTS, SIZES, VISUAL_SIZES, DEFAULT_CROP, type FontId, type SizeId, type VisualSizeId, type PhotoCrop } from '@/lib/templates';
import type { NewsletterResult } from '@/lib/claude';

interface Props {
  data: NewsletterResult | null;
  font: FontId;
  size: SizeId;
  title: string;
  meta: string;
  photo: string | null;
  photoSize: VisualSizeId;
  crop: PhotoCrop;
}

const NewspaperPreview = forwardRef<HTMLDivElement, Props>(function NewspaperPreview(
  { data, font, size, title, meta, photo, photoSize, crop },
  ref,
) {
  const fontClass = FONTS.find((f) => f.id === font)?.className ?? 'font-round';
  const sizeClass = SIZES.find((s) => s.id === size)?.className ?? 'size-medium';
  const visClass = VISUAL_SIZES.find((v) => v.id === photoSize)?.className ?? 'vis-medium';
  const c = crop ?? DEFAULT_CROP;

  const articles = data?.articles ?? [];
  const isEmpty =
    articles.length === 0 &&
    !data?.events?.trim() &&
    !data?.items?.trim() &&
    !data?.caution?.trim();

  return (
    <div ref={ref} className={`paper ${fontClass} ${sizeClass}`}>
      <div className="paper-head">
        <div className="paper-title">{title || 'クラスだより'}</div>
        <div className="paper-meta">{meta || '○年○組　○月号'}</div>
      </div>

      {photo && (
        <div className={`paper-visual ${visClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            style={{ objectPosition: `${c.posX}% ${c.posY}%`, transform: `scale(${c.zoom})` }}
          />
        </div>
      )}

      {isEmpty ? (
        <div className="paper-empty">
          右の入力欄に記事を書くと<br />ここに紙面が表示されます。<br />
          <span className="paper-empty-sub">「AIで整える」を押すと見出しも付きます。</span>
        </div>
      ) : (
        <div className="paper-body">
          {articles.map((a, i) => (
            <div className="paper-article" key={i}>
              {a.illustFile && (
                <div className="paper-illust">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.illustFile} alt="" />
                </div>
              )}
              {a.heading?.trim() && <div className="paper-article-head">{a.heading}</div>}
              <div className="paper-article-body">{a.body}</div>
            </div>
          ))}

          {data?.events?.trim() && (
            <div className="paper-box">
              <div className="paper-box-title">📅 今月の行事</div>
              <div className="paper-box-body">{data.events}</div>
            </div>
          )}

          {data?.items?.trim() && (
            <div className="paper-box">
              <div className="paper-box-title">🎒 おうちの方へ</div>
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
              <span className="paper-fill-label">☘ ひとこと</span>
              {data.fill}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default NewspaperPreview;
