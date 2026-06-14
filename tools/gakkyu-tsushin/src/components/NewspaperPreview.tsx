'use client';

import { FONTS, SIZES, ILLUSTRATIONS, type FontId, type SizeId } from '@/lib/templates';
import type { NewsletterResult } from '@/lib/claude';

interface Props {
  result: NewsletterResult | null;
  font: FontId;
  size: SizeId;
  title: string;
  meta: string;
}

function illustLabel(id: string): string {
  return ILLUSTRATIONS.find((i) => i.id === id)?.label ?? '';
}

export default function NewspaperPreview({ result, font, size, title, meta }: Props) {
  const fontClass = FONTS.find((f) => f.id === font)?.className ?? 'font-round';
  const sizeClass = SIZES.find((s) => s.id === size)?.className ?? 'size-medium';

  return (
    <div className={`paper ${fontClass} ${sizeClass}`}>
      <div className="paper-head">
        <div className="paper-title">{title || 'クラスだより'}</div>
        <div className="paper-meta">{meta || '○年○組　○月号'}</div>
      </div>

      {!result ? (
        <div className="paper-empty">
          右の入力欄に記事を書いて<br />「新聞を生成する」を押すと<br />ここに紙面が表示されます。
        </div>
      ) : (
        <div className="paper-body">
          {result.articles.map((a, i) => (
            <div className="paper-article" key={i}>
              {a.illustration && (
                <div className="paper-illust">
                  <span>🖼 {illustLabel(a.illustration)}</span>
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
