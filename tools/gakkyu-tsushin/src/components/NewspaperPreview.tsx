'use client';

import { FONTS, SIZES, VISUAL_SIZES, illustSrc, type FontId, type SizeId, type VisualSizeId } from '@/lib/templates';
import type { NewsletterResult } from '@/lib/claude';

interface Props {
  result: NewsletterResult | null;
  font: FontId;
  size: SizeId;
  title: string;
  meta: string;
  photo: string | null;
  photoSize: VisualSizeId;
}

export default function NewspaperPreview({ result, font, size, title, meta, photo, photoSize }: Props) {
  const fontClass = FONTS.find((f) => f.id === font)?.className ?? 'font-round';
  const sizeClass = SIZES.find((s) => s.id === size)?.className ?? 'size-medium';
  const visClass = VISUAL_SIZES.find((v) => v.id === photoSize)?.className ?? 'vis-medium';

  return (
    <div className={`paper ${fontClass} ${sizeClass}`}>
      <div className="paper-head">
        <div className="paper-title">{title || 'クラスだより'}</div>
        <div className="paper-meta">{meta || '○年○組　○月号'}</div>
      </div>

      {photo && (
        <div className={`paper-visual ${visClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" />
        </div>
      )}

      {!result ? (
        <div className="paper-empty">
          右の入力欄に記事を書いて<br />「新聞を生成する」を押すと<br />ここに紙面が表示されます。
        </div>
      ) : (
        <div className="paper-body">
          {result.articles.map((a, i) => (
            <div className="paper-article" key={i}>
              {a.illustration && a.illustFile && (
                <div className="paper-illust">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={illustSrc(a.illustration, a.illustFile)} alt="" />
                </div>
              )}
              <div className="paper-article-head">{a.heading}</div>
              <div className="paper-article-body">{a.body}</div>
            </div>
          ))}

          {result.events?.trim() && (
            <div className="paper-box">
              <div className="paper-box-title">📅 今月の行事</div>
              <div className="paper-box-body">{result.events}</div>
            </div>
          )}

          {result.items?.trim() && (
            <div className="paper-box">
              <div className="paper-box-title">🎒 おうちの方へ</div>
              <div className="paper-box-body">{result.items}</div>
            </div>
          )}

          {result.caution?.trim() && (
            <div className="paper-box caution">
              <div className="paper-box-title">⚠ 注意事項</div>
              <div className="paper-box-body">{result.caution}</div>
            </div>
          )}

          {result.fill?.trim() && (
            <div className="paper-fill">
              <span className="paper-fill-label">☘ ひとこと</span>
              {result.fill}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
