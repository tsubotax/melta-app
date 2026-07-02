# melta for APP（melta-app）

**React Native（Expo）版の melta デザインシステム。** web 版 [melta-ui](https://github.com/tsubotax/melta-ui) と同じデザイン契約（`melta-contracts`）を single source of truth に、RN 実装でその契約を満たす。

> 1 つのデザイン言語が、web では Tailwind に、app では React Native に降りる。

D2I（北海道ツーリング DB）アプリが最初の adopter / dogfood。最初の実需は「ツーリング記録を Garmin 風サマリーカードに焼いて外部シェア」機能。

## 設計の核

- **契約は共有、実装は各最適**: tokens / 禁止ルール / component 契約は `melta-contracts`（JSON）が SSOT。melta-app に token は持たない（二重化を物理防止）。
- **公開 DS の純度を守る**: 汎用 UI プリミティブだけを置く。D2I 固有 UI（スポットカード / GPS 軌跡 / ツー活サマリーカード）は **D2I 側**に置き、ここには混ぜない。
- **依存最小**: 初期は RN `StyleSheet` 固定（nativewind / unistyles 等の runtime styling lib を入れない）。Storybook RN も使わず自前カタログ。

## ディレクトリ

```
melta-app/
  src/                          ライブラリ本体（npm 配布物）
    theme/
      types.ts                  NativeTheme の型
      native-theme.ts           ⚠️ 自動生成（melta-contracts → RN 正規化済み）
      index.ts                  theme エントリ（ThemeProvider / useTheme / nativeTheme）
    primitives/                 Text / Button / Tag / Metric
    components/                 Card / Image / Surface / Skeleton / EmptyState
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

## セットアップ

```bash
npm install   # melta-contracts（npm 公開済み）も dependencies として入る

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
| avatar | `Avatar` | ✅ implemented | — |  |
| button | `Button` | ✅ implemented | — |  |
| card | `Card` | ✅ implemented | — |  |
| empty-state | `EmptyState` | ✅ implemented | — |  |
| header | `Header` | ✅ implemented | — |  |
| icon | `Icon` | ✅ implemented | — |  |
| image | `Image` | ✅ implemented | — |  |
| metric | `Metric` | ✅ implemented | — |  |
| row | `Row` | ✅ implemented | — |  |
| screen | `Screen` | ✅ implemented | — |  |
| skeleton | `Skeleton` | ✅ implemented | — |  |
| stack | `Stack` | ✅ implemented | — |  |
| surface | `Surface` | ✅ implemented | — |  |
| tag | `Tag` | ✅ implemented | — |  |
| text | `Text` | ✅ implemented | — |  |
| accordion | — | ⬜ planned | — |  |
| alert | — | ⬜ planned | — |  |
| badge | — | ⬜ planned | — |  |
| checkbox | — | ⬜ planned | — |  |
| datepicker | — | ⬜ planned | adapted | カレンダー自作はしない。OS 標準の日付ピッカー（@react-native-community/datetimepicker 等）への委譲でトークンのみ供給 |
| divider | — | ⬜ planned | — |  |
| dropdown | — | ⬜ planned | adapted | hover 起動は存在しない。タップ起動の Menu（アンカー付き）or ActionSheet に変換 |
| list | — | ⬜ planned | — |  |
| modal | — | ⬜ planned | — |  |
| progress | — | ⬜ planned | — |  |
| radio | — | ⬜ planned | — |  |
| select | — | ⬜ planned | adapted | web のドロップリストは持ち込まない。ActionSheet / BottomSheet / OS Picker で開く選択 UI に変換（gluestack/Tamagui も native では Sheet 化） |
| stepper | — | ⬜ planned | — |  |
| tabs | — | ⬜ planned | adapted | トップタブ / SegmentedControl 型として実装（web の下線タブ意味論を M3 segmented / iOS UISegmentedControl に写像） |
| textfield | — | ⬜ planned | — |  |
| toast | — | ⬜ planned | — |  |
| toggle | — | ⬜ planned | — |  |
| breadcrumb | — | 🚫 not-planned | — | RN 主要ライブラリ提供 0/5。Apple HIG が multisegment breadcrumb を明示的に否定。back ボタン + nav bar タイトルで代替 |
| copy-button | — | 🚫 not-planned | — | DS プリミティブでなくアプリ層のコンポジット（button + clipboard + toast） |
| pagination | — | 🚫 not-planned | — | モバイルは無限スクロール（FlatList onEndReached）で代替。カルーセル文脈は PageControl の領分 |
| sidebar | — | 🚫 not-planned | — | Navigation Drawer の領分＝react-navigation 側の責務。DS はトークン供給のみ |
| table | — | 🚫 not-planned | — | モバイルは単列リスト / Card への再構成が定石（M3 に data table なし）。list + metric で分解表現する |
| tooltip | — | 🚫 not-planned | — | hover 前提のため。iPhone HIG に tooltip 概念なし。必要になれば長押し Hint として別契約を切る |
<!-- END GENERATED: component-status -->

### Icon だけ subpath エントリ（`melta-app/icons`）

Icon は唯一 `react-native-svg`（optional peerDependency）に依存するため、本体エントリから分離している。
本体 `melta-app` は依存ゼロのまま — Icon を使うアプリだけが以下を行う:

```bash
npx expo install react-native-svg
```

```tsx
import { Icon } from "melta-app/icons";

<Icon name="like-on" accessibilityLabel="いいね" />        // 意味を持つ icon は label 必須
<Icon name="close" size="sm" color="text-muted" />         // 省略時は装飾扱い（a11y ツリーから除外）
```

グリフは Charcoal Icons（pixiv、Apache-2.0）の curated サブセット（`assets/icons/*.svg` →
`npm run generate:icons` で `src/icons/glyphs.ts` に codegen、commit 済みを配布）。
帰属表示は `THIRD_PARTY_LICENSES.md`。

## ステータス

- ✅ ライブラリ化（root=ライブラリ / example=カタログアプリ、peerDeps react + react-native、runtime deps ゼロ）
- ✅ `melta-contracts` を npm 依存として購読（recipes/app の styleRefs 同梱）
- ✅ conformance: 契約源 ↔ 生成メタ ↔ `__contract` 宣言の照合 + consumer テスト（契約 subset / token 実在 / contractVersion 同期）+ styleRefs conformance（全実装コンポーネント展開済み）+ RN mount smoke（light/dark × 全公開コンポーネント）
- ✅ ハーネス: design lint（CI `--max-warnings 0` + PostToolUse hook）/ drift 検査（README・catalog・allowlist 突合）/ installability ゲート（pack → install → import → typecheck）
- ✅ layout 6 個（Stack / Row / Screen / Header / Icon / Avatar）— dogfood 不足 1〜4 を解消、TouringFeedScreen は公開 primitive だけで構成
  - 既知の割り切り: Screen の SafeArea は RN core の SafeAreaView（deprecated / iOS のみの最小対応）。依存ゼロ方針を優先した判断で、精度が必要になれば react-native-safe-area-context への adapter 化を検討
- ⬜ form / feedback 系コンポーネント（textfield / toggle / checkbox / radio / alert / toast / progress / modal / ActionSheet / BottomSheet…）→ showcase（Expo web export）

詳細は D2I リポの `.team/specs/requirements-melta-app.md`。

## License

MIT
