// 本体配信の静的ツールのE2E。対応する仕様書: specs/tools-regex-tester.md, specs/tools-eigo-app.md
import { test, expect } from '@playwright/test';

const BASE = 'https://www.beetle-web.jp';

test.describe('正規表現テスター', () => {
  test('パターンとテスト文字列を入れるとマッチ結果が出る', async ({ page }) => {
    await page.goto(`${BASE}/tools/regex-tester/`);
    await page.locator('#rt-pattern').fill('[0-9]+');
    await page.locator('#rt-string').fill('注文番号は 12345 です');
    await expect(page.locator('#rt-output')).toContainText('12345');
  });

  test('不正な正規表現でもクラッシュせずエラー表示', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e));
    await page.goto(`${BASE}/tools/regex-tester/`);
    await page.locator('#rt-pattern').fill('[abc');
    await page.locator('#rt-string').fill('test');
    await expect(page.locator('#rt-status')).not.toHaveText('', { timeout: 10_000 });
    expect(errors).toHaveLength(0);
  });
});

test.describe('えいごよんで！アプリ', () => {
  test('JSがクラッシュせず #app にUIが描画される', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e));
    await page.goto(`${BASE}/tools/eigo/`);
    await expect(page.locator('#app')).toBeVisible();
    // UIが空でないこと（何かしらの子要素が描画されている）
    await expect(page.locator('#app *').first()).toBeVisible();
    expect(errors).toHaveLength(0);
  });
});
