/**
 * Radio.catalog — Radio（RadioGroup）の全 variant / 状態を実レンダ（設計書 §6）。
 * vertical / horizontal / card-style（description 付き）+ error / disabled を実演する。
 */

import { useState } from "react";
import { View } from "react-native";
import { Radio } from "melta-app";
import { useTheme } from "melta-app";

export function RadioCatalog() {
  const { theme } = useTheme();
  const [delivery, setDelivery] = useState<string | undefined>("standard");
  const [season, setSeason] = useState<string | undefined>(undefined);
  const [plan, setPlan] = useState<string | undefined>("standard");

  return (
    <View style={{ gap: theme.spacing["6"] }}>
      {/* vertical（標準）+ option 個別 disabled */}
      <Radio
        label="配送方法"
        variant="vertical"
        value={delivery}
        onChange={setDelivery}
        options={[
          { label: "標準配送", value: "standard" },
          { label: "速達配送", value: "express" },
          { label: "店舗受け取り", value: "pickup", disabled: true },
        ]}
      />

      {/* horizontal（短いラベル向け）+ error（未選択バリデーション） */}
      <Radio
        label="契約時期"
        variant="horizontal"
        value={season}
        onChange={setSeason}
        error={season === undefined ? "時期を選択してください" : undefined}
        options={[
          { label: "春", value: "spring" },
          { label: "夏", value: "summer" },
          { label: "秋", value: "autumn" },
        ]}
      />

      {/* card-style（description 付きプラン選択） */}
      <Radio
        label="プラン"
        variant="card-style"
        value={plan}
        onChange={setPlan}
        options={[
          {
            label: "スタンダードプラン",
            value: "standard",
            description: "基本機能一式が使える標準プラン",
          },
          {
            label: "プレミアムプラン",
            value: "premium",
            description: "スタンダードプランに加えて優先サポートと拡張機能が使える",
          },
        ]}
      />

      {/* グループ全体 disabled */}
      <Radio
        label="グループ disabled"
        value="a"
        onChange={() => {}}
        disabled
        options={[
          { label: "選択肢 A", value: "a" },
          { label: "選択肢 B", value: "b" },
        ]}
      />
    </View>
  );
}
