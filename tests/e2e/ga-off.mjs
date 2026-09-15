// GAを止めたうえでページを開く test / expect。E2Eはここから import する。
//
// なぜ要るか: E2Eは本物のChromiumで本番サイトを開くので、何もしないと gtag.js が走り、
// GitHub Actions のランナーが GA4 の実ユーザーに混ざる（2026-09-15に、アクティブユーザーが
// Chicago / Phoenix＝Azureのランナー所在地として計上されているのを確認した）。
// run-static.mjs は fetch なのでJSが動かず、混ざるのはこちらだけ。
//
// window['ga-disable-<測定ID>'] = true は gtag.js 公式のオプトアウトフラグ。
// addInitScript でページのスクリプトより先に入れるので、計測そのものが始まらない。
import { test as base, expect } from '@playwright/test';

const GA_ID = 'G-N6JXJGQ1Q6'; // 本体・Vercelアプリとも同じ測定ID

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((id) => { window[`ga-disable-${id}`] = true; }, GA_ID);
    await use(page);
  },
});

export { expect };
