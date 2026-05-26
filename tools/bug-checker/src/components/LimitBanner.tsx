'use client';

import { useState } from 'react';

export default function LimitBanner() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { url?: string };
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#faeeda] border-[0.5px] border-[#fac775] rounded-lg px-4 py-[14px] mb-[14px]">
      <div className="text-[13px] font-semibold text-[#854f0b] mb-1">今月の無料枠が終了しました</div>
      <div className="text-[12px] text-[#5f5e5a] leading-relaxed">
        サブスク登録（月額480円）で引き続きご利用いただけます。
      </div>
      <div className="mt-3 flex gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="メールアドレス"
          className="flex-1 px-3 py-2 text-[12px] border border-[#e0dfd8] rounded-lg bg-white outline-none focus:border-[#888780]"
        />
        <button
          onClick={handleSubscribe}
          disabled={loading || !email}
          className="px-4 py-2 bg-ink text-white text-[12px] font-semibold rounded-lg cursor-pointer transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {loading ? '...' : 'サブスク登録'}
        </button>
      </div>
    </div>
  );
}
