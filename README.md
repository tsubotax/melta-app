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
  App.tsx                       カタログアプリのエントリ
  catalog/                      実機確認用カタログ画面（ハーネス）
  src/
    theme/
      types.ts                  NativeTheme の型
      native-theme.ts           ⚠️ 自動生成（melta-contracts → RN 正規化済み）
      index.ts                  theme エントリ
    primitives/                 Text / Button / Tag（未実装）
    components/                 Card / Image / Surface / Skeleton / EmptyState（未実装）
    lint/                       design lint 骨格（rules.json 適用、Phase 後半）
  scripts/
    generate-native-theme.ts    melta-contracts/tokens.json → src/theme/native-theme.ts
    lib/
      normalize-tokens.ts       web 形式 → RN 形式の純粋変換
      normalize-tokens.test.ts  変換のユニットテスト
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

## ステータス

- ✅ scaffold + token adapter（generate-native-theme）+ ユニットテスト + theme カタログ骨格
- ✅ `melta-contracts@0.2.0` を npm 依存として購読（recipes/app の styleRefs 同梱）
- ✅ primitives（Text / Button / Tag / Metric）+ components（Card / Surface / Image / Skeleton / EmptyState）+ カタログ + dogfood 実画面
- ✅ conformance: 契約源 ↔ 生成メタ ↔ `__contract` 宣言の照合 + consumer テスト（契約 subset / token 実在 / contractVersion 同期）+ styleRefs conformance（button で機構実証、他コンポーネントへ展開中）
- ⬜ design lint → ツー活カード（D2I dogfood 深化）→ styleRefs conformance の全コンポーネント展開

詳細は D2I リポの `.team/specs/requirements-melta-app.md`。

## License

MIT
