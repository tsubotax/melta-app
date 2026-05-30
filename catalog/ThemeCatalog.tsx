/**
 * ThemeCatalog — theme 値 + primitive を実機で目視確認する最小カタログ（ハーネス＝Storybook RN の自前版）。
 * primitive 実装ごとにこのカタログへ追記していく（設計書 §6）。
 * light/dark トグルは App から forcedMode を切り替える（§6）。
 */

import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from "react-native";
import { nativeTheme, useTheme, type ThemeMode } from "../src/theme";
import { CONTRACTS } from "../src/contracts/contract-types";
import { TextCatalog } from "./components/Text.catalog";
import { MetricCatalog } from "./components/Metric.catalog";
import { SurfaceImageCatalog } from "./components/SurfaceImage.catalog";

const t = nativeTheme;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <RNText style={[styles.sectionTitle, { color: colors["text-heading"] }]}>{title}</RNText>
      {children}
    </View>
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <RNText style={[styles.swatchLabel, { color: colors["text-default"] }]}>
        {label} · {color}
      </RNText>
    </View>
  );
}

/** component の __contract メタを1行 chip で表示（§6 = conformance の目視版）。 */
function ContractChip({ id }: { id: keyof typeof CONTRACTS }) {
  const { colors } = useTheme();
  const c = CONTRACTS[id];
  return (
    <RNText
      style={[
        styles.chip,
        { color: colors["text-muted"], borderColor: colors["border-default"] },
      ]}
    >
      {`__contract ${c.id}@${c.version} · variants:${c.variants.length} · sizes:${c.sizes.length} · states:${c.states.length}`}
    </RNText>
  );
}

interface ThemeCatalogProps {
  mode: ThemeMode;
  onToggleMode: () => void;
}

export function ThemeCatalog({ mode, onToggleMode }: ThemeCatalogProps) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors["bg-page"] }}
      contentContainerStyle={styles.container}
    >
      <View style={styles.headerRow}>
        <RNText style={[styles.h1, { color: colors["text-heading"] }]}>melta-app catalog</RNText>
        <Pressable
          onPress={onToggleMode}
          accessibilityRole="button"
          accessibilityLabel={mode === "light" ? "ダークモードに切替" : "ライトモードに切替"}
          style={[styles.toggle, { borderColor: colors["border-default"] }]}
        >
          <RNText style={{ color: colors["text-default"] }}>
            {mode === "light" ? "🌙 dark" : "☀️ light"}
          </RNText>
        </Pressable>
      </View>

      <Section title="Text primitive">
        <ContractChip id="text" />
        <TextCatalog />
      </Section>

      <Section title="Metric primitive">
        <ContractChip id="metric" />
        <MetricCatalog />
      </Section>

      <Section title="Surface (internal) + Image">
        <ContractChip id="surface" />
        <ContractChip id="image" />
        <SurfaceImageCatalog />
      </Section>

      <Section title="primary">
        {(Object.entries(t.color.primary) as [string, string][]).map(([k, v]) => (
          <Swatch key={k} label={`primary-${k}`} color={v} />
        ))}
      </Section>

      <Section title={`semantic (${mode})`}>
        {(Object.entries(t.color.semantic[mode]) as [string, string][]).map(([k, v]) => (
          <Swatch key={k} label={k} color={v} />
        ))}
      </Section>

      <Section title="status">
        <Swatch label="success" color={t.color.status.success.base} />
        <Swatch label="warning" color={t.color.status.warning.base} />
        <Swatch label="danger" color={t.color.status.danger.base} />
      </Section>

      <Section title="elevation">
        {(["sm", "md", "overlay"] as const).map((k) => (
          <View
            key={k}
            style={[
              styles.elevationCard,
              { borderRadius: t.radius.md, backgroundColor: colors["bg-surface"] },
              t.elevation[k],
            ]}
          >
            <RNText style={[styles.swatchLabel, { color: colors["text-default"] }]}>
              elevation.{k}
            </RNText>
          </View>
        ))}
      </Section>

      <Section title="radius">
        {(Object.entries(t.radius) as [string, number][]).map(([k, v]) => (
          <View key={k} style={styles.swatchRow}>
            <View
              style={[
                styles.radiusBox,
                { borderRadius: v === 9999 ? 24 : v, backgroundColor: t.color.primary["500"] },
              ]}
            />
            <RNText style={[styles.swatchLabel, { color: colors["text-default"] }]}>
              radius.{k} · {v}
            </RNText>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: t.spacing["4"], gap: t.spacing["6"] },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: {
    fontSize: t.typography.fontSize["2xl"].fontSize,
    lineHeight: t.typography.fontSize["2xl"].lineHeight,
    fontWeight: t.typography.fontWeight.bold,
  },
  toggle: {
    paddingVertical: t.spacing["2"],
    paddingHorizontal: t.spacing["3"],
    borderWidth: 1,
    borderRadius: t.radius.md,
  },
  section: { gap: t.spacing["2"] },
  sectionTitle: {
    fontSize: t.typography.fontSize.lg.fontSize,
    fontWeight: t.typography.fontWeight.semibold,
  },
  chip: {
    fontSize: t.typography.fontSize.xs.fontSize,
    borderWidth: 1,
    borderRadius: t.radius.sm,
    paddingVertical: t.spacing["1"],
    paddingHorizontal: t.spacing["2"],
    alignSelf: "flex-start",
  },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: t.spacing["3"] },
  swatch: { width: 40, height: 40, borderRadius: t.radius.sm },
  swatchLabel: {
    fontSize: t.typography.fontSize.sm.fontSize,
  },
  elevationCard: {
    paddingVertical: t.spacing["4"],
    paddingHorizontal: t.spacing["4"],
    marginVertical: t.spacing["2"],
  },
  radiusBox: { width: 40, height: 40 },
});
