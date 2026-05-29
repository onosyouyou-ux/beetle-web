'use client';

interface CounterData {
  used: number;
  limit: number;
}

export default function AppHeader({ counter }: { counter: CounterData | null }) {
  const pct = counter ? Math.min(100, (counter.used / counter.limit) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 text-[12px] mb-5">
        <a href="https://www.beetle-web.jp" target="_blank" rel="noopener">
          <img src="https://www.beetle-web.jp/assets/icons/beetle-icon.svg" alt="BEETLE" style={{ height: '26px', borderRadius: '5px', verticalAlign: 'middle' }} />
        </a>
        <span className="text-[#ccc]">›</span>
        <a href="https://www.beetle-web.jp/#tools" target="_blank" rel="noopener" className="text-[#999] hover:text-[#333] transition-colors">ツール一覧</a>
        <span className="text-[#ccc]">›</span>
        <span className="text-[#555]">これってバグなの？</span>
      </div>
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
