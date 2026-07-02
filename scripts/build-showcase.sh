#!/usr/bin/env bash
# build-showcase.sh — showcase サイト（dist-site/）を組み立てる。
#   dist-site/index.html  = showcase/index.html + 契約由来データ注入（generate-showcase.ts）
#   dist-site/catalog/    = example の Expo web export（baseUrl=/catalog）
# Netlify の build command（npm run build:showcase）から呼ばれる。ローカル検証も同じ経路。
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

rm -rf "$root/dist-site"
mkdir -p "$root/dist-site"

# 1. RN catalog を /catalog 配下向けに export（app.json の experiments.baseUrl）
(cd "$root/example" && npx expo export --platform web)
cp -R "$root/example/dist" "$root/dist-site/catalog"

# 2. showcase シェルに契約由来の表・統計を注入して配置
npx tsx "$root/scripts/generate-showcase.ts"

echo "✅ dist-site を組み立てた（showcase + /catalog）"
