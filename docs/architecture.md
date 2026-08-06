# melta-app アーキテクチャ / 開発台帳

> このリポジトリを**触る人**向けの台帳。**使う人**向けの情報（Install / lint 強制層 / コンポーネント表 /
> テーマ注入 / 制約）は [README](../README.md) にある。ここは README から分離した詳細で、
> 内容は削っていない（README 側には要約とリンクだけを置く）。

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
    check-drift.ts              README / docs / catalog / allowlist の drift 検査（--write で heal）
    check-installability.sh     pack → attw → install → import → typecheck の公開ゲート
    lib/                        token 正規化 + conformance / consumer テスト
```

## style resolver

見た目の値の解決は component（`.tsx`）ではなく隣の `<component>.styles.ts`（react-native を値 import しない
pure module）に置く。node の `tsx --test` から直接実行できることが conformance テストの前提になっている。
書き方の規約（`<COMPONENT>_SPEC` / slot 単位の戻り値 / 命名 / 共有 module）は [AGENTS.md](../AGENTS.md) が正。
resolver は3世代が混在しているので、**現行世代を規範とする**（初代の `button.styles.ts` を写さない）。

## トークン正規化（web → RN）

`scripts/lib/normalize-tokens.ts` が変換する。壊れやすい箇所はテスト必須。

| トークン | web | RN |
|---|---|---|
| color | hex / rgba | そのまま（semantic は light/dark mode 切替） |
| spacing / radius / fontSize | rem + px | px の数値を採用（RN は unitless） |
| shadow | CSS box-shadow | iOS shadow* + Android elevation に分解（1 ViewStyle に同居） |
| fontFamily | 配列 | 単一文字列（先頭採用、未ロード時 OS デフォルト fallback） |
| lineHeight | 比率（"2.0"） | `fontSize × ratio` を px 算出（四捨五入）し、安全下限 `ceil(fontSize × minLineHeightRatio)`（既定 1.45）でクランプ（RN Android の字形欠け対策。根拠は `src/theme/line-height.ts`） |
| letterSpacing | em | **em ratio の数値で保持**（fontSize 相対のため token 単体で px 化不可。適用側が `fontSize × ratio` で解決） |
| motion duration | "150ms" | 150（数値） |
| motion easing | cubic-bezier | `[a,b,c,d]` tuple（`Easing.bezier(...)` に展開） |

## 開発

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

## 実装ステータス（詳細）

- ✅ ライブラリ化（root=ライブラリ / example=カタログアプリ、peerDeps react + react-native、runtime deps ゼロ）
- ✅ `melta-contracts` を npm 依存として購読（recipes/app の styleRefs 同梱）
- ✅ conformance: 契約源 ↔ 生成メタ ↔ `__contract` 宣言の照合 + consumer テスト（契約 subset / token 実在 / contractVersion 同期）+ styleRefs conformance（全実装コンポーネント展開済み）+ RN mount smoke（light/dark × 全公開コンポーネント）
- ✅ ハーネス: design lint（CI `--max-warnings 0` + PostToolUse hook）/ drift 検査（README・docs・catalog・allowlist 突合）/ installability ゲート（pack → tarball 実体検査 → attw で exports の型解決を resolution mode ごとに検査 → fixture へ install → 本体 / icons / safe-area / eslint-plugin の import + typecheck を moduleResolution 3 種（bundler / node16 / nodenext）で実行 → eslint plugin を実 import してルール 5 本の実在を照合 → exports の解決先確認。`npm run release` チェーンの必須ステップ）
- ✅ layout 6 個（Stack / Row / Screen / Header / Icon / Avatar）— dogfood 不足 1〜4 を解消、ProjectFeedScreen は公開 primitive だけで構成
  - Screen の SafeArea は adapter registry 化済み: default は RN core SafeAreaView（依存ゼロ維持）、`melta-app/safe-area` の `enableSafeAreaContext()` で react-native-safe-area-context に差し替え可（optional peer）
- ✅ form / feedback 10 個（TextField / Toggle / Checkbox / Radio / Alert / Toast / Progress / Modal / ActionSheet / BottomSheet）— checkbox / radio は Pressable + 描画（svg 非依存）、ActionSheet / BottomSheet は select / dropdown の adapted 変換先の受け皿
- ✅ showcase（https://app.melta.tsubotax.com — melta-ui 様式シェル + 実 RN カタログの Live 埋め込み。表・統計は契約からビルド時生成）
- ✅ AI 入口: [llms.txt](https://app.melta.tsubotax.com/llms.txt)（契約から生成・drift 検査対象）+ [patterns.md](./patterns.md)（フォームの組み方規範。スニペットは実コードと機械同期）
- ✅ lint 強制層の npm 配布（0.5.2）: `melta-app/eslint-plugin` を公開 subpath 化。消費者プロジェクトの flat config に組めば、生値の直書きが消費者側でも lint で止まる。推奨 severity は `configs.recommended` で配布（0.5.3。消費者が手書きで写さない）
- ✅ 消費者プロジェクトでの実導入検証（2026-08-04）: 別リポジトリの自プロジェクト（非公開 RN アプリ）に npm 経由で導入し、AI が違反コードを書いた直後に検出 → 修正フィードバック → 自己修正、のループを実測で確認。導入時に見つかった hook の欠陥（実行失敗時に無言で素通りする）は同日中に本体へ還元し、故障系を含む E2E 15 ケースで固定（0.5.3 で 14、0.8.0 の no-raw-lineheight 追加で 15）
- ✅ [npm publish（0.5.3）](https://www.npmjs.com/package/melta-app)
- ⬜ React Native Directory 登録（[PR #2606](https://github.com/react-native-community/directory/pull/2606) レビュー待ち）

## CI（.github/workflows/check.yml）

push / PR で以下を順に回す。CI には兄弟ディレクトリ（melta-ui）が存在しないため、`npm run generate`
が通ること自体が「npm 経路（melta-contracts）だけで生成できる」証明になっている。

1. `npm run generate` → 生成物の差分ゼロ（再生成漏れの検知）
2. `npm run typecheck`（lib + example + scripts）
3. `npm run lint`（`--max-warnings 0`）
4. `npm test`（consumer + conformance）
5. `npm run check:drift`（README / docs / catalog / allowlist）
6. `npm run test:rn`（RN mount smoke）
7. `npm run check:installability`（pack → attw → install → import → typecheck ×3 解決）
