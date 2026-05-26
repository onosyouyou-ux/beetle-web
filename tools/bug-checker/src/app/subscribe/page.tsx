'use client';

import { useState } from 'react';

export default function SubscribePage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <main className="bg-[#f5f5f3] min-h-screen flex justify-center items-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-[22px] font-semibold text-ink mb-2">サブスク登録</div>
        <div className="text-[13px] text-muted mb-6">月額480円 / 月240回まで利用可能</div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="メールアドレス"
            required
            className="px-4 py-3 text-[14px] border border-[#e0dfd8] rounded-lg bg-white outline-none focus:border-[#888780]"
          />
          <button
            type="submit"
            disabled={loading || !email}
            className="py-3 bg-ink text-white text-[13px] font-semibold rounded-lg transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? '処理中...' : 'Stripeで支払いへ'}
          </button>
        </form>
        <a href="/" className="block text-center text-[12px] text-muted mt-4 hover:text-ink">← トップに戻る</a>
      </div>
    </main>
  );
}
