'use client';

import { TONES, EVENTS, FONTS, SIZES, type ToneId, type EventId, type FontId, type SizeId } from '@/lib/templates';

interface Props {
  tone: ToneId;
  event: EventId;
  font: FontId;
  size: SizeId;
  onChange: (patch: { tone?: ToneId; event?: EventId; font?: FontId; size?: SizeId }) => void;
}

export default function PreviewControls({ tone, event, font, size, onChange }: Props) {
  return (
    <div className="ctrl-grid">
      <div className="ctrl-row">
        <span className="ctrl-lbl">テーマ</span>
        <div className="ctrl-chips">
          {TONES.map((t) => (
            <button key={t.id} type="button" className={`chip${tone === t.id ? ' active' : ''}`} onClick={() => onChange({ tone: t.id })}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ctrl-row">
        <span className="ctrl-lbl">号の種類</span>
        <div className="ctrl-chips">
          {EVENTS.map((ev) => (
            <button key={ev.id} type="button" className={`chip${event === ev.id ? ' active' : ''}`} onClick={() => onChange({ event: ev.id })}>
              {ev.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ctrl-row">
        <span className="ctrl-lbl">フォント</span>
        <div className="ctrl-chips">
          {FONTS.map((f) => (
            <button key={f.id} type="button" className={`chip${font === f.id ? ' active' : ''}`} onClick={() => onChange({ font: f.id })}>
              {f.label}
            </button>
          ))}
        </div>
      </div>
      <div className="ctrl-row">
        <span className="ctrl-lbl">サイズ</span>
        <div className="ctrl-chips">
          {SIZES.map((s) => (
            <button key={s.id} type="button" className={`chip${size === s.id ? ' active' : ''}`} onClick={() => onChange({ size: s.id })}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
