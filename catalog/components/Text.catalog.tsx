/**
 * Text.catalog — Text primitive の全 variant を実レンダして目視確認する（設計書 §6）。
 * variant リストは contract（CONTRACTS.text.variants）から引く＝カタログも contract 駆動。
 */

import { View } from "react-native";
import { Text } from "../../src/primitives";
import { useTheme } from "../../src/theme";
import { CONTRACTS } from "../../src/contracts/contract-types";

export function TextCatalog() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: theme.spacing["3"] }}>
      {CONTRACTS.text.variants.map((v) => (
        <Text key={v} variant={v} role="heading" weight="semibold" color="text-heading">
          {v} · 道ツーいこうぜ
        </Text>
      ))}
      <Text variant="base" color="text-default">
        body / text-default — 標準本文のサンプル。letterSpacing は body ratio。
      </Text>
      <Text variant="sm" color="text-muted">
        sm / text-muted — 補助テキストのサンプル。
      </Text>
    </View>
  );
}
