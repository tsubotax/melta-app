#!/usr/bin/env bash
# check-installability — 「npm install すれば APP が作れる」の機械証明（公開 P1）。
#
# npm pack した tarball を使い捨て fixture プロジェクトに install し、
# ライブラリ entry からの import が型ごと解決できることを tsc で検証する。
# CI と手元（npm run check:installability）の両方から実行する。
#
# 型解決は **消費者の moduleResolution 依存**なので、bundler だけでは足りない（W3）:
#   - fixture（main / icons / safe-area / eslint-plugin）× moduleResolution（bundler / node16 / nodenext）
#   - + attw（Are the Types Wrong?）で tarball の exports map を resolution mode ごとに直接検査
# bundler しか見ていなかった頃は「.d.ts の相対 import に拡張子が無く node16/nodenext だけ
# TS2834 で型が引けない」を素通りさせていた。
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

echo "→ attw（Are the Types Wrong?）で型解決の全 resolution mode を検査"
# .d.ts 側の壊れ方は fixture の tsc だけでは取り切れない（consumer が skipLibCheck:true だと
# 型が静かに any に落ちるため）。attw は tarball の exports map を resolution mode ごとに解決して、
# 「型が引けない / 型と JS のモジュール形式がズレている」を直接検出する。
#
# --profile esm-only の意味（ignore ルールはこの1個だけに絞っている）:
#   このパッケージは exports に require 条件を持たない ESM 専用（engines も node>=22）。
#   そのため attw の node10（exports 非対応の旧 TS 解決）と node16-cjs（require 経由）は
#   「仕様どおり解決できない」列であって欠陥ではない。この2列だけを ignore する。
#   逆に **node16 (from ESM) と bundler は無視しない** ＝ ここが赤ければ検査は落ちる。
# 注意: `--pack` は使わず上で作った tarball をそのまま渡す。同じ成果物を検査するためと、
#       npm pack を二重に走らせない（prepare の bob build がもう一度回る）ため。
npx attw "$WORK/$TARBALL" --profile esm-only --format table --no-color

echo "→ fixture プロジェクトへ install（react-native-svg 無し = 本体エントリの依存ゼロ検証）"
FIXTURE="$WORK/fixture"
mkdir -p "$FIXTURE"
cd "$FIXTURE"
npm init -y --silent >/dev/null
# fixture を ESM プロジェクトにする。node16/nodenext は「呼び出し側のモジュール形式」で
# 解決結果が変わるので、ESM-only パッケージの現実的な消費者（type: module）を再現する。
node -e '
const fs = require("node:fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.type = "module";
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
'
npm install --silent --no-audit --no-fund \
  "$WORK/$TARBALL" \
  react@19.2.3 react-native@0.85.3 \
  typescript@~6.0.3 @types/react@~19.2.2 >/dev/null

# --- consumer tsconfig の 3 構成（fixture × moduleResolution = 計 12 回の tsc）---
# bundler          : Metro / Vite など実アプリの既定。拡張子なし相対 import でも通ってしまう
# node16 / nodenext: Node の ESM 解決に厳密。.d.ts の相対 import に拡張子が無いと TS2834 で落ちる
# → bundler だけを見ていると「npm 利用者の半分で型が壊れている」を検出できない（W3 で実際に発生）
# skipLibCheck は consumer の現実（各種テンプレートが true を配る）に合わせて true のままにする。
# そのため .d.ts 内部のエラーは黙殺される = **エントリの解決可否だけが見える** 構成であり、
# 「型が引けない」の検出は上の attw が本命、ここはその二重化。
MODULE_RESOLUTIONS=(bundler node16 nodenext)

# fixture のエントリ 1 本を 3 つの moduleResolution すべてで typecheck する。
typecheck_entry() {
  local label="$1" entry="$2" mr mod
  for mr in "${MODULE_RESOLUTIONS[@]}"; do
    # node16 / nodenext は module も揃える必要がある（TS が組み合わせを強制する）
    if [ "$mr" = "bundler" ]; then mod="ESNext"; else mod="$mr"; fi
    cat > "tsconfig.${label}.${mr}.json" <<JSON
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "${mod}",
    "moduleResolution": "${mr}",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["${entry}"]
}
JSON
    npx tsc -p "tsconfig.${label}.${mr}.json"
    echo "    ✓ ${label} × moduleResolution=${mr}"
  done
}

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
      <Screen header={<Header variant="actions" title="fixture" trailing={<Button label="送信" onPress={() => {}} />} />}>
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

