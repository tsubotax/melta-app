/**
 * Toggle.catalog — Toggle の全 variant（off/on = value 由来）/ size / disabled を実レンダ（§6）。
 * 先頭2つは state 付きで実際にタップ切替できる（label タップも効くことの確認を兼ねる）。
 */

import { useState } from "react";
import { View } from "react-native";
import { Toggle } from "melta-app";
import { useTheme } from "melta-app";
import { CONTRACTS } from "melta-app";

export function ToggleCatalog() {
  const { theme } = useTheme();
  const [notify, setNotify] = useState(true);
  const [darkSync, setDarkSync] = useState(false);
  return (
    <View style={{ gap: theme.spacing["4"] }}>
      {/* 操作可能（label 付き。Pressable 全体がタップ領域） */}
      <View style={{ gap: theme.spacing["3"] }}>
        <Toggle value={notify} onValueChange={setNotify} label="通知を受け取る" />
        <Toggle value={darkSync} onValueChange={setDarkSync} label="OS のダークモードに追従" size="large" />
      </View>
      {/* off / on × size（label なしの素の見た目） */}
      {CONTRACTS.toggle.sizes.map((s) => (
        <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["4"] }}>
          <Toggle value={false} size={s} label={`${s} off`} />
          <Toggle value={true} size={s} label={`${s} on`} />
        </View>
      ))}
      {/* disabled（off / on 両方） */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing["4"] }}>
        <Toggle value={false} disabled label="disabled off" />
        <Toggle value={true} disabled label="disabled on" />
      </View>
    </View>
  );
}
