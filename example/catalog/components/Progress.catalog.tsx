/**
 * Progress.catalog — Progress の全 variant を実レンダ（設計書 §6）。
 * determinate（primary/success）は値違い（0 / 65 / 100）を並べ、indeterminate は往復アニメを
 * 目視確認する（OS の「視差効果を減らす」ON で静止 40% になることも実機で確認する）。
 */

import { View } from "react-native";
import { Progress, Text } from "melta-app";
import { useTheme } from "melta-app";

export function ProgressCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* primary: 値違い */}
      <View style={{ gap: theme.spacing["2"] }}>
        <Text variant="xs" color="text-muted">
          primary 0% / 65% / 100%
        </Text>
        <Progress variant="primary" value={0} label="進捗 0%" />
        <Progress variant="primary" value={65} label="進捗 65%" />
        <Progress variant="primary" value={100} label="進捗 100%" />
      </View>
      {/* success */}
      <View style={{ gap: theme.spacing["2"] }}>
        <Text variant="xs" color="text-muted">
          success 100%
        </Text>
        <Progress variant="success" value={100} label="アップロード完了" />
      </View>
      {/* indeterminate（往復アニメ） */}
      <View style={{ gap: theme.spacing["2"] }}>
        <Text variant="xs" color="text-muted">
          indeterminate（reduce motion ON で静止 40%）
        </Text>
        <Progress variant="indeterminate" label="読み込み中" />
      </View>
    </View>
  );
}
