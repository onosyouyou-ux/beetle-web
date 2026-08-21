// お問い合わせクリックの計測（GA4イベント: contact_click）
//
// 「実際に接触が起きるクリック」だけを1イベントで拾う：
//   - mailto: リンク            → method: 'mail'
//   - Googleフォームへのリンク  → method: 'form'
// ヘッダー・フッターの「お問い合わせ」リンクは /#contact への移動なので対象外。
// プライバシーポリシーの連絡先 mailto も対象外（このJSを読み込まないことで除外）。
//
// GA4側の設定：管理 > イベント で contact_click に「キーイベントとしてマーク」を付ける。
// （1回発火するまで一覧に出ないので、公開後に自分で1クリックしてから設定する）
(function () {
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href') || '';
    var method =
      href.indexOf('mailto:') === 0 ? 'mail'
      : (href.indexOf('forms.gle') !== -1 || href.indexOf('docs.google.com/forms') !== -1) ? 'form'
      : null;
    if (!method) return;

    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'contact_click', {
      method: method,
      link_text: (a.textContent || '').trim().slice(0, 50)
    });
  }, true);
})();
