# melta for APP（melta-app）

**React Native（Expo）版の melta デザインシステム — アプリ本体ではなく、`npm install melta-app` で使う UI kit（ライブラリ）。** web 版 [melta-ui](https://github.com/tsubotax/melta-ui) と同じデザイン契約（`melta-contracts`）を single source of truth に、RN 実装でその契約を満たす。

> 1 つのデザイン言語が、web では Tailwind に、app では React Native に降りる。

- **Showcase / Live Catalog**: https://app.melta.tsubotax.com （Live Catalog は実 RN コンポーネントの web export。HTML 再現デモではない）
- **Web 版 showcase**: https://melta.tsubotax.com

**現在の adopter は 1 つ**（非公開プロジェクトのモバイルアプリ）。dogfood はそこで回している。
D2I は当初想定していた最初の adopter だが、mobile 側はまだ melta-app を導入していない
（D2I の web 側が使っているのは melta-ui）。

## Install

```bash
npm install melta-app
```

peerDependencies は `react` / `react-native` のみ（Expo でも素の RN でも可、runtime 依存ゼロ）。

```tsx
import { ThemeProvider, Screen, Header, Card, Text, Button } from "melta-app";

export default function App() {
  return (
    <ThemeProvider>
      <Screen variant="scroll" header={<Header title="ダッシュボード" />}>
        <Card>
          <Text>東京プロジェクト</Text>
        </Card>
        <Button label="保存する" onPress={() => {}} />
      </Screen>
    </ThemeProvider>
  );
}
```

テーマは `ThemeProvider` が OS の light / dark に自動追従（`forcedMode` で固定も可）。トークンは `useTheme()` / `nativeTheme` から取れる。本体エントリ以外は subpath 3 つ（[Icon](#subpath-エントリ-iconmelta-appicons) / [SafeArea 差替](#safearea-の差し替えmelta-appsafe-area) / [lint plugin](#lint-pluginmelta-appeslint-plugin)）。

### ブランドテーマを注入する

`theme` を渡すと自分のブランドトークンで塗り替わる。未指定なら melta 既定（`nativeTheme`）。

```tsx
import { defineTheme, ThemeProvider } from "melta-app";

// module スコープで1回だけ組み立てる（render 中に作ると毎レンダー参照が変わり全体が再レンダーする）
const theme = defineTheme({
  id: "acme",
  color: { /* primary / body / semantic / status */ },
  typography: { /* … */ },
  spacing: { /* … */ }, radius: { /* … */ },
  elevation: { /* … */ }, motion: { /* … */ }, zIndex: { /* … */ },
});

export default function App() {
  return <ThemeProvider theme={theme}>{/* … */}</ThemeProvider>;
}
```

**単一の配色しか持たないブランド**（例: dark しか作らない）は、持っていない mode を **書かない**。

```tsx
const theme = defineTheme({
  id: "acme",
  color: { /* … */ semantic: { dark: darkColors } },  // light は書かない
  /* … */
});
```

- `useTheme().capabilities.colorScheme` が `"single-dark"` として導出される（宣言する欄は無い。`color.semantic` のキー集合がそのまま能力になる）
- OS が light を返しても **dark で描画する**（警告は出さない。light を作らないのは設計判断で、OS 設定は事故ではない）
- `forcedMode="light"` のように**対応していない mode を明示指定**した場合も描画は止めず clamp するが、開発時は `console.error` で1回報告する。light/dark トグル UI を出すなら `capabilities.colorScheme` を見て出し分けること
- `theme.color.semantic.light` を直接読むと、原因を名指しするエラーで落ちる（値を捏造して静かに間違った色を返すことはしない）。現在 mode の色は `useTheme().colors` から取る

> 現状 `color.primary` / `text-accent` / `elevation` / status の light 値は、単一 dark のテーマでも**必須のまま**。省略できるのは `color.semantic` の mode だけで、他の軸を「持たない」と宣言する仕組みは後続で入れる。

### 押せるカード（`variant="action"` / `"link"`）

**カード面そのものは操作要素ではない。** 面を押せるのはポインタ利用者向けの近道で、
キーボードとスクリーンリーダーからの到達手段は**カード内の操作要素**が担う。
そのため `primaryAction` が必須になっている。

```tsx
<Card
  variant="action"
  onPress={openLog}
  primaryAction={<Button label="製作ログを見る" onPress={openLog} />}
>
  <Text variant="lg" role="heading">工房 #12</Text>
</Card>
```

- `primaryAction` は面の `onPress` と**同じ操作**を指す（別の遷移先にしない）
- ラベルは `primaryAction` 側に付ける。カードは名前を持たない（`role="article"` の領域）
- カード内に操作要素が複数あってよい。`primaryAction` に置くのは**主アクション**（面を押したときの遷移先と一致するもの）
- 面に `accessibilityRole="button"` は付かない。`Button` を内包しても DOM が壊れない

0.4.x からの移行は [CHANGELOG](./CHANGELOG.md#050--2026-07-29) を参照。

## 設計の核

- **契約は共有、実装は各最適**: tokens / 禁止ルール / component 契約は `melta-contracts`（JSON）が SSOT。melta-app に token は持たない（二重化を物理防止）。
- **公開 DS の純度を守る**: 汎用 UI プリミティブだけを置く。アプリ固有の UI（特定サービスの画面・機能・語彙）は**各アプリ側**に置き、ここには混ぜない。
- **依存最小**: 初期は RN `StyleSheet` 固定（nativewind / unistyles 等の runtime styling lib を入れない）。Storybook RN も使わず自前カタログ。

## AI-Ready

人間と AI の両方が読めることを最初から設計に入れている。

- **契約が機械可読**: variants / sizes / states / tokens / a11y はすべて `melta-contracts` の JSON。生成 AI は「それっぽい見た目」ではなく契約を参照して UI を書ける。
- **実装状態も機械可読**: 各契約の `appStatus`（implemented / planned / not-planned）と `appMapping`（adapted = モバイル慣習への変換）が SSOT。この README のコンポーネント表も、showcase の表も、そこから生成される — 手書きの表はこのリポに存在しない。
- **ズレは CI が拾う**: 契約と実装の齟齬は conformance テスト、ドキュメントの腐りは drift 検査が落とす。「AI が書いたコードが DS に準拠しているか」を人間の目視でなくハーネスが判定する。
- web 版には MCP サーバー（`melta-ds-mcp`）もあり、Claude Code / Cursor から契約・トークン・ルールを直接引ける（RN 対応は今後）。

## ディレクトリ

```
melta-app/
  src/                          ライブラリ本体（npm 配布物）
    theme/
      types.ts                  NativeTheme の型
      native-theme.ts           ⚠️ 自動生成（melta-contracts → RN 正規化済み）
      index.ts                  theme エントリ（ThemeProvider / useTheme / nativeTheme）
    primitives/                 Text / Button / Tag / Metric / Stack / Row
    components/                 Card / Image / Surface / Skeleton / EmptyState / Screen / Header /
                                Avatar / TextField / Toggle / Checkbox / Radio / Alert / Toast /
                                Progress / Modal / ActionSheet / BottomSheet
    icons/                      Icon + glyphs（subpath エントリ melta-app/icons、react-native-svg 隔離）
    contracts/
      contract-types.ts         ⚠️ 自動生成（契約メタ CONTRACTS + 型）
    index.ts                    公開エントリ
  example/                      カタログアプリ（Expo、publish 除外）
    App.tsx / catalog/ / screens/
  scripts/
    generate-native-theme.ts    melta-contracts/tokens.json → src/theme/native-theme.ts
    generate-contract-types.ts  契約 JSON → src/contracts/contract-types.ts
    check-drift.ts              README / catalog / allowlist の drift 検査（--write で heal）
    check-installability.sh     pack → install → import → typecheck の公開ゲート
    lib/                        token 正規化 + conformance / consumer テスト
```

## トークン正規化（web → RN）

`scripts/lib/normalize-tokens.ts` が変換する。壊れやすい箇所はテスト必須。

| トークン | web | RN |
|---|---|---|
| color | hex / rgba | そのまま（semantic は light/dark mode 切替） |
| spacing / radius / fontSize | rem + px | px の数値を採用（RN は unitless） |
| shadow | CSS box-shadow | iOS shadow* + Android elevation に分解（1 ViewStyle に同居） |
| fontFamily | 配列 | 単一文字列（先頭採用、未ロード時 OS デフォルト fallback） |
| lineHeight | 比率（"2.0"） | `fontSize × ratio` を px 算出 |
| letterSpacing | em | **em ratio の数値で保持**（fontSize 相対のため token 単体で px 化不可。適用側が `fontSize × ratio` で解決） |
| motion duration | "150ms" | 150（数値） |
| motion easing | cubic-bezier | `[a,b,c,d]` tuple（`Easing.bezier(...)` に展開） |

## 開発（このリポを触る人向け）

```bash
npm install   # melta-contracts（npm 公開済み）も devDependencies として入る

# theme + contract 型を生成（melta-contracts のノードを読む。
# 未 install 時のみ隣の melta-ui を fallback で読む開発モード）
npm run generate

# 変換・conformance・consumer テスト
npm test

# 実機 / シミュレータでカタログを確認
npm run ios   # または android / web
```

## コンポーネント

契約（melta-contracts）とコンポーネントの対応。この表は手書きせず契約から生成する（`npm run check:drift` が同期を検査）。

<!-- BEGIN GENERATED: component-status（scripts/check-drift.ts --write で再生成。手編集禁止） -->
| 契約 | Component | APP | 形（appMapping） | メモ |
|---|---|---|---|---|
| action-sheet | `ActionSheet` | ✅ implemented | — |  |
| alert | `Alert` | ✅ implemented | — |  |
| avatar | `Avatar` | ✅ implemented | — |  |
| bottom-sheet | `BottomSheet` | ✅ implemented | — |  |
| button | `Button` | ✅ implemented | — |  |
| card | `Card` | ✅ implemented | — |  |
| checkbox | `Checkbox` | ✅ implemented | — |  |
| empty-state | `EmptyState` | ✅ implemented | — |  |
| header | `Header` | ✅ implemented | — |  |
| icon | `Icon` | ✅ implemented | — |  |
| image | `Image` | ✅ implemented | — |  |
| metric | `Metric` | ✅ implemented | — |  |
| modal | `Modal` | ✅ implemented | — |  |
| progress | `Progress` | ✅ implemented | — |  |
| radio | `Radio` | ✅ implemented | — |  |
| row | `Row` | ✅ implemented | — |  |
| screen | `Screen` | ✅ implemented | — |  |
| skeleton | `Skeleton` | ✅ implemented | — |  |
| stack | `Stack` | ✅ implemented | — |  |
| surface | `Surface` | ✅ implemented | — |  |
| tag | `Tag` | ✅ implemented | — |  |
| text | `Text` | ✅ implemented | — |  |
| textfield | `TextField` | ✅ implemented | — |  |
| toast | `Toast` | ✅ implemented | — |  |
| toggle | `Toggle` | ✅ implemented | — |  |
| accordion | — | ⬜ planned | — |  |
| badge | — | ⬜ planned | — |  |
| datepicker | — | ⬜ planned | adapted | カレンダー自作はしない。OS 標準の日付ピッカー（@react-native-community/datetimepicker 等）への委譲でトークンのみ供給 |
| divider | — | ⬜ planned | — |  |
| dropdown | — | ⬜ planned | adapted | hover 起動は存在しない。タップ起動の Menu（アンカー付き）or ActionSheet に変換 |
| list | — | ⬜ planned | — |  |
| select | — | ⬜ planned | adapted | web のドロップリストは持ち込まない。ActionSheet / BottomSheet / OS Picker で開く選択 UI に変換（gluestack/Tamagui も native では Sheet 化） |
| stepper | — | ⬜ planned | — |  |
| tabs | — | ⬜ planned | adapted | トップタブ / SegmentedControl 型として実装（web の下線タブ意味論を M3 segmented / iOS UISegmentedControl に写像） |
| breadcrumb | — | 🚫 not-planned | — | RN 主要ライブラリ提供 0/5。Apple HIG が multisegment breadcrumb を明示的に否定。back ボタン + nav bar タイトルで代替 |
| copy-button | — | 🚫 not-planned | — | DS プリミティブでなくアプリ層のコンポジット（button + clipboard + toast） |
| pagination | — | 🚫 not-planned | — | モバイルは無限スクロール（FlatList onEndReached）で代替。カルーセル文脈は PageControl の領分 |
| sidebar | — | 🚫 not-planned | — | Navigation Drawer の領分＝react-navigation 側の責務。DS はトークン供給のみ |
| table | — | 🚫 not-planned | — | モバイルは単列リスト / Card への再構成が定石（M3 に data table なし）。list + metric で分解表現する |
| tooltip | — | 🚫 not-planned | — | hover 前提のため。iPhone HIG に tooltip 概念なし。必要になれば長押し Hint として別契約を切る |
<!-- END GENERATED: component-status -->

### subpath エントリ: Icon（`melta-app/icons`）

subpath は Icon / SafeArea 差替（`melta-app/safe-area`）/ lint plugin（`melta-app/eslint-plugin`）の 3 つ。
このうち Icon は唯一 `react-native-svg`（optional peerDependency）に依存するため、本体エントリから分離している。
本体 `melta-app` は依存ゼロのまま — Icon を使うアプリだけが以下を行う:

```bash
npx expo install react-native-svg
```

```tsx
import { Icon } from "melta-app/icons";

<Icon name="like-on" accessibilityLabel="いいね" />        // 意味を持つ icon は label 必須
<Icon name="close" size="sm" color="text-muted" />         // 省略時は装飾扱い（a11y ツリーから除外）
```

グリフは Charcoal Icons（pixiv、Apache-2.0）の curated サブセット + Charcoal に無いグリフの
Material Symbols Rounded（Google、Apache-2.0）補完（`assets/icons/*.svg` →
`npm run generate:icons` で `src/icons/glyphs.ts` に codegen、commit 済みを配布）。
帰属表示は `THIRD_PARTY_LICENSES.md`。

### SafeArea の差し替え（`melta-app/safe-area`）

Screen の SafeArea は default で RN core の SafeAreaView（deprecated / iOS のみの最小対応、
依存ゼロ維持）。`react-native-safe-area-context` を使うアプリは subpath から一度有効化すると
Screen が context 版に切り替わり、RN 0.85+ の deprecation 警告も出なくなる:

```bash
npx expo install react-native-safe-area-context
```

```tsx
// アプリの entry（Screen の初回 render より前）で一度だけ
import { enableSafeAreaContext } from "melta-app/safe-area";
enableSafeAreaContext();

// ボトムタブバー等が bottom inset を自前処理するアプリは edge を絞る
// （全 edge のまま使うとタブ内 Screen の bottom が二重余白になる）
enableSafeAreaContext({ edges: ["top"] });
```

⚠️ 前提と契約:

- 祖先に `SafeAreaProvider` が**必須**（無いと `useSafeAreaInsets` が **throw する**。
  React Navigation / Expo Router を使っていれば設置済みのことが多い）。初回 render から
  正しい inset を使うには Provider に `initialMetrics` を渡す
- adapter は `useSafeAreaInsets()` を render 中に同期参照して View padding に加算する方式
  （native SafeAreaView の初回フレーム inset 未適用によるフラッシュを避けるため）
- safe-area と合成する padding は**数値のみ**サポート（`"5%"` 等の非数値は基底として扱えず、
  対象 edge は inset 値に置き換わる）。RTL / `paddingStart`・`paddingEnd` は対応済み

### lint plugin（`melta-app/eslint-plugin`）

melta 契約からの逸脱を機械検知する eslint カスタムルール 4 本を同梱している。
消費者プロジェクトの flat config に組み込むと、生値の直書きが lint で止まる。
推奨 severity 込みの config を配布しているので **1 行で入る**:

```js
// eslint.config.mjs
import { meltaPlugin } from "melta-app/eslint-plugin";

export default [meltaPlugin.configs.recommended];
```

`configs.recommended`（flat config 形式）は plugin の登録とルール 4 本の severity を含む。
**severity の正本は plugin 側**なので、消費者がドキュメントから写して持つ必要はない。

⚠️ **前提**: この config は parser を提供しない。TS/TSX を lint するには、既存の base config
（`@react-native/eslint-config/flat` や typescript-eslint 等、parser を持つもの）の**上に追加**すること。
recommended 単独の構成では TS/TSX の構文解析に失敗する。

適用範囲は指定していない（消費者側の config 構成に委ねる）。TS/TSX だけに絞る、
severity を変える、といった**カスタマイズをする場合**は spread して上書きする:

```js
// eslint.config.mjs（カスタマイズする場合）
import { meltaPlugin } from "melta-app/eslint-plugin";

export default [
  {
    ...meltaPlugin.configs.recommended,
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      ...meltaPlugin.configs.recommended.rules,
      "melta/no-raw-spacing": "off", // 例: false positive が多い環境では落とす
    },
  },
];
```

plugin の登録とルール指定を最初から自分で書く形（従来の書き方）も動く:

```js
// eslint.config.mjs（すべて手書きする場合）
import { meltaPlugin } from "melta-app/eslint-plugin";

export default [
  {
    plugins: { melta: meltaPlugin },
    rules: {
      "melta/no-raw-color": "error",    // 生 hex/rgb/hsl → theme.color.*
      "melta/no-raw-radius": "error",   // borderRadius 数値直書き → theme.radius.*
      "melta/no-raw-spacing": "warn",   // padding/margin/gap 数値直書き（false positive あり）
      "melta/no-raw-fontsize": "warn",  // fontSize 数値直書き
    },
  },
];
```

- 依存ゼロの自己完結 ESM（eslint 本体以外に何も要らない）。ESLint 9+ の flat config を想定（このリポでは 10.x で検証）
- `meltaPlugin` は **named export のみ**（default export なし）
- eslintrc（`.eslintrc.*`）からは登録できない（ESM の named export のみのため）。flat config への移行が要る
- 検知は AST の構文形状ベースの補助線。変数経由・spread は漏れるので、値の純度の本丸は
  token 経由（`theme.*`）で書く習慣の側にある

## ステータス

- ✅ ライブラリ化（root=ライブラリ / example=カタログアプリ、peerDeps react + react-native、runtime deps ゼロ）
- ✅ `melta-contracts` を npm 依存として購読（recipes/app の styleRefs 同梱）
- ✅ conformance: 契約源 ↔ 生成メタ ↔ `__contract` 宣言の照合 + consumer テスト（契約 subset / token 実在 / contractVersion 同期）+ styleRefs conformance（全実装コンポーネント展開済み）+ RN mount smoke（light/dark × 全公開コンポーネント）
- ✅ ハーネス: design lint（CI `--max-warnings 0` + PostToolUse hook）/ drift 検査（README・catalog・allowlist 突合）/ installability ゲート（pack → tarball 実体検査 → fixture へ install → 本体 / icons / safe-area の import + typecheck → eslint plugin を実 import してルール 4 本の実在を照合 → exports の解決先確認。`npm run release` チェーンの必須ステップ）
- ✅ layout 6 個（Stack / Row / Screen / Header / Icon / Avatar）— dogfood 不足 1〜4 を解消、ProjectFeedScreen は公開 primitive だけで構成
  - Screen の SafeArea は adapter registry 化済み: default は RN core SafeAreaView（依存ゼロ維持）、`melta-app/safe-area` の `enableSafeAreaContext()` で react-native-safe-area-context に差し替え可（optional peer）
- ✅ form / feedback 10 個（TextField / Toggle / Checkbox / Radio / Alert / Toast / Progress / Modal / ActionSheet / BottomSheet）— checkbox / radio は Pressable + 描画（svg 非依存）、ActionSheet / BottomSheet は select / dropdown の adapted 変換先の受け皿
- ✅ showcase（https://app.melta.tsubotax.com — melta-ui 様式シェル + 実 RN カタログの Live 埋め込み。表・統計は契約からビルド時生成）
- ✅ AI 入口: [llms.txt](https://app.melta.tsubotax.com/llms.txt)（契約から生成・drift 検査対象）+ [docs/patterns.md](docs/patterns.md)（フォームの組み方規範。スニペットは実コードと機械同期）
- ✅ lint 強制層の npm 配布（0.5.2）: `melta-app/eslint-plugin` を公開 subpath 化。消費者プロジェクトの flat config に組めば、生値の直書きが消費者側でも lint で止まる。推奨 severity は `configs.recommended` で配布（0.5.3。消費者が手書きで写さない）
- ✅ 消費者プロジェクトでの実導入検証（2026-08-04）: 外部の RN アプリ（非公開）に npm 経由で導入し、AI が違反コードを書いた直後に検出 → 修正フィードバック → 自己修正、のループを実測で確認。導入時に見つかった hook の欠陥（実行失敗時に無言で素通りする）は同日中に本体へ還元し、故障系を含む E2E 14 ケースで固定（0.5.3）
- ✅ [npm publish（0.5.3）](https://www.npmjs.com/package/melta-app)
- ⬜ React Native Directory 登録（[PR #2606](https://github.com/react-native-community/directory/pull/2606) レビュー待ち）

詳細は D2I リポの `.team/specs/requirements-melta-app.md`。

## License

MIT
