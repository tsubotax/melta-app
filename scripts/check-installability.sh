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
# 注意: `tar -tzf | grep -q` は禁止。grep -q が先に exit すると tar が SIGPIPE(141) になり、
# pipefail 下で「ファイルが無い」と誤判定する（CI の Linux でのみ発火する flaky、2026-07-02 に実発生）。
# tar は1回だけ実行して全リストを変数に取り、変数に対して照合する。
LISTING="$(tar -tzf "$WORK/$TARBALL")"
for required in \
  "package/lib/module/index.js" \
  "package/lib/typescript/src/index.d.ts" \
  "package/src/index.ts" \
  "package/lib/module/icons/index.js" \
  "package/lib/typescript/src/icons/index.d.ts" \
  "package/lib/module/safe-area/index.js" \
  "package/lib/typescript/src/safe-area/index.d.ts" \
  "package/eslint-rules/melta.mjs" \
  "package/THIRD_PARTY_LICENSES.md"; do
  if ! grep -qx "$required" <<<"$LISTING"; then
    echo "❌ tarball に $required がありません（bob build 出力 or files フィールドを確認）"
    echo "--- 診断: 環境 ---"
    node --version; npm --version
    echo "--- 診断: ディスク上の lib（prepare の出力） ---"
    find "$ROOT/lib" -maxdepth 2 || true
    echo "--- 診断: tarball 内容 ---"
    echo "$LISTING"
    exit 1
  fi
done

echo "→ fixture プロジェクトへ install（react-native-svg 無し = 本体エントリの依存ゼロ検証）"
FIXTURE="$WORK/fixture"
mkdir -p "$FIXTURE"
cd "$FIXTURE"
npm init -y --silent >/dev/null
npm install --silent --no-audit --no-fund \
  "$WORK/$TARBALL" \
  react@19.2.3 react-native@0.85.3 \
  typescript@~6.0.3 @types/react@~19.2.2 >/dev/null

echo "→ 本体エントリの import + 型解決（svg 無しで通る = subpath 隔離が機能）"
cat > check-main.tsx <<'TSX'
// fixture A: react-native-svg を install していない利用者の最小コード。
// 本体エントリ（melta-app）は依存ゼロなので、ここが型ごと通らなければ隔離が壊れている。
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
  Stack,
  Row,
  Screen,
  Header,
  Avatar,
  TextField,
  Toggle,
  Checkbox,
  Radio,
  Alert,
  Toast,
  Progress,
  Modal,
  ActionSheet,
  BottomSheet,
  CONTRACTS,
  type ContractId,
  type VariantOf,
} from "melta-app";

const variant: VariantOf<"button"> = "contained";
const id: ContractId = "button";

export function App() {
  return (
    <ThemeProvider>
      <Screen header={<Header title="fixture" />}>
        <Stack gap="4">
          <Row gap="2" justify="between" wrap>
            <Avatar name="Taro Tanaka" status="online" />
            <Avatar.Group>
              <Avatar name="A" size="small" />
              <Avatar name="B" size="small" />
            </Avatar.Group>
          </Row>
          <Card>
            <Text variant="base">hello</Text>
            <Button variant={variant} label="save" onPress={() => {}} />
          </Card>
          <TextField label="メール" value="" onChangeText={() => {}} />
          <Toggle value onValueChange={() => {}} label="通知" />
          <Checkbox label="同意" checked onChange={() => {}} />
          <Radio
            label="配送"
            options={[{ label: "標準", value: "std" }]}
            value="std"
            onChange={() => {}}
          />
          <Alert variant="info" message="お知らせ" />
          <Toast variant="success" message="保存しました" onClose={() => {}} />
          <Progress value={50} label="進捗" />
          <Modal visible={false} title="確認" onClose={() => {}}>
            <Text>body</Text>
          </Modal>
          <ActionSheet visible={false} onClose={() => {}} actions={[{ label: "共有", onPress: () => {} }]} />
          <BottomSheet visible={false} onClose={() => {}}>
            <Text>sheet</Text>
          </BottomSheet>
        </Stack>
      </Screen>
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
  "include": ["check-main.tsx"]
}
JSON

npx tsc -p tsconfig.json

echo "→ react-native-svg を追加して icons subpath を検証（opt-in 利用者の経路）"
npm install --silent --no-audit --no-fund react-native-svg@15.15.4 >/dev/null

cat > check-icons.tsx <<'TSX'
// fixture B: react-native-svg を install した利用者だけが melta-app/icons を import できる
import { Icon, ICON_NAMES, type IconName } from "melta-app/icons";

const iconName: IconName = "close";
if (!ICON_NAMES.includes(iconName)) throw new Error("icon glyphs missing");

export function Deco() {
  return <Icon name={iconName} size="sm" />;
}
TSX

cat > tsconfig.icons.json <<'JSON'
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
  "include": ["check-icons.tsx"]
}
JSON

npx tsc -p tsconfig.icons.json

echo "→ react-native-safe-area-context を追加して safe-area subpath を検証（opt-in 利用者の経路）"
npm install --silent --no-audit --no-fund react-native-safe-area-context@5.5.2 >/dev/null

cat > check-safe-area.tsx <<'TSX'
// fixture C: react-native-safe-area-context を install した利用者だけが
// melta-app/safe-area を import できる（Screen の SafeArea adapter 差し替え）
import { enableSafeAreaContext } from "melta-app/safe-area";

enableSafeAreaContext();
TSX

cat > tsconfig.safe-area.json <<'JSON'
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
  "include": ["check-safe-area.tsx"]
}
JSON

npx tsc -p tsconfig.safe-area.json

echo "→ eslint plugin の import + ルール実体検査（存在チェックだけでは exports 誤記・export 名変更・ルール欠落を検出できない）"
node --input-type=module -e "
const expected = ['no-raw-color', 'no-raw-radius', 'no-raw-spacing', 'no-raw-fontsize'];
for (const spec of ['melta-app/eslint-plugin', 'melta-app/eslint-rules/melta.mjs']) {
  const mod = await import(spec);
  if (!mod.meltaPlugin) throw new Error(spec + ': meltaPlugin named export がない');
  const rules = Object.keys(mod.meltaPlugin.rules ?? {});
  for (const r of expected) {
    if (!rules.includes(r)) throw new Error(spec + ': ルール ' + r + ' が欠落（実際: ' + rules.join(',') + '）');
  }
  console.log('  plugin OK:', spec, '→', rules.join(', '));
}
"

echo "→ モジュール解決の実体確認（exports 経由で実在ファイルに解決されること）"
node --input-type=module -e "
const { existsSync } = await import('node:fs');
const { fileURLToPath } = await import('node:url');
for (const spec of ['melta-app', 'melta-app/icons', 'melta-app/safe-area']) {
  const url = import.meta.resolve(spec, new URL('file://' + process.cwd() + '/'));
  const path = fileURLToPath(url);
  if (!path.includes('lib/module')) throw new Error('exports の解決先が lib/module ではない: ' + path);
  if (!existsSync(path)) throw new Error('解決先ファイルが存在しない: ' + path);
  console.log('  resolved:', spec, '→', path);
}
"

echo "✅ installability OK: pack → 実体検査 → install → import → typecheck → resolve が通った"
