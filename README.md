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
| 契約 | Component | APP |
|---|---|---|
| button | `Button` | ✅ implemented |
| card | `Card` | ✅ implemented |
| empty-state | `EmptyState` | ✅ implemented |
| image | `Image` | ✅ implemented |
| metric | `Metric` | ✅ implemented |
| skeleton | `Skeleton` | ✅ implemented |
| surface | `Surface` | ✅ implemented |
| tag | `Tag` | ✅ implemented |
| text | `Text` | ✅ implemented |

> planned / adapted / not-planned を含む全量の差分表は melta-contracts の `appStatus` 公開（0.2.1+）後にこの表へ自動拡張される。
<!-- END GENERATED: component-status -->

## ステータス

- ✅ ライブラリ化（root=ライブラリ / example=カタログアプリ、peerDeps react + react-native、runtime deps ゼロ）
- ✅ `melta-contracts` を npm 依存として購読（recipes/app の styleRefs 同梱）
- ✅ conformance: 契約源 ↔ 生成メタ ↔ `__contract` 宣言の照合 + consumer テスト（契約 subset / token 実在 / contractVersion 同期）+ styleRefs conformance（button で機構実証、他コンポーネントへ展開中）
- ✅ ハーネス: design lint（CI `--max-warnings 0` + PostToolUse hook）/ drift 検査（README・catalog・allowlist 突合）/ installability ゲート（pack → install → import → typecheck）
- ⬜ styleRefs conformance の全コンポーネント展開 → RN mount smoke → form / feedback 系コンポーネント → showcase（Expo web export）

詳細は D2I リポの `.team/specs/requirements-melta-app.md`。

## License

MIT
