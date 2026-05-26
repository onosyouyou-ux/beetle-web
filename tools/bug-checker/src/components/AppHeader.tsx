'use client';

interface CounterData {
  used: number;
  limit: number;
}

export default function AppHeader({ counter }: { counter: CounterData | null }) {
  const pct = counter ? Math.min(100, (counter.used / counter.limit) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="inline-block text-[10px] font-mono bg-[#fcebeb] text-[#a32d2d] px-[7px] py-[2px] rounded-[3px] mb-[5px] tracking-[0.06em]">
        BUG DETECTOR
      </div>
      <div className="text-[22px] font-semibold text-ink">これってバグなの？</div>
      <div className="text-[12px] text-muted mt-[2px]">
        画像を貼るだけで判定 → バグなら起票内容を自動生成
      </div>

      {counter && (
        <div className="mt-[10px] inline-flex flex-col gap-1 bg-white border border-[#e0dfd8] rounded-lg px-3 py-2" style={{ borderWidth: '0.5px' }}>
          <div className="text-[12px] text-muted">
            今月みんなで {counter.used.toLocaleString()} 回使いました（無料枠 {counter.limit.toLocaleString()} 回まで）
          </div>
          <div className="w-[200px] h-[3px] bg-[#e0dfd8] rounded-full overflow-hidden">
            <div
              className="h-full bg-ink rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
