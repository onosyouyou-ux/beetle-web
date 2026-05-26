export default function CancelPage() {
  return (
    <main className="bg-[#f5f5f3] min-h-screen flex justify-center items-center px-4">
      <div className="w-full max-w-[400px] text-center">
        <div className="text-[40px] mb-4">↩️</div>
        <div className="text-[22px] font-semibold text-ink mb-2">お支払いはキャンセルされました</div>
        <div className="text-[13px] text-muted mb-6">
          いつでもサブスク登録できます。無料枠も引き続きご利用いただけます。
        </div>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-ink text-white text-[13px] font-semibold rounded-lg hover:opacity-85 transition-opacity"
        >
          トップに戻る
        </a>
      </div>
    </main>
  );
}
