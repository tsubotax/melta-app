/**
 * Alert.catalog — Alert の全 variant を実レンダ（設計書 §6）。
 * icon slot / title 無し / 閉じるボタン付きの組み合わせも並べて目視確認する。
 */

import { View } from "react-native";
import { Alert, Text } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";

export function AlertCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["3"] }}>
      {/* variant 別（title + message） */}
      {CONTRACTS.alert.variants.map((v) => (
        <Alert
          key={v}
          variant={v}
          title={`variant ${v}`}
          message="データの同期が完了するとここに通知が出ます。"
        />
      ))}
      {/* title 無し + 閉じるボタン */}
      <Alert
        variant="info"
        message="title 無し + onClose（右端に閉じるボタン）"
        onClose={() => {}}
      />
      {/* icon slot + 閉じるボタン */}
      <Alert
        variant="error"
        title="同期に失敗しました"
        message="ネットワーク接続を確認して、もう一度お試しください。"
        icon={<Text variant="base">⚠️</Text>}
        onClose={() => {}}
      />
    </View>
  );
}
