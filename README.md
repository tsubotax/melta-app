# melta for APP（melta-app）

[![Check](https://github.com/tsubotax/melta-app/actions/workflows/check.yml/badge.svg)](https://github.com/tsubotax/melta-app/actions/workflows/check.yml)
[![npm](https://img.shields.io/npm/v/melta-app)](https://www.npmjs.com/package/melta-app)

**web と同じデザイン契約を React Native に降ろす UI kit。使う側のコードにも lint 強制層を npm で配る。**
アプリ本体ではなく `npm install melta-app` で使うライブラリ。

- **契約は共有** — web 版 [melta-ui](https://github.com/tsubotax/melta-ui) と同じ `melta-contracts`（JSON）が tokens / 禁止ルール / component 契約の single source of truth
- **RN コンポーネント** — その契約を満たす React Native（Expo）実装。[対応表](#コンポーネント)は契約から生成する
- **利用側コードの lint 強制層** — [`melta-app/eslint-plugin`](#利用側コードの-lint-強制層melta-appeslint-plugin) を同梱。DS を**使う側**のプロジェクトで生値の直書きが lint で止まる

> 1 つのデザイン言語が、web では Tailwind に、app では React Native に降りる。

- **Showcase / Live Catalog**: https://app.melta.tsubotax.com （Live Catalog は実 RN コンポーネントの web export。HTML 再現デモではない）
- **Web 版 showcase**: https://melta.tsubotax.com

## Proof（機械で担保している範囲）

このリポジトリで検証できる主張には実行コマンドを付けてある。証拠として挙げたリポジトリ内の
パスとアンカーは drift 検査（`npm run check:drift`）が実在を照合するので、リンクが腐れば CI が落ちる。
※実導入検証（下記 2 項目め）だけは非公開プロジェクトでの**実測報告**で、読者が再実行できるのは
同じ欠陥を固定した E2E テストまで。

- **ドキュメントは契約からの生成物** — 下の[コンポーネント表](#コンポーネント)・[llms.txt](https://app.melta.tsubotax.com/llms.txt)・showcase の統計は `melta-contracts` から生成し、手書きの表はこのリポに存在しない。腐りは drift 検査が落とす（[scripts/check-drift.ts](./scripts/check-drift.ts) / [CI](./.github/workflows/check.yml)）
- **消費者プロジェクトでの実導入検証（2026-08-04）** — 別リポジトリの自プロジェクト（非公開 RN アプリ）に npm 経由で導入し、AI が違反コードを書いた直後に検出 → 修正フィードバック → 自己修正、のループを実測で確認。導入時に見つかった hook の欠陥（実行失敗時に無言で素通りする）は同日中に本体へ還元し、故障系を含む E2E 15 ケースで固定 — 0.5.3 で 14、0.8.0 の no-raw-lineheight 追加で 15（[scripts/lib/hook-lint.test.ts](./scripts/lib/hook-lint.test.ts) / [CHANGELOG 0.5.3](./CHANGELOG.md#053--2026-08-04)）
- **「npm install すれば動く」の機械証明** — pack → tarball 実体検査 → [attw](https://github.com/arethetypeswrong/arethetypeswrong.github.io) で exports の型解決を resolution mode ごとに検査 → fixture へ install → 本体 / icons / safe-area / eslint-plugin の import + typecheck を **`moduleResolution` 3 種（bundler / node16 / nodenext）すべてで**実行 → lint plugin を実 import してルール 5 本と推奨 severity を照合、までを公開ゲートにしている（[scripts/check-installability.sh](./scripts/check-installability.sh)。`npm run release` の必須ステップ）

## Quickstart

```bash
npm install melta-app
```

必須の peerDependencies は `react` / `react-native` の 2 つ（runtime 依存ゼロ）。機能別の optional peer が 2 つ — `react-native-svg`（`melta-app/icons` を使う場合のみ）と `react-native-safe-area-context`（`melta-app/safe-area` を使う場合のみ）。配布物は **ESM のみ**（`require()` では読めない。検証済みは Expo 56 / Metro — 他バンドラは ESM 対応が前提）。型は `moduleResolution` が `bundler` / `node16` / `nodenext` のいずれでも解決できることを CI で検査している（`skipLibCheck: true` の消費者でも型が欠落しない）。eslint plugin / hook などの Node ツール面は Node.js 22 で検証している（`engines` 宣言）。

**React Native バージョン対応**（下限 0.71 は `gap` / `role` 使用のため。型・Jest で検証済みなのは Expo 56 / RN 0.85 / React 19.2 の組のみ）:

| RN | melta-app | optional peer の目安 |
|---|---|---|
| 0.85（検証済み） | ✅ | safe-area-context 5.x / svg 15.13+ |
| 0.74〜0.84 | 型上は互換（未検証） | safe-area-context 5.x / svg 15.8+ |
| 0.73 | 型上は互換（未検証） | safe-area-context 4.x / svg 15.8+ |
| 0.71〜0.72 | 型上は互換（未検証） | safe-area-context 4.x / svg 15.0〜15.7 |
| 〜0.70 | ❌（`gap` レイアウトが崩れる） | — |

> ⚠️ **0.x 系につき破壊的変更は minor で入る**（CHANGELOG 方針）。`^` 範囲でなく**バージョン固定か `~` 範囲**を推奨。

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

テーマは `ThemeProvider` が OS の light / dark に自動追従（`forcedMode` で固定も可）。トークンは `useTheme()` / `nativeTheme` から取れる。自分のブランドで塗り替えるなら[テーマを注入する](#テーマを注入するブランドトークン)。本体エントリ以外は subpath 3 つ（[Icon](#iconmelta-appicons) / [SafeArea 差替](#safearea-の差し替えmelta-appsafe-area) / [lint plugin](#利用側コードの-lint-強制層melta-appeslint-plugin)）。

### bare React Native（Expo を使わない場合）

melta-app 本体は JS のみで、ネイティブモジュールを含まない。ただし**optional peer の 2 つ
（`react-native-safe-area-context` / `react-native-svg`）は本物のネイティブモジュール**なので、
bare RN では npm install だけでは動かない。iOS は Pods の再インストールと、両 OS ともネイティブの
再ビルドが要る（JS の reload では反映されない）:

```bash
# bare RN — 使う subpath に対応する peer だけ入れる
npm install react-native-svg react-native-safe-area-context
npx pod-install            # iOS（= cd ios && pod install）
# その後 Xcode / Gradle でネイティブを**再ビルド**する（Metro の reload では足りない）
```

Expo（managed / prebuild）なら従来どおり `npx expo install` が RN 版に合う版を選び、
config plugin と prebuild が iOS/Android 側を面倒見る:

```bash
npx expo install react-native-svg react-native-safe-area-context
```

どちらの peer も使わない（`melta-app` 本体エントリだけ import する）なら、
melta-app の導入にネイティブ作業は発生しない。

> 検証済みの構成は **Expo 56 / RN 0.85 / React 19.2** の組だけ（[制約と正直な範囲](#制約と正直な範囲)）。
> bare RN 構成は型・依存関係の上では成立するが、実機での検証は行っていない。

### dev 検証と `__DEV__`

melta の dev 専用チェックは `__DEV__`（Metro のグローバル）が真のときだけ動く:

- `defineTheme()` の `validateTheme` — 壊れた theme をその場で throw
- 解決済み theme の `deepFreeze` — 後からの書き換えを凍結して検出
- `ThemeProvider` の mode 違反レポート / `Card` の不正 prop 組み合わせの `console.error`

**Metro 以外のバンドラ（Vite / webpack での react-native-web など）は `__DEV__` を定義しない。**
その環境では `process.env.NODE_ENV === "development"` にフォールバックし、
どちらも判定できなければ dev 検証は**自動で無効**になる（本番に dev コストを漏らさない側に倒す設計）。
つまり「警告が一度も出ない ＝ 違反が無い」ではない。有効にしたい場合はどちらかを与える:

```js
// Vite
export default { define: { __DEV__: JSON.stringify(true) } };
// webpack
new webpack.DefinePlugin({ __DEV__: JSON.stringify(true) });
// もしくは NODE_ENV=development でビルド / 起動する
```

production ビルドでは `__DEV__` を偽（または未定義）のままにする — dev 検証は本番で不要な
コストであり、Metro は偽に畳み込まれた分岐ごとバンドルから落とす。

## 利用側コードの lint 強制層（`melta-app/eslint-plugin`）

melta 契約からの逸脱を機械検知する eslint カスタムルール 5 本を同梱している。
消費者プロジェクトの flat config に組み込むと、生値の直書きが**使う側のコードで**止まる。

### 動く完全例

melta の config は parser を持たない（**単独では TS/TSX が lint されない** — 後述）。
RN の base config と組み合わせた、コピペで動く最小構成が以下:

```bash
npm i -D eslint @react-native/eslint-config prettier
```

```js
// eslint.config.mjs
import rnConfig from "@react-native/eslint-config/flat";
import { meltaPlugin } from "melta-app/eslint-plugin";

export default [
  // theme 定義ファイルはブランドの生値そのものなので lint 対象から外す
  { ignores: ["**/theme.ts"] },

  // 1. RN 標準の base config。parser（TS/TSX）と React / RN ルールはこちらが持つ
  ...rnConfig,

  // 2. melta の推奨 severity を追加する（この 1 行）。適用範囲だけ自分で決める
  { ...meltaPlugin.configs.recommended, files: ["**/*.{ts,tsx}"] },
];
```

**成功判定**: 生値を書いたファイルで `npx eslint .` を実行すると、違反したルールが名前付きで出る（この fixture は 5 本中 4 本を踏む）。

```
src/Bad.tsx
  14:22  error    生の色 "#ff0000" は禁止。theme.color.* を使う。            melta/no-raw-color
  15:5   error    borderRadius の生数値は禁止。theme.radius.* を使う。        melta/no-raw-radius
  16:5   warning  spacing の生数値は theme.spacing.* 推奨。                  melta/no-raw-spacing
  19:5   warning  fontSize の生数値は theme.typography.fontSize.* 推奨。     melta/no-raw-fontsize

✖ 4 problems (2 errors, 2 warnings)
```

`theme.*` 経由で書き直すと 0 件になる。ここまでが「利用側に強制層が入った」状態。

> この例は eslint 9.39 / `@react-native/eslint-config` 0.85.3 / melta-app 0.5.3 の
> 使い捨て fixture（tarball install）で実行して確認したもの（no-raw-lineheight 追加前の 0.5.3 時点）。ルール 5 本の実在と severity は
> `check:installability` が毎リリース照合する。

### `configs.recommended` の中身

`configs.recommended`（flat config 形式）は plugin の登録とルール 5 本の severity を含む。
**severity の正本は plugin 側**なので、消費者がドキュメントから写して持つ必要はない。

| ルール | 既定 severity | 内容 |
|---|---|---|
| `melta/no-raw-color` | error | 生 hex/rgb/hsl → `theme.color.*` |
| `melta/no-raw-radius` | error | `borderRadius` の数値直書き → `theme.radius.*` |
| `melta/no-raw-spacing` | warn | `padding`/`margin`/`gap` の数値直書き（false positive あり） |
| `melta/no-raw-fontsize` | warn | `fontSize` の数値直書き |
| `melta/no-raw-lineheight` | warn | `lineHeight` の数値直書き（生値はフォントの必要行間を素通りし、Android で濁点が欠ける。詰める場合は theme の `minLineHeightRatio` 宣言とセットで — 機序は `src/theme/line-height.ts`） |

⚠️ **base config は省略できない。** `meltaPlugin.configs.recommended` は parser も `files` も
持たない（適用範囲を消費者側に委ねる設計）。実測される挙動は 2 つ:

- **recommended だけを書いた場合** — `.ts` / `.tsx` はそもそも lint 対象に入らず、
  `File ignored because no matching configuration was supplied` で**黙って素通りする**（eslint 9 / 10 で確認）
- **`files` だけ足して parser を足さない場合** — `Parsing error: Unexpected token` で落ちる

どちらも「強制層が入ったつもりで入っていない」状態なので、上の完全例のように
parser を持つ base config（`@react-native/eslint-config/flat` や typescript-eslint 等）の**上に追加**すること。

### カスタマイズ

severity を変える・適用範囲を絞る場合は spread して上書きする:

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
      "melta/no-raw-color": "error",      // 生 hex/rgb/hsl → theme.color.*
      "melta/no-raw-radius": "error",     // borderRadius 数値直書き → theme.radius.*
      "melta/no-raw-spacing": "warn",     // padding/margin/gap 数値直書き（false positive あり）
      "melta/no-raw-fontsize": "warn",    // fontSize 数値直書き
      "melta/no-raw-lineheight": "warn",  // lineHeight 数値直書き（Android の字形欠け防止）
    },
  },
];
```

- 依存ゼロの自己完結 ESM（eslint 本体以外に何も要らない）。ESLint 9+ の flat config を想定（このリポでは 10.x で検証）
- `meltaPlugin` は **named export のみ**（default export なし）
- eslintrc（`.eslintrc.*`）からは登録できない（ESM の named export のみのため）。flat config への移行が要る
- 検知は AST の構文形状ベースの補助線。変数経由・spread は漏れるので、値の純度の本丸は
  token 経由（`theme.*`）で書く習慣の側にある（[制約](#制約と正直な範囲)）

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

### 画面骨格（`Screen`）

`Screen` は safe-area + `bg-page` + content padding + ScrollView を 1 つにまとめた画面の器。

| prop | 型 | default | 意味 |
|---|---|---|---|
| `variant` | `"scroll"` \| `"fixed"` | `"scroll"` | content を ScrollView に載せるか、`flex: 1` の View に載せるか |
| `padding` | spacing token キー \| `"none"` | `"4"` | content の padding |
| `edges` | `readonly ("top" \| "right" \| "bottom" \| "left")[]` | [`enableSafeAreaContext`](#safearea-の差し替えmelta-appsafe-area) の既定 | safe-area を適用する辺 |
| `header` | `ReactNode` | — | scroll の外（safe-area 直下）に固定されるヘッダー slot |
| `scrollViewProps` | `Omit<ScrollViewProps, "children">` | — | 内部 ScrollView への passthrough（`variant="scroll"` のみ） |
| `scrollViewRef` | `Ref<ScrollView>` | — | 内部 ScrollView の ref（`scrollTo` / `scrollToEnd` 用） |
| `style` | `StyleProp<ViewStyle>` | — | safe-area の器に重ねる style |
| `testID` | `string` | — | — |

```tsx
const listRef = useRef<ScrollView>(null);

<Screen
  header={<Header title="フィード" />}
  scrollViewProps={{ onScroll: handleScroll, keyboardShouldPersistTaps: "handled" }}
  scrollViewRef={listRef}
>
  <Text>本文</Text>
</Screen>
```

契約（passthrough は「素通し」ではない）:

- **`contentInsetAdjustmentBehavior` は渡さないこと。** safe-area は Screen が持つので二重 inset になる
- `contentContainerStyle` は DS の padding と**配列合成**される（渡した側が後勝ち）。padding を**消す**目的では使えない（消したいときは `padding="none"`）
- `scrollEventThrottle` は Screen 側の既定が `16`（iOS の既定 0 では `onScroll` が 1 ドラッグ 1 発しか来ずスクロール連動ヘッダが動かない）。消費者の指定で上書きできる
- `variant="fixed"` に `scrollViewProps` / `scrollViewRef` を渡すと dev ビルドで警告する（内部 ScrollView が無いので黙って捨てられる）

タブバーと併用する画面は、bottom をタブバー側に任せる:

```tsx
// タブ配下の画面だけ edge を絞る（アプリ全体を top-only にしない。下記 SafeArea 節を参照）
<Screen edges={["top"]}>…</Screen>
```

## アクセシビリティの既定

3 点（タップ標的 / OS の文字サイズ拡大 / 読み上げラベル）は**利用側で何もしなくても既定で満たす**ように組んである。

### タップ標的 44pt

すべての操作要素は**視覚寸法を変えないまま**実効タップ標的 44pt を満たす。
契約側の正本は melta-contracts の `A11Y_MIN_TAP_TARGET_44`、実装との照合は
[scripts/lib/tap-target-conformance.test.ts](./scripts/lib/tap-target-conformance.test.ts)（CI で毎回検査）。

| 要素 | 視覚寸法 | 手当て | 実効 |
|---|---|---|---|
| `Button` small / medium / large（labeled） | minHeight 32 / 40 / 48 | 縦 hitSlop 6 / 2 / 0 | 44 / 44 / 48 |
| `Button`（iconOnly） | 32 / 40 / 48 の正方形 | 四方 hitSlop 6 / 2 / 0 | 同上（縦横とも） |
| `Tag variant="filter-chip"` | 高さ 34（padding 駆動） | 縦 hitSlop 5 | 44 |
| `Tag variant="removable"` の × / `Toast` の × / `Alert` の × / `Modal` の × | 24 の箱 | hitSlop 10 | 44 |
| `Radio` の option 行 | 行の高さ 36 | `minHeight: 44` | 44 |
| `Toggle` medium / large | track 24 / 28 | 縦 hitSlop 10 / 8 | 44 |
| `Checkbox` の行 | box 20（行は label 込み） | `minHeight: 44` | 44 |

- **背景を持つ要素は hitSlop、持たない行は `minHeight`**。背景がある要素を minHeight で伸ばすと見た目が変わるため。
  例外は × / action のような**小型の固定標的**で、見えない箱（minWidth/minHeight）+ hitSlop の複合
  （正典パターン 24+10、Toast のように横 hitSlop を絞る席では箱を 32 に広げて 44 を維持）
- **横方向の hitSlop は隣接する操作要素との gap の 1/2 まで**。超えると当たり判定が重なって押し違いが起きる
  （`Toast` の action と × はこれで実際に 8pt 重なっていた。0.7.0 で修正）
- ⚠️ **iconOnly の `Button` だけは横にも hitSlop が付く**（幅 32/40 では 44pt に届かないため）。
  iconOnly を横に並べるときは **gap を hitSlop の 2 倍以上**（small: 12 / medium: 4）取ること。
  gap 0 で密着させると当たり判定が重なる

### OS の文字サイズ拡大（fontScale）

- `Button` / `TextField` の高さは **`minHeight`**（`height` 固定ではない）。文字が拡大しても縦にクリップしない
- `Text` は `allowFontScaling` / `maxFontSizeMultiplier` を RN `Text` へ透過する。**既定は未指定 = RN 既定**（拡大に追随）。
  固定寸法の図版ラベルなど、拡大するとレイアウトが壊れる箇所だけ opt-in で絞る

  ```tsx
  <Text maxFontSizeMultiplier={1.3}>グラフの軸ラベル</Text>
  ```

- `Avatar` の initials は器（円）が伸びないため、size 別に上限を掛けている（small 1.6 / medium 1.5 / large 1.3）。
  拡大は許しつつ円からの溢れだけを止める設定で、利用側の指定は不要

### 読み上げラベルの差し替え（i18n）

内蔵の日本語ラベルは props で差し替えられる。**既定値は日本語のまま**（変えると既存アプリの VoiceOver 読み上げが変わるため）。

| コンポーネント | prop | 既定 |
|---|---|---|
| `Toast` / `Alert` / `Modal` | `closeAccessibilityLabel` | `"閉じる"` |
| `TextField` | `formatErrorAccessibilityLabel: (label, errorText) => string` | `` `${label}。エラー: ${errorText}` `` |
| `ActionSheet` | `cancelLabel` | `"キャンセル"` |
| `Skeleton` | `accessibilityLabel` | `"読み込み中"` |

```tsx
<Modal title="Delete route" closeAccessibilityLabel="Close" onClose={close} visible>…</Modal>

<TextField
  label="Email"
  value={email}
  variant="error"
  errorText="Invalid format"
  formatErrorAccessibilityLabel={(label, error) => `${label}. Error: ${error}`}
/>
```

## テーマを注入する（ブランドトークン）

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

省略した欄は補完されない（`defineTheme` は dev で欠けたキーを名指しして throw する）。
下は**全欄を埋めたコピペ可能な最小完全例** — そのまま `theme.ts` に置けば型が通る。

<details>
<summary><code>theme.ts</code>（全フィールドを埋めた完全例）</summary>

```tsx
import { defineTheme, type SemanticColors } from "melta-app";

const light: SemanticColors = {
  "bg-page": "#faf7f2", "bg-page-alt": "#f2ece2", "bg-surface": "#ffffff",
  "bg-surface-alt": "#faf7f2", "text-heading": "#1a1410", "text-default": "#3c332b",
  "text-muted": "#7a6f63", "border-default": "#e5ddd1", "border-strong": "#cfc3b2",
  "input-bg": "#ffffff", "input-border": "#cfc3b2", "text-accent": "#b4531f",
  "text-on-accent": "#ffffff",
};
const dark: SemanticColors = {
  "bg-page": "#14100c", "bg-page-alt": "#1f1913", "bg-surface": "#1f1913",
  "bg-surface-alt": "#14100c", "text-heading": "#f5efe6", "text-default": "#ded4c6",
  "text-muted": "#a29686", "border-default": "#33291f", "border-strong": "#4a3d2f",
  "input-bg": "#14100c", "input-border": "#4a3d2f", "text-accent": "#e0803f",
  "text-on-accent": "#14100c",
};

export const theme = defineTheme({
  id: "acme",
  color: {
    primary: {
      "50": "#fdf5ef", "100": "#f9e6d6", "200": "#f2c9a9", "300": "#e8a674",
      "400": "#dd8446", "500": "#c96a2b", "600": "#b4531f", "700": "#93401a",
      "800": "#73331a", "900": "#5a2a18", "950": "#31150b",
    },
    body: "#3c332b",
    semantic: { light, dark },
    status: {
      success: { base: "#2f7d4f", subtleLight: "#eaf6ee", textLight: "#256540",
        subtleDark: "rgba(47,125,79,0.16)", textDark: "#7fc79a" },
      warning: { base: "#a8720d", subtleLight: "#fdf3e0", textLight: "#8a5d0a",
        subtleDark: "rgba(168,114,13,0.16)", textDark: "#e0b054" },
      danger: { base: "#c0362c", subtleLight: "#fbeceb", textLight: "#9d2c24",
        subtleDark: "rgba(192,54,44,0.16)", textDark: "#f08b83" },
    },
  },
  typography: {
    fontFamily: {},  // 未指定 = OS デフォルト（RN の fontFamily は string 一本。embed は expo-font 側の責務）
    fontSize: {
      // lineHeight は fontSize × minLineHeightRatio（既定 1.45）以上にする。未満を書いても
      // 実行時に下限へクランプされ、宣言値と描画値がズレるだけ（機序は src/theme/line-height.ts）
      xxs: { fontSize: 10, lineHeight: 15 }, xs: { fontSize: 12, lineHeight: 18 },
      sm: { fontSize: 14, lineHeight: 21 }, base: { fontSize: 16, lineHeight: 26 },
      lg: { fontSize: 18, lineHeight: 27 }, xl: { fontSize: 20, lineHeight: 29 },
      "2xl": { fontSize: 24, lineHeight: 35 }, "3xl": { fontSize: 30, lineHeight: 44 },
    },
    fontWeight: { normal: "400", medium: "500", semibold: "600", bold: "700" },
    letterSpacingRatio: { heading: -0.02, body: 0 },  // em 比率（px ではない）
    // フォントを同梱するなら、そのフォントが要求する最小行間比を宣言する（例: LINE Seed JP = 1.61。
    // 下回る lineHeight は RN Android で字形が欠けるため実行時に下限へクランプされる）。
    // 未宣言は日本語安全側の 1.45（Android system の Noto Sans CJK JP 実測）:
    // minLineHeightRatio: 1.61,
  },
  spacing: { "1": 4, "2": 8, "3": 12, "4": 16, "5": 20, "6": 24, "8": 32, "10": 40, "12": 48, "14": 56, "16": 64 },
  radius: { sm: 4, md: 8, lg: 16, full: 9999 },
  elevation: {
    none: { shadowColor: "#000000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
    sm: { shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    md: { shadowColor: "#000000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 5 },
    overlay: { shadowColor: "#000000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 25, elevation: 10 },
  },
  motion: {
    duration: { fast: 150, normal: 200, slow: 300 },
    easing: { default: [0.4, 0, 0.2, 1], in: [0.4, 0, 1, 1], out: [0, 0, 0.2, 1] },
  },
  zIndex: { base: 0, dropdown: 20, sticky: 30, overlay: 40, modal: 50 },
});
```

（tsc 6.0 / `strict: true` で型が通ることを fixture で確認済み。この theme 定義ファイル自体は
ブランドの生値を持つので、[lint の完全例](#動く完全例)のように `ignores` に入れる）

</details>

### 単一の配色しか持たないブランド

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

## サブパス（Icon / SafeArea）

subpath は Icon（`melta-app/icons`）/ SafeArea 差替（`melta-app/safe-area`）/
[lint plugin](#利用側コードの-lint-強制層melta-appeslint-plugin)（`melta-app/eslint-plugin`）の 3 つ。

### Icon（`melta-app/icons`）

Icon は唯一 `react-native-svg`（optional peerDependency）に依存するため、本体エントリから分離している。
本体 `melta-app` は依存ゼロのまま — Icon を使うアプリだけが以下を行う:

```bash
npx expo install react-native-svg
```

> bare RN（Expo なし）は `npm install` + `npx pod-install` + ネイティブ再ビルド。
> [bare React Native](#bare-react-nativeexpo-を使わない場合) を参照。

```tsx
import { Icon } from "melta-app/icons";

<Icon name="like-on" accessibilityLabel="いいね" />        // 意味を持つ icon は label 必須
<Icon name="close" size="sm" color="text-muted" />         // 省略時は装飾扱い（a11y ツリーから除外）
<Icon name="check" color="status-success" />               // status 色（Alert / Toast と同じ status token）
```

`color` は semantic token キーに加えて `"status-success"` / `"status-warning"` / `"status-error"` を受ける
（`theme.color.status.*.base` を引く。生 hex は受けない）。
`"status-info"` は**無い** — status token に info の実体が無いため（web 側と同じ割り切り）。
info 相当は `color="text-accent"` で表す。

グリフは Charcoal Icons（pixiv、Apache-2.0）の curated サブセット + Charcoal に無いグリフの
Material Symbols Rounded（Google、Apache-2.0）補完（`assets/icons/*.svg` →
`npm run generate:icons` で `src/icons/glyphs.ts` に codegen、commit 済みを配布）。
帰属表示は [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md)。

### SafeArea の差し替え（`melta-app/safe-area`）

safe-area は default で RN core の SafeAreaView（deprecated / iOS のみの最小対応、依存ゼロ維持。
**Android では完全な no-op**）。`react-native-safe-area-context` を使うアプリは subpath から
一度有効化すると `Screen` / `ActionSheet` / `BottomSheet` が context 版に切り替わり、
Android でも inset が入り、RN 0.85+ の deprecation 警告も出なくなる:

```bash
npx expo install react-native-safe-area-context
```

> bare RN（Expo なし）は `npm install` + `npx pod-install` + ネイティブ再ビルド。
> [bare React Native](#bare-react-nativeexpo-を使わない場合) を参照。

```tsx
// アプリの entry（初回 render より前）で一度だけ
import { enableSafeAreaContext } from "melta-app/safe-area";
enableSafeAreaContext();

// edges は「Screen の既定値」。省略した Screen にだけ効く
enableSafeAreaContext({ edges: ["top", "left", "right"] });
```

適用する辺の決まり方は 3 段（後のものが勝つ）:

| 対象 | 適用される edge |
|---|---|
| `Screen`（`edges` 省略） | `enableSafeAreaContext({ edges })` の既定（未指定なら全 edge） |
| `Screen edges={[...]}` | その指定（画面ごとに変えられる） |
| `ActionSheet` / `BottomSheet` | 常に bottom + 左右（画面下端に出るため top は不要） |

> ボトムタブバーがある画面は、アプリ全体を `edges: ["top"]` にするのではなく
> **タブ配下の画面だけ [`<Screen edges={["top"]}>`](#画面骨格screen)** で絞る。シート系は
> bottom inset を自前で持つので、グローバル top-only はシートの下余白まで削ってしまう
> （0.5.x までのアプリ全体 1 個のグローバル指定はこの理由で推奨から外した）。

⚠️ 前提と契約:

- 祖先に `SafeAreaProvider` が**必須**（無いと `useSafeAreaInsets` が **throw する**。
  React Navigation / Expo Router を使っていれば設置済みのことが多い）。初回 render から
  正しい inset を使うには Provider に `initialMetrics` を渡す
- **adapter 未登録（RN core フォールバック）では `edges` は無視される。** core の SafeAreaView は
  「安全域と交差する辺すべて」に padding を入れる仕様で辺を選べないため（Android は no-op）
- adapter は `useSafeAreaInsets()` を render 中に同期参照して View padding に加算する方式
  （native SafeAreaView の初回フレーム inset 未適用によるフラッシュを避けるため）
- safe-area と合成する padding は**数値のみ**サポート（`"5%"` 等の非数値は基底として扱えず、
  対象 edge は inset 値に置き換わる）。RTL / `paddingStart`・`paddingEnd` は対応済み

## 設計の核

- **契約は共有、実装は各最適**: tokens / 禁止ルール / component 契約は `melta-contracts`（JSON）が SSOT。melta-app に**手書きの token 正本**は持たない（`native-theme.ts` は契約からの生成物。二重管理を物理防止）。
- **公開 DS の純度を守る**: 汎用 UI プリミティブだけを置く。アプリ固有の UI（特定サービスの画面・機能・語彙）は**各アプリ側**に置き、ここには混ぜない。
- **依存最小**: 初期は RN `StyleSheet` 固定（nativewind / unistyles 等の runtime styling lib を入れない）。Storybook RN も使わず自前カタログ。
- **人間と AI の両方が読める**: variants / sizes / states / tokens / a11y はすべて契約の JSON。実装状態も `appStatus`（implemented / planned / not-planned）と `appMapping`（adapted = モバイル慣習への変換）が機械可読で、この README の表も showcase の表もそこから生成される。
- **ズレは CI が拾う**: ライブラリ内部の契約準拠は conformance テストが機械判定し、ドキュメントの腐りは drift 検査が落とす。利用側コードは consumer lint（`melta-app/eslint-plugin`）が**直接リテラル 4 類型を補助検査**する（変数・spread 経由は漏れる。純度の本丸は token 経由で書く習慣の側）。
- web 版には MCP サーバー（`melta-ds-mcp`）もあり、Claude Code / Cursor から契約・トークン・ルールを直接引ける（RN 対応は今後）。

内部構造（ディレクトリ / トークン正規化表 / 実装ステータスの詳細 / CI）は [docs/architecture.md](./docs/architecture.md)。

## 制約と正直な範囲

- **検証済み構成は Expo 56 / RN 0.85 / React 19.2**。他の組み合わせは動く可能性が高いが検証していない
- **consumer lint は補助線**。検知するのは**直接リテラルの 4 類型**（color / radius / spacing / fontSize）だけで、変数経由・spread 経由は漏れる。純度の本丸は token 経由で書く習慣の側にある
- **conformance（ライブラリ内部の契約準拠）と consumer lint（利用側コードの検査）は別物**。前者は CI で機械判定、後者は消費者の flat config に組み込んで初めて効く
- **lint plugin は flat config 専用**（eslintrc からは登録できない）。base config（parser）も必須
- **0.x 系につき破壊的変更は minor で入る**。移行手順は [CHANGELOG](./CHANGELOG.md) に毎回書く
- **planned / not-planned のコンポーネントは実装されていない**（[表](#コンポーネント)参照）。not-planned はモバイルで別の形に変換すべきものなので、今後も web と 1:1 にはならない

## 成熟度・メンテナンス

- **0.x**。API は安定に向かっているが、破壊的変更は minor で入る（[CHANGELOG](./CHANGELOG.md) が変更の正本。npm に公開した版だけを記録する）
- **バグ・要望は [GitHub Issues](https://github.com/tsubotax/melta-app/issues)**、コントリビュートの手引きは [CONTRIBUTING.md](./CONTRIBUTING.md)、脆弱性は [SECURITY.md](./SECURITY.md) の非公開経路へ
- **個人メンテナンスのプロジェクト**（tsubotax）。SLA・サポート窓口は無い。issue / PR は歓迎するが応答は best effort
- **現在の adopter は 1 つ**（非公開プロジェクトのモバイルアプリ）。dogfood はそこで回している。D2I は当初想定していた最初の adopter だが、mobile 側はまだ melta-app を導入していない（D2I の web 側が使っているのは melta-ui）
- React Native Directory 登録は [PR #2606](https://github.com/react-native-community/directory/pull/2606) がレビュー待ち

### 安定性の読み方

- **何も書いていない公開 API は安定**として扱ってよい。変更は semver に従う（0.x なので破壊的変更は minor bump で入り、移行手順を CHANGELOG に書く）
- **`@experimental` 注記が付いたものは予告なく変わる**（挙動・シグネチャ・メッセージとも）。現在は theme の解決規則ヘルパ（`validateTheme` / `resolveMode` / `supportedModes` / `deriveColorScheme` / `declaredModes`）が該当し、JSDoc と型定義に注記が出る
- **公開面の増減は機械強制**。export の増減は snapshot テスト（[scripts/lib/export-surface.test.ts](./scripts/lib/export-surface.test.ts)）が、契約の破壊的変更は melta-ui 側の `npm run design:compat` が semver bump を要求する。「気づいたら消えていた」は CI で止まる

## セキュリティ・データ境界

lint も theme 生成もすべて**ローカル処理**で完結する。コード・トークン・生成物を外部へ送信しない。
telemetry / 使用状況の収集は無い。runtime 依存ゼロ（peerDependencies のみ）なので、
アプリのバンドルに melta 由来のネットワーク処理は入らない。

## Learn more

- [docs/architecture.md](./docs/architecture.md) — ディレクトリ構成 / トークン正規化（web → RN）/ 実装ステータス詳細 / CI（このリポを触る人向け）
- [docs/patterns.md](./docs/patterns.md) — フォームの組み方規範 + コピペ可能スニペット（実コードと機械同期）
- [llms.txt](https://app.melta.tsubotax.com/llms.txt) — AI エージェント向けの入口（契約から生成）
- [CHANGELOG.md](./CHANGELOG.md) — 変更の正本（破壊的変更の移行手順つき）
- [melta-ui](https://github.com/tsubotax/melta-ui) — web 版（契約の SSOT・MCP サーバー・禁止ルールの本体）
- [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md) — Icon グリフの帰属表示

## License

MIT（[LICENSE](./LICENSE)）。同梱するアイコングリフの帰属表示は [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md)。


### 操作バーとしてのHeader

`<Header variant="actions" title="作業ログを残す" leading={closeButton} trailing={actions} />` は、
タイトルを画面では隠し、読み上げ可能な見出しとして残します。`title`には空でない画面名を渡します。
左右の操作は既存のslotで渡し、操作間のgapと各ボタンの有効領域はslot内で確保してください。
Headerの上下余白と下線は標準recipeが持つため、アプリ側で複製しません。
中央spacer前後のgapはactionsではspacing.1、defaultでは従来のspacing.3です。
variant省略時は従来どおり可視タイトルを表示します。

カタログをWeb exportしてローカル配信した後、`npm run check:header-layout -- --base <URL>` で
320/393px幅・大きな子要素の余白と44pt標的を測定できます。Playwrightは検証環境に用意し、
別のインストールを使う場合は `--playwright-module <playwrightのディレクトリ>` を渡します。
この実描画検査は手動レーンで、OSの文字拡大・読み上げ確認は別途必要です。
