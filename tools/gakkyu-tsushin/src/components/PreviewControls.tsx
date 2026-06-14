'use client';

import { TONES, EVENTS, FONTS, SIZES, type ToneId, type EventId, type FontId, type SizeId } from '@/lib/templates';

interface Props {
  tone: ToneId;
  event: EventId;
  font: FontId;
  size: SizeId;
  onChange: (patch: { tone?: ToneId; event?: EventId; font?: FontId; size?: SizeId }) => void;
}

const selClass =
  'border border-[#dddddd] rounded-lg bg-white text-[13px] px-2.5 py-2 text-[#1c1c2e] focus:outline-none focus:border-[#C0634C] cursor-pointer';

export default function PreviewControls({ tone, event, font, size, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      <select
        className={selClass}
        value={tone}
        onChange={(e) => onChange({ tone: e.target.value as ToneId })}
        aria-label="クラスの雰囲気"
      >
        {TONES.map((t) => (
          <option key={t.id} value={t.id}>{t.label}</option>
        ))}
      </select>

      <select
        className={selClass}
        value={event}
        onChange={(e) => onChange({ event: e.target.value as EventId })}
        aria-label="イベント"
      >
        {EVENTS.map((ev) => (
          <option key={ev.id} value={ev.id}>{ev.label}</option>
        ))}
      </select>

      <select
        className={selClass}
        value={font}
        onChange={(e) => onChange({ font: e.target.value as FontId })}
        aria-label="フォント"
      >
        {FONTS.map((f) => (
          <option key={f.id} value={f.id}>{f.label}</option>
        ))}
      </select>

      <select
        className={selClass}
        value={size}
        onChange={(e) => onChange({ size: e.target.value as SizeId })}
        aria-label="文字サイズ"
      >
        {SIZES.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
