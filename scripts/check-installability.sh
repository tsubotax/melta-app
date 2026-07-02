#!/usr/bin/env bash
# check-installability — 「npm install すれば APP が作れる」の機械証明（公開 P1）。
#
# npm pack した tarball を使い捨て fixture プロジェクトに install し、
# ライブラリ entry からの import が型ごと解決できることを tsc で検証する。
# CI と手元（npm run check:installability）の両方から実行する。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/melta-installability.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

echo "→ npm pack（prepare で bob build が走る）"
cd "$ROOT"
TARBALL="$(npm pack --pack-destination "$WORK" --silent | tail -1)"
echo "  packed: $TARBALL"

echo "→ tarball 実体検査（型が通っても実行ファイルが欠けている壊れ方を検出）"
for required in \
  "package/lib/module/index.js" \
  "package/lib/typescript/src/index.d.ts" \
  "package/src/index.ts"; do
  if ! tar -tzf "$WORK/$TARBALL" | grep -qx "$required"; then
    echo "❌ tarball に $required がありません（bob build 出力 or files フィールドを確認）"
    exit 1
  fi
done

echo "→ fixture プロジェクトへ install"
FIXTURE="$WORK/fixture"
mkdir -p "$FIXTURE"
cd "$FIXTURE"
npm init -y --silent >/dev/null
npm install --silent --no-audit --no-fund \
  "$WORK/$TARBALL" \
  react@19.2.3 react-native@0.85.3 \
  typescript@~6.0.3 @types/react@~19.2.2 >/dev/null

echo "→ import + 型解決の検証（tsc）"
cat > check.tsx <<'TSX'
// fixture: ライブラリ利用者の最小コード。ここが型ごと通る = installable
import {
  ThemeProvider,
  useTheme,
  nativeTheme,
  Text,
  Button,
  Tag,
  Metric,
  Card,
  Surface,
  Image,
  Skeleton,
  EmptyState,
  CONTRACTS,
  type ContractId,
  type VariantOf,
} from "melta-app";

const variant: VariantOf<"button"> = "contained";
const id: ContractId = "button";

export function App() {
  return (
    <ThemeProvider>
      <Card>
        <Text variant="base">hello</Text>
        <Button variant={variant} label="save" onPress={() => {}} />
      </Card>
    </ThemeProvider>
  );
}

// 実行時値も参照できること（as const の literal 型がそのまま届くので includes で検証）
if (!CONTRACTS[id].variants.includes(variant)) throw new Error("contracts meta missing");
if (!nativeTheme.color.primary["500"]) throw new Error("theme missing");
void useTheme; void Tag; void Metric; void Surface; void Image; void Skeleton; void EmptyState;
TSX

cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["check.tsx"]
}
JSON

npx tsc -p tsconfig.json

echo "→ モジュール解決の実体確認（exports 経由で実在ファイルに解決されること）"
node --input-type=module -e "
const url = import.meta.resolve('melta-app', new URL('file://' + process.cwd() + '/'));
const { existsSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
const path = fileURLToPath(url);
if (!path.includes('lib/module')) throw new Error('exports の解決先が lib/module ではない: ' + path);
if (!existsSync(path)) throw new Error('解決先ファイルが存在しない: ' + path);
console.log('  resolved:', path);
"

echo "✅ installability OK: pack → 実体検査 → install → import → typecheck → resolve が通った"
