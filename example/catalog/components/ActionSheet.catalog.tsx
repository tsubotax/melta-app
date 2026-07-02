/**
 * ActionSheet.catalog — ActionSheet を実レンダ（§6）。
 * オーバーレイ系のため「開く」ボタン + useState visible で実際に開閉できる形にする。
 * title あり/なし（先頭 action の区切り線の有無）と destructive アクションを確認する。
 */

import { useState } from "react";
import { View } from "react-native";
import { ActionSheet, Button, useTheme } from "melta-app";

export function ActionSheetCatalog() {
  const { theme } = useTheme();
  const [withTitle, setWithTitle] = useState(false);
  const [withoutTitle, setWithoutTitle] = useState(false);

  const actions = [
    { label: "編集する", onPress: () => {} },
    { label: "共有する", onPress: () => {} },
    { label: "投稿を削除する", destructive: true, onPress: () => {} },
  ];

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
      <Button variant="outlined" label="title あり" onPress={() => setWithTitle(true)} />
      <Button variant="outlined" label="title なし" onPress={() => setWithoutTitle(true)} />
      <ActionSheet
        visible={withTitle}
        onClose={() => setWithTitle(false)}
        title="投稿の操作"
        actions={actions}
      />
      {/* title なし: 先頭 action の borderTop が消えることの確認 */}
      <ActionSheet
        visible={withoutTitle}
        onClose={() => setWithoutTitle(false)}
        actions={actions}
        cancelLabel="やめる"
      />
    </View>
  );
}
