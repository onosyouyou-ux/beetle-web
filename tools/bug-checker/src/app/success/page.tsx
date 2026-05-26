export default function SuccessPage() {
  return (
    <main className="bg-[#f5f5f3] min-h-screen flex justify-center items-center px-4">
      <div className="w-full max-w-[400px] text-center">
        <div className="text-[40px] mb-4">✅</div>
        <div className="text-[22px] font-semibold text-ink mb-2">ご登録ありがとうございます！</div>
        <div className="text-[13px] text-muted mb-2">
          登録メールアドレス宛にトークンをお送りします。
        </div>
        <div className="text-[12px] text-[#b4b2a9] mb-6">
          届かない場合は迷惑メールフォルダをご確認ください。
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
