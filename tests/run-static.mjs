#!/usr/bin/env node
// specs/*.md の frontmatter を読み、本番URLに対して静的チェックを行う。
// 期待値はすべて仕様書側にある（このファイルに期待値を書かないこと）。
// 使い方: node tests/run-static.mjs [--only <spec名の部分一致>]

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPECS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'specs');
const MAIN_BASE = 'https://www.beetle-web.jp';
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null; })();

// ---- frontmatter パーサ（値はJSONリテラル、self/none/true/false は裸でも可）----
function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([a-z_]+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const v = raw.trim();
    if (v === 'true') fm[key] = true;
    else if (v === 'false') fm[key] = false;
    else if (v.startsWith('[') || v.startsWith('"')) fm[key] = JSON.parse(v);
    else fm[key] = v; // self / none / 裸文字列
  }
  return fm;
}

// ---- fetch（結果キャッシュつき）----
const pageCache = new Map();
async function fetchPage(url) {
  if (pageCache.has(url)) return pageCache.get(url);
  let result;
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'beetle-spec-check' } });
    result = { status: res.status, body: res.ok ? await res.text() : '' };
  } catch (e) {
    result = { status: 0, body: '', error: String(e) };
  }
  pageCache.set(url, result);
  return result;
}
const assetCache = new Map();
async function assetOk(url) {
  if (assetCache.has(url)) return assetCache.get(url);
  let ok;
  try {
    const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'beetle-spec-check' } });
    ok = res.ok;
  } catch { ok = false; }
  assetCache.set(url, ok);
  return ok;
}

// ---- HTML 検査ヘルパ ----
const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const getCanonical = (html) =>
  attr(html, /<link[^>]*rel="canonical"[^>]*href="([^"]+)"/) ?? attr(html, /<link[^>]*href="([^"]+)"[^>]*rel="canonical"/);
const getOgImage = (html) =>
  attr(html, /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/) ?? attr(html, /<meta[^>]*content="([^"]+)"[^>]*property="og:image"/);
const getTitle = (html) => attr(html, /<title>([^<]*)<\/title>/);
const hasDescription = (html) => /<meta[^>]*name="description"[^>]*content="[^"]+"/.test(html);
const hasSelector = (html, sel) => {
  if (sel.startsWith('#')) return new RegExp(`id="${sel.slice(1)}"`).test(html);
  if (sel.startsWith('.')) return new RegExp(`class="[^"]*(?:^|[\\s"])${sel.slice(1)}(?:[\\s"]|$)[^"]*"`).test(html) || new RegExp(`class="[^"]*\\b${sel.slice(1)}\\b[^"]*"`).test(html);
  return html.includes(sel);
};

// ---- 実行 ----
const failures = [];
let checks = 0;
const fail = (spec, url, msg) => failures.push(`[${spec}] ${url}\n    ${msg}`);

// `_` 始まり（_common.md 等の共通ドキュメント）と README.md は画面仕様ではないのでスキップ
const specFiles = (await readdir(SPECS_DIR)).filter((f) => f.endsWith('.md') && f !== 'README.md' && !f.startsWith('_') && (!only || f.includes(only)));

// sitemap を先に読む
const sitemapRes = await fetchPage(`${MAIN_BASE}/sitemap.xml`);
const sitemapUrls = [...sitemapRes.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (sitemapRes.status !== 200 || sitemapUrls.length === 0) {
  failures.push(`[sitemap] ${MAIN_BASE}/sitemap.xml が取得できないか空 (status=${sitemapRes.status})`);
}

for (const file of specFiles) {
  const md = await readFile(join(SPECS_DIR, file), 'utf8');
  const fm = parseFrontmatter(md);
  if (!fm || (!fm.urls && !fm.urls_from_sitemap)) { failures.push(`[${file}] frontmatter が読めない`); continue; }
  // urls_from_sitemap: sitemap から該当プレフィックスのURLを自動展開（記事追加ごとの urls 追記を不要にする）
  if (fm.urls_from_sitemap) {
    fm.urls = sitemapUrls.filter((u) => u.startsWith(MAIN_BASE + fm.urls_from_sitemap)).map((u) => u.slice(MAIN_BASE.length));
    if (fm.urls.length === 0) { failures.push(`[${file}] sitemap に ${fm.urls_from_sitemap} 配下のURLが1件もない`); continue; }
  }
  const base = fm.base ?? MAIN_BASE;

  for (const path of fm.urls) {
    const url = base + path;
    const page = await fetchPage(url);
    checks++;
    if (page.status !== 200) { fail(file, url, `HTTP ${page.status} ${page.error ?? ''}`); continue; }
    const html = page.body;

    // title
    if (fm.title_contains) {
      const t = getTitle(html) ?? '';
      if (!t.includes(fm.title_contains)) fail(file, url, `title に「${fm.title_contains}」が無い: "${t}"`);
    }
    // canonical
    if (fm.canonical && fm.canonical !== 'none') {
      const expected = fm.canonical === 'self' ? url : fm.canonical;
      const actual = getCanonical(html);
      if (actual !== expected) fail(file, url, `canonical 期待=${expected} 実際=${actual}`);
    }
    // og:image
    if (fm.og_image && fm.og_image !== 'none') {
      const og = getOgImage(html);
      if (!og) fail(file, url, 'og:image が無い');
      else {
        if (fm.og_image !== 'any' && og !== MAIN_BASE + fm.og_image) fail(file, url, `og:image 期待=${MAIN_BASE + fm.og_image} 実際=${og}`);
        if (og && !(await assetOk(og))) fail(file, url, `og:image が取得できない: ${og}`);
      }
    }
    // meta description
    if (fm.meta_description !== false && !hasDescription(html)) fail(file, url, 'meta description が無い');
    // インライン<style>禁止（規約）
    if (fm.forbid_inline_style !== false && /<style[\s>]/.test(html)) fail(file, url, 'インライン<style>がある（規約違反）');
    // 必須要素
    for (const sel of fm.required_selectors ?? []) {
      if (!hasSelector(html, sel)) fail(file, url, `必須要素 ${sel} が見つからない`);
    }
    // sitemap 整合
    if (fm.sitemap === true && sitemapUrls.length > 0 && !sitemapUrls.includes(url)) {
      fail(file, url, 'sitemap.xml に未登録');
    }
  }
}

// sitemap 全URLの死活（specの有無に関わらず）
if (!only) {
  for (const loc of sitemapUrls) {
    checks++;
    const page = await fetchPage(loc);
    if (page.status !== 200) failures.push(`[sitemap] ${loc}\n    HTTP ${page.status}（sitemap登録URLが死んでいる）`);
  }
}

console.log(`\nspecs: ${specFiles.length}ファイル / チェックしたURL: ${checks}件`);
if (failures.length) {
  console.log(`\n❌ FAIL ${failures.length}件\n`);
  for (const f of failures) console.log('  ' + f + '\n');
  process.exit(1);
} else {
  console.log('✅ 全チェック PASS');
}
