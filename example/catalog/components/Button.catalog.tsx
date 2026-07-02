/**
 * Button.catalog — Button の全 variant × 代表 size + 状態（disabled/loading/iconOnly）を実レンダ（§6）。
 */

import { View } from "react-native";
import { Button } from "melta-app";
import { Text } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";

export function ButtonCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* 全 variant（medium） */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
        {CONTRACTS.button.variants.map((v) => (
          <Button key={v} variant={v} label={v} onPress={() => {}} />
        ))}
      </View>
      {/* size 3 段（contained） */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["2"] }}>
        {CONTRACTS.button.sizes.map((s) => (
          <Button key={s} size={s} label={s} onPress={() => {}} />
        ))}
      </View>
      {/* 状態: disabled / loading / iconOnly */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["2"] }}>
        <Button label="disabled" disabled onPress={() => {}} />
        <Button label="loading" loading onPress={() => {}} />
        <Button
          iconOnly
          accessibilityLabel="閉じる"
          leadingIcon={<Text style={{ color: "#fff" }}>×</Text>}
          onPress={() => {}}
        />
      </View>
    </View>
  );
}
