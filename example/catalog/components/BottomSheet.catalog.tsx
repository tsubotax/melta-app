/**
 * BottomSheet.catalog — BottomSheet を実レンダ（§6）。
 * オーバーレイ系のため「開く」ボタン + useState visible で実際に開閉できる形にする。
 * grabber（装飾バー）+ title + 自由 content slot（フィルタ風の compose）を確認する。
 */

import { useState } from "react";
import { View } from "react-native";
import { BottomSheet, Button, Tag, Text, useTheme } from "melta-app";

export function BottomSheetCatalog() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
      <Button variant="outlined" label="BottomSheet を開く" onPress={() => setVisible(true)} />
      <BottomSheet visible={visible} onClose={() => setVisible(false)} title="条件で絞り込む">
        {/* content は自由 slot（フィルタ風の compose 例） */}
        <View style={{ gap: theme.spacing["3"] }}>
          <Text color="text-muted">登録した記録に付けたタグで絞り込みます。</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
            <Tag label="都市部" />
            <Tag label="郊外" />
            <Tag label="長期プロジェクト" />
          </View>
          <Button label="この条件で絞り込む" onPress={() => setVisible(false)} />
        </View>
      </BottomSheet>
    </View>
  );
}
