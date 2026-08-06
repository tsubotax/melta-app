## 概要

<!-- 何を、なぜ変えたか。関連 issue があれば "Closes #123" -->

## 変更の種類

- [ ] バグ修正
- [ ] 機能追加（コンポーネント / props）
- [ ] eslint plugin のルール変更
- [ ] ドキュメント
- [ ] ハーネス（CI / scripts / conformance）の変更

## 検証（ローカル CI ミラー）

<!-- CONTRIBUTING.md「ローカル CI ミラー」参照。通していないものはチェックを外したままで構いません -->

- [ ] `npm run generate` → `git diff --exit-code src/theme/native-theme.ts src/contracts/contract-types.ts`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm test`（consumer + conformance）
- [ ] `npm run check:drift`
- [ ] `npm run test:rn`（RN mount smoke）
- [ ] `npm run check:installability`

実機確認（UI に触れた場合）:

- [ ] iOS
- [ ] Android

## 確認事項

- [ ] 生成物を手編集していない（生成コマンドを回した差分を含めた）
- [ ] 公開 export を増減させた場合、`scripts/lib/export-surface.test.ts` の snapshot を更新し、理由を上に書いた
- [ ] コンポーネントを追加した場合、`example/catalog` にも掲載した
- [ ] 破壊的変更がある場合、`CHANGELOG.md` に移行手順を書いた
