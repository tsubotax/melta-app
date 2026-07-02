#!/usr/bin/env bash
# build-showcase.sh — showcase サイト（dist-site/）を組み立てる。
#   dist-site/index.html  = showcase/index.html + 契約由来データ注入（generate-showcase.ts）
#   dist-site/catalog/    = example の Expo web export（baseUrl=/catalog）
# Netlify の build command（npm run build:showcase）から呼ばれる。ローカル検証も同じ経路。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "$root/dist-site"
mkdir -p "$root/dist-site"

# 1. RN catalog を /catalog 配下向けに export（baseUrl は app.config.js が env 起点で付与。
#    dev / native に漏らさないための opt-in — Codex レビュー反映）
(cd "$root/example" && SHOWCASE_BASE_URL=/catalog npx expo export --platform web)
cp -R "$root/example/dist" "$root/dist-site/catalog"

# 2. デザイン言語 CSS を web showcase（SSOT=melta-ui）からビルド時に同梱。
#    cross-site 参照のままだと melta-ui 側のファイル移動で silent に崩れるため、
#    fetch 失敗 = build 失敗で明示的に検知する（Codex レビュー反映）
mkdir -p "$root/dist-site/vendor"
curl -fsSL https://melta.tsubotax.com/scripts/ds-theme.css -o "$root/dist-site/vendor/ds-theme.css"
curl -fsSL https://melta.tsubotax.com/scripts/ds-showcase.css -o "$root/dist-site/vendor/ds-showcase.css"

# 3. showcase シェルに契約由来の表・統計を注入して配置
npx tsx "$root/scripts/generate-showcase.ts"

echo "✅ dist-site を組み立てた（showcase + /catalog）"
