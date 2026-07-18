// Vercelアプリ3つの紙面ルール・起動スモーク。対応する仕様書: specs/apps-*.md
// AI処理（判定・生成）はコストがかかるためE2Eでは実行しない（仕様書に明記）。
import { test, expect } from '@playwright/test';

const apps = [
  { name: 'bug-checker', url: 'https://bug-checker.vercel.app', heroes: true },
  { name: 'gakkyu-tsushin', url: 'https://gakkyu-tsushin.vercel.app', heroes: false },
  { name: 'rubi-shokunin', url: 'https://rubi-shokunin.vercel.app', heroes: false },
];

for (const app of apps) {
  test.describe(app.name, () => {
    test('紙面とフッターが表示され、JSがクラッシュしない', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e));
      await page.goto(app.url, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('.app-paper').first()).toBeVisible();
      await expect(page.locator('.site-footer-app').first()).toBeVisible();
      if (app.heroes) {
        // テスト検証用ツールのみ浮世絵ヒーローズバナー（CLAUDE.md フッター規約）
        await expect(page.locator('.footer-heroes').first()).toBeVisible();
      }
      expect(errors).toHaveLength(0);
    });
  });
}