typecheck_entry main check-main.tsx

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

typecheck_entry icons check-icons.tsx

echo "→ react-native-safe-area-context を追加して safe-area subpath を検証（opt-in 利用者の経路）"
npm install --silent --no-audit --no-fund react-native-safe-area-context@5.5.2 >/dev/null

cat > check-safe-area.tsx <<'TSX'
// fixture C: react-native-safe-area-context を install した利用者だけが
// melta-app/safe-area を import できる（Screen の SafeArea adapter 差し替え）
import { enableSafeAreaContext } from "melta-app/safe-area";

enableSafeAreaContext();
TSX

typecheck_entry safe-area check-safe-area.tsx

echo "→ eslint plugin の import + ルール実体検査（存在チェックだけでは exports 誤記・export 名変更・ルール欠落を検出できない）"
node --input-type=module -e "
const expected = ['no-raw-color', 'no-raw-radius', 'no-raw-spacing', 'no-raw-fontsize', 'no-raw-lineheight'];
// configs.recommended は severity の配布経路（消費者が手書きするとドリフトする）。
// 中身まで照合しないと「config はあるが空」「severity が入れ替わった」を検出できない。
const expectedSeverity = {
  'melta/no-raw-color': 'error',
  'melta/no-raw-radius': 'error',
  'melta/no-raw-spacing': 'warn',
  'melta/no-raw-fontsize': 'warn',
  'melta/no-raw-lineheight': 'warn',
};
for (const spec of ['melta-app/eslint-plugin', 'melta-app/eslint-rules/melta.mjs']) {
  const mod = await import(spec);
  if (!mod.meltaPlugin) throw new Error(spec + ': meltaPlugin named export がない');
  const rules = Object.keys(mod.meltaPlugin.rules ?? {});
  for (const r of expected) {
    if (!rules.includes(r)) throw new Error(spec + ': ルール ' + r + ' が欠落（実際: ' + rules.join(',') + '）');
  }
  const recommended = mod.meltaPlugin.configs?.recommended;
  if (!recommended) throw new Error(spec + ': configs.recommended が無い（severity の配布経路が欠落）');
  if (recommended.plugins?.melta !== mod.meltaPlugin) {
    throw new Error(spec + ': configs.recommended が plugins.melta に自分自身を登録していない（1行導入が壊れる）');
  }
  const got = recommended.rules ?? {};
  if (Object.keys(got).length !== Object.keys(expectedSeverity).length) {
    throw new Error(spec + ': configs.recommended のルール数が想定外（実際: ' + Object.keys(got).join(',') + '）');
  }
  for (const [id, severity] of Object.entries(expectedSeverity)) {
    if (got[id] !== severity) {
      throw new Error(spec + ': configs.recommended の ' + id + ' が ' + severity + ' でない（実際: ' + got[id] + '）');
    }
  }
  console.log('  plugin OK:', spec, '→', rules.join(', '), '/ recommended', Object.keys(got).length, '本');
}
"

cat > check-eslint-plugin.ts <<'TS'
// fixture D: eslint plugin を **型付きで** import できること（exports の types 条件）。
// 型が無いと node16/nodenext の TS 消費者では TS7016（暗黙 any / untyped import）になる。
// 実装（melta.mjs）とルール名がズレたらここが落ちる = 手書き .d.mts のドリフト検知。
import { meltaPlugin, type MeltaPlugin, type MeltaRuleName } from "melta-app/eslint-plugin";

const plugin: MeltaPlugin = meltaPlugin;
const names: MeltaRuleName[] = ["no-raw-color", "no-raw-radius", "no-raw-spacing", "no-raw-fontsize", "no-raw-lineheight"];
for (const name of names) {
  if (!plugin.rules[name]) throw new Error(`rule ${name} missing`);
}
// flat config へ 1 行で差し込む導線が型で成立していること
export default [plugin.configs.recommended];
TS

echo "→ eslint plugin の型解決（exports の types 条件が node16/nodenext で引けること）"
typecheck_entry eslint-plugin check-eslint-plugin.ts

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

echo "✅ installability OK: pack → 実体検査 → attw → install → import → typecheck（4 fixture × 3 moduleResolution）→ resolve が通った"
