// 修行アプリの「更新日」を git の履歴から書き込む（#108。2026-10-04）。
//   node scripts/app-dates.mjs          … tools/{app}/index.html の <p class="paper-release"> を書きかえる
//   node scripts/app-dates.mjs --check  … ずれていたら一覧を出して exit 1（書きかえない）
// 修行アプリを触ったら、push の前に1回流す（CLAUDE.md「デプロイ」）。WSL 側で実行する（git を使うため）。
//
// 日付の決め方：そのアプリの index.html と、index.html が読む「そのアプリの」JS・CSS の、いちばん新しい変更日。
//   - サイト共通（common.* ・contact-track・app-reference・ninja-links）は数えない。ヘッダーや「しゅぎょう いちらん」を
//     直しただけで 8本ぜんぶの日付が動くのを防ぐ
//   - 修行アプリ共通の見た目（ninja-kids.css・nk-modal.js）は数える。盤面の見た目が実際に変わるため
//   - index.html の変更のうち、更新日の行だけを変えたコミットは数えない（この道具が書いたコミットで日付が動かないように）
//   - まだコミットしていない変更があるファイルは「今日」（日本時間）とする
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APPS = ['sansu-app', 'sakuranbo', 'kuku', 'tokei', 'kanji', 'katakana', 'romaji', 'phonics'];
const SITE_WIDE = /^\/(js|css)\/(common|contact-track|app-reference|ninja-links)\.(js|css)$/;
const RELEASE = /<p class="paper-release">更新日：\d{4}-\d{2}-\d{2}<\/p>/;
const check = process.argv.includes('--check');

const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });

// 更新日の行以外に変わった行があるか（diff の本文から判定）
const touchesMoreThanRelease = (diff) => diff.split('\n')
  .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
  .some((l) => !l.includes('class="paper-release"'));

function lastDate(file) {
  if (file.endsWith('index.html')) {
    if (touchesMoreThanRelease(git('diff', 'HEAD', '--', file))) return today;
    for (const line of git('log', '--format=%H %cs', '--', file).split('\n').filter(Boolean)) {
      const [hash, date] = line.split(' ');
      if (touchesMoreThanRelease(git('show', '--format=', hash, '--', file))) return date;
    }
    return '';
  }
  if (git('status', '--porcelain', '--', file)) return today;
  return git('log', '-1', '--format=%cs', '--', file);
}

const stale = [];
for (const app of APPS) {
  const htmlPath = `tools/${app}/index.html`;
  const html = readFileSync(resolve(root, htmlPath), 'utf8');
  if (!RELEASE.test(html)) throw new Error(`${htmlPath} に <p class="paper-release">更新日：YYYY-MM-DD</p> がない`);
  const assets = [...html.matchAll(/(?:src|href)="(\/(?:js|css)\/[\w.-]+\.(?:js|css))(?:\?[^"]*)?"/g)]
    .map((m) => m[1]).filter((p) => !SITE_WIDE.test(p));
  const files = [htmlPath, ...new Set(assets.map((p) => p.slice(1)))];
  const dates = files.map((f) => [f, lastDate(f)]).filter(([, d]) => d);
  const [newestFile, newest] = dates.reduce((a, b) => (b[1] > a[1] ? b : a));
  const current = html.match(RELEASE)[0].match(/\d{4}-\d{2}-\d{2}/)[0];
  const mark = current === newest ? 'そのまま' : `${current} → ${newest}`;
  console.log(`${app.padEnd(10)} ${newest}（${newestFile}）${mark}`);
  if (current !== newest) {
    stale.push(app);
    if (!check) writeFileSync(resolve(root, htmlPath), html.replace(RELEASE, `<p class="paper-release">更新日：${newest}</p>`));
  }
}
if (check && stale.length) {
  console.error(`更新日がずれている：${stale.join('・')}（node scripts/app-dates.mjs で直す）`);
  process.exit(1);
}
