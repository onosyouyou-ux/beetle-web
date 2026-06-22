/** @type {import('next').NextConfig} */
// 本体ドメイン配下 /tools/gakkyu-tsushin/ で配信するため basePath を付ける。
// 値は src/lib/templates.ts の BASE_PATH と必ず一致させること。
const nextConfig = {
  basePath: '/tools/gakkyu-tsushin',
  // サイトの /tools/xxx/ 慣習（末尾スラッシュ）に合わせる。canonical とも一致させる。
  trailingSlash: true,
};

export default nextConfig;
