'use client';

import { TONES, FONTS, SIZES, type ToneId, type FontId, type SizeId } from '@/lib/templates';

interface Props {
  tone: ToneId;
  font: FontId;
  size: SizeId;
  onChange: (patch: { tone?: ToneId; font?: FontId; size?: SizeId }) => void;
}

export default function PreviewControls({ tone, font, size, onChange }: Props) {
  return (
    <div className="ctrl-grid">
      <div className="ctrl-row">
        <label className="ctrl-lbl" htmlFor="ctrl-tone">テーマ</label>
        <select
          id="ctrl-tone"
          value={tone}
          onChange={(e) => onChange({ tone: e.target.value as ToneId })}
          className="ctrl-select"
        >
          {TONES.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      </div>
      <div className="ctrl-row">
        <label className="ctrl-lbl" htmlFor="ctrl-font">フォント</label>
        <select
          id="ctrl-font"
          value={font}
          onChange={(e) => onChange({ font: e.target.value as FontId })}
          className="ctrl-select"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>
      <div className="ctrl-row">
        <label className="ctrl-lbl" htmlFor="ctrl-size">サイズ</label>
        <select
          id="ctrl-size"
          value={size}
          onChange={(e) => onChange({ size: e.target.value as SizeId })}
          className="ctrl-select"
        >
          {SIZES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
