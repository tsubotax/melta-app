/**
 * ThemeCatalog — 生成された nativeTheme を実機で目視確認するための最小カタログ画面。
 * primitives / components はまだ未実装なので、まずは theme 値（色 / spacing / radius / elevation）を並べる。
 * 各 primitive 実装後にこのカタログへ追記していく（ハーネス＝Storybook RN の自前版）。
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { nativeTheme } from "../src/theme";

const t = nativeTheme;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Swatch({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.swatchLabel}>
        {label} · {color}
      </Text>
    </View>
  );
}

export function ThemeCatalog() {
  return (
    <ScrollView
      style={{ backgroundColor: t.color.semantic.light["bg-page"] }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.h1}>melta-app theme catalog</Text>

      <Section title="primary">
        {(Object.entries(t.color.primary) as [string, string][]).map(([k, v]) => (
          <Swatch key={k} label={`primary-${k}`} color={v} />
        ))}
      </Section>

      <Section title="semantic (light)">
        {(Object.entries(t.color.semantic.light) as [string, string][]).map(([k, v]) => (
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
              { borderRadius: t.radius.md, backgroundColor: t.color.semantic.light["bg-surface"] },
              t.elevation[k],
            ]}
          >
            <Text style={styles.swatchLabel}>elevation.{k}</Text>
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
            <Text style={styles.swatchLabel}>
              radius.{k} · {v}
            </Text>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: t.spacing["4"], gap: t.spacing["6"] },
  h1: {
    fontSize: t.typography.fontSize["2xl"].fontSize,
    lineHeight: t.typography.fontSize["2xl"].lineHeight,
    fontWeight: t.typography.fontWeight.bold,
    color: t.color.semantic.light["text-heading"],
  },
  section: { gap: t.spacing["2"] },
  sectionTitle: {
    fontSize: t.typography.fontSize.lg.fontSize,
    fontWeight: t.typography.fontWeight.semibold,
    color: t.color.semantic.light["text-heading"],
  },
  swatchRow: { flexDirection: "row", alignItems: "center", gap: t.spacing["3"] },
  swatch: { width: 40, height: 40, borderRadius: t.radius.sm },
  swatchLabel: {
    fontSize: t.typography.fontSize.sm.fontSize,
    color: t.color.semantic.light["text-default"],
  },
  elevationCard: {
    paddingVertical: t.spacing["4"],
    paddingHorizontal: t.spacing["4"],
    marginVertical: t.spacing["2"],
  },
  radiusBox: { width: 40, height: 40 },
});
