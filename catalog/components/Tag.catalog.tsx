/**
 * Tag.catalog — Tag の全 variant を実レンダ（設計書 §6）。filter-chip は selected トグルも実演。
 */

import { useState } from "react";
import { View } from "react-native";
import { Tag } from "../../src/primitives";
import { useTheme } from "../../src/theme";

export function TagCatalog() {
  const { theme } = useTheme();
  const [chips, setChips] = useState<Record<string, boolean>>({
    道東: true,
    道北: false,
    絶景: false,
  });
  return (
    <View style={{ gap: theme.spacing["3"] }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
        <Tag label="basic タグ" />
        <Tag
          variant="removable"
          label="削除可能"
          onRemove={() => {}}
          removeAccessibilityLabel="削除可能 を外す"
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing["2"] }}>
        {Object.keys(chips).map((key) => (
          <Tag
            key={key}
            variant="filter-chip"
            label={key}
            selected={chips[key]}
            onToggle={() => setChips((c) => ({ ...c, [key]: !c[key] }))}
          />
        ))}
      </View>
    </View>
  );
}
