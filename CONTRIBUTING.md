# Contributing to melta-app

個人メンテナンスの OSS です。issue / PR は歓迎しますが、応答は best effort です。
このドキュメントは「**手元で CI と同じ検査を再現する**」ための手順書です。

> リポジトリ内部の構造（ディレクトリ / トークン正規化 / 実装ステータス）は
> [docs/architecture.md](./docs/architecture.md)。使う側の情報は [README.md](./README.md)。
> デザイン契約の SSOT は別リポジトリの [melta-ui](https://github.com/tsubotax/melta-ui) です。

---

## 開発環境セットアップ

- **Node.js**: `package.json` の `engines` 宣言に従います（現在 `>=22`。CI は 22 で検証）
- 依存の取得は **`npm ci`**（lockfile 固定。CI と同じ状態を再現するため）
- npm workspaces 構成です（root = ライブラリ、`example/` = Expo カタログアプリ）

```bash
git clone https://github.com/tsubotax/melta-app.git
cd melta-app
npm ci
```

`npm ci` の `prepare` で `bob build`（`lib/` の生成）が走ります。
`ignore-scripts=true` な環境では走らないので、その場合は `npm run build` を手で実行してください。

実機 / シミュレータでカタログを確認する場合:

```bash
npm run ios     # または android / web
```

---

## ローカル CI ミラー

[`.github/workflows/check.yml`](./.github/workflows/check.yml) が回す検査を、そのままの順序で
ローカルに写したものです。**PR を出す前にこれを通してください。**

```bash
npm ci

# 1. 契約からの再生成（CI には melta-ui が無いので、これが通る = npm 経路だけで生成できる証明）
npm run generate
git diff --exit-code src/theme/native-theme.ts src/contracts/contract-types.ts

# 2. 型（lib + example + scripts の 3 プロジェクト）
npm run typecheck

# 3. design lint（raw color / radius は error、spacing / fontSize は warn。CI は --max-warnings 0）
npm run lint

# 4. consumer + conformance テスト（node:test。契約 / token / recipe との照合）
npm test

# 5. drift 検査（README のコンポーネント表 / catalog 網羅 / llms.txt / 内部リンク）
npm run check:drift

# 6. RN mount smoke（jest + Testing Library。light/dark × 全公開コンポーネント）
npm run test:rn

# 7. installability ゲート（pack → fixture へ install → import → typecheck）
npm run check:installability
```

### まとめて回す

```bash
npm run generate && git diff --exit-code src/theme/native-theme.ts src/contracts/contract-types.ts \
  && npm run typecheck && npm run lint && npm test && npm run check:drift \
  && npm run test:rn && npm run check:installability
```

### 補足

- **`npm run generate` は `melta-contracts`（npm）を読みます**。隣に `melta-ui` を clone している
  場合だけ、未 install 時の fallback として兄弟ディレクトリを読む開発モードに落ちます。
  CI にはそのディレクトリが無いので、**fallback に依存した変更は CI で必ず落ちます**
- drift が出たら **`npm run check:drift -- --write`**（= `tsx scripts/check-drift.ts --write`）で
  README の生成ブロックと `llms.txt` を heal できます
- `check:installability` は `npm pack` を伴うため数十秒かかります。ネットワークも使います
- リリース時は `npm run release` が上記＋`build` / `check:build-fresh` / `npm publish` を
  一本のチェーンで回します（publish は human gate）

---

## SSOT と生成物 — 直接編集しないファイル

melta-app に**手書きのトークン正本はありません**。tokens / 禁止ルール / component 契約は
すべて `melta-contracts`（別リポジトリ [melta-ui](https://github.com/tsubotax/melta-ui) の
`design/contracts/`）が SSOT で、このリポジトリはそれを購読して RN 実装を提供します。

| 生成物 | 生成コマンド | 生成元 |
|---|---|---|
| `src/theme/native-theme.ts` | `npm run generate:theme` | `melta-contracts/tokens`（RN 正規化を通す） |
| `src/contracts/contract-types.ts` | `npm run generate:contracts` | `melta-contracts/components/*` |
| `src/icons/glyphs.ts` | `npm run generate:icons` | `assets/icons/*.svg` |
| `README.md` のコンポーネント表（`BEGIN GENERATED: component-status` ブロック） | `tsx scripts/check-drift.ts --write` | 契約の `appStatus` / `appMapping` |
| `llms.txt` | `npm run build:llms` | 契約 |
| `lib/` | `npm run build`（bob） | `src/` |

`npm run generate` は theme / contracts / icons の 3 つをまとめて回します。
生成物を手で直すと次の再生成で消え、CI の freshness 検査（`git diff --exit-code`）が落ちます。

**トークンの値そのものを変えたい場合は、このリポジトリではなく melta-ui 側の
`design/contracts/` に PR を出してください。** ここで直しても SSOT には反映されません。

### 契約 / ドキュメントと実装のズレを機械で守っている場所

- **conformance テスト**（`scripts/lib/*-conformance.test.ts`）— 契約の variants / sizes / states /
  tokenRef と実装の `__contract` 宣言を照合する
- **`scripts/lib/public-exports.test.ts`** — 「`appStatus=implemented` の契約集合 == 公開コンポーネント集合」
- **`scripts/lib/export-surface.test.ts`** — package.json の exports 各 subpath が公開する
  **export 名の全量**をスナップショット固定する。公開面を増減させたらここが落ちるので、
  意図した変更なら `EXPECTED_SURFACE` を更新する（＝ 公開 API 変更を人がレビューした記録になる）
- **`npm run check:drift`** — README のコンポーネント表 / catalog 網羅 / 内部リンクとアンカーの実在 /
  docs スニペットの実コード同期 / llms.txt の鮮度

---

## PR を出す前のチェックリスト

- [ ] `npm ci` した状態で上記のローカル CI ミラーが全部緑
- [ ] 生成物を手編集していない（生成コマンドを回して差分を commit した）
- [ ] 公開 export を増減させたなら `export-surface.test.ts` の snapshot を更新し、その理由を PR 本文に書いた
- [ ] コンポーネントを追加したなら `example/catalog` にも掲載した（`check:drift` が網羅を見ます）
- [ ] トークンの値を変えたいのではないか確認した（値の変更は melta-ui 側の契約が SSOT）
- [ ] 破壊的変更があるなら `CHANGELOG.md` に移行手順を書いた（0.x なので minor bump で入りうる）

## PR について

- ベースブランチは `main` です
- **fork からの PR でも CI は全ジョブ走ります**。ワークフローは secrets を一切使わず、
  ネットワークも npm registry の公開エンドポイントしか触らないためです
- 新しいコンポーネントの提案は、まず melta-ui 側に契約があるか（`appStatus`）を確認してください。
  契約が無いものは melta-ui 側の議論が先です
- 動作確認は Expo 56 / RN 0.85 / React 19.2 の組で行っています。それ以外の組み合わせで
  問題が出た場合は、環境を issue に書いてください
- セキュリティ上の問題は issue ではなく [SECURITY.md](./SECURITY.md) の経路で報告してください

## ライセンス

コントリビューションは [MIT License](./LICENSE) の下で受け入れられます。
