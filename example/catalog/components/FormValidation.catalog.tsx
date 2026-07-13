/**
 * FormValidation.catalog — フォーム検証パターン（compose 見本）。
 * 単品コンポーネントのカタログではなく、TextField / Checkbox / Radio / Toggle を
 * 組み合わせた「検証フローの組み方」を Live Catalog に掲載する。
 * 本体は example/screens/FormValidationScreen.tsx（キーボード回避は Form タブで確認）。
 */

import { Stack, Text } from "melta-app";
import { FormValidationForm } from "../../screens/FormValidationScreen";

export function FormValidationCatalog() {
  return (
    <Stack gap="3">
      <Text variant="sm" color="text-muted">
        blur で初回検証 → エラー中は change で即解除 → submit で全量検証。キーボード回避を含む
        画面全体は Form タブで確認する。規範とスニペットは docs/patterns.md。
      </Text>
      <FormValidationForm />
    </Stack>
  );
}
