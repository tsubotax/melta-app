/**
 * ThemeCatalog — theme 値 + primitive を実機で目視確認する最小カタログ（ハーネス＝Storybook RN の自前版）。
 * primitive 実装ごとに COMPONENT_SECTIONS へ追記していく（設計書 §6）。
 * light/dark トグルは App から forcedMode を切り替える（§6）。
 * セクション定義はデータ駆動で、ジャンプナビ（sticky chips）はここから自動生成される。
 */

import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from "react-native";
import { nativeTheme, useTheme, type ThemeMode } from "melta-app";
import { CONTRACTS } from "melta-app";
import { TextCatalog } from "./components/Text.catalog";
import { MetricCatalog } from "./components/Metric.catalog";
import { SurfaceImageCatalog } from "./components/SurfaceImage.catalog";
import { TagCatalog } from "./components/Tag.catalog";
import { CardCatalog } from "./components/Card.catalog";
import { ButtonCatalog } from "./components/Button.catalog";
import { SkeletonEmptyStateCatalog } from "./components/SkeletonEmptyState.catalog";
import { LayoutCatalog } from "./components/Layout.catalog";
import { ScreenHeaderCatalog } from "./components/ScreenHeader.catalog";
import { AvatarIconCatalog } from "./components/AvatarIcon.catalog";
import { TextFieldCatalog } from "./components/TextField.catalog";
import { ToggleCatalog } from "./components/Toggle.catalog";
import { CheckboxCatalog } from "./components/Checkbox.catalog";
import { RadioCatalog } from "./components/Radio.catalog";
import { AlertCatalog } from "./components/Alert.catalog";
import { ToastCatalog } from "./components/Toast.catalog";
import { ProgressCatalog } from "./components/Progress.catalog";
import { ModalCatalog } from "./components/Modal.catalog";
import { ActionSheetCatalog } from "./components/ActionSheet.catalog";
import { BottomSheetCatalog } from "./components/BottomSheet.catalog";

const t = nativeTheme;

/** カタログのセクション定義（SSOT）。ジャンプナビと本文の両方をここから描く。 */
const COMPONENT_SECTIONS: {
  key: string;
  navLabel: string;
  title: string;
  contracts: (keyof typeof CONTRACTS)[];
  Body: () => React.JSX.Element;
}[] = [
  { key: "text", navLabel: "Text", title: "Text primitive", contracts: ["text"], Body: TextCatalog },
  { key: "metric", navLabel: "Metric", title: "Metric primitive", contracts: ["metric"], Body: MetricCatalog },
  { key: "surface", navLabel: "Surface/Image", title: "Surface (internal) + Image", contracts: ["surface", "image"], Body: SurfaceImageCatalog },
  { key: "button", navLabel: "Button", title: "Button primitive", contracts: ["button"], Body: ButtonCatalog },
  { key: "tag", navLabel: "Tag", title: "Tag primitive", contracts: ["tag"], Body: TagCatalog },
  { key: "card", navLabel: "Card", title: "Card component（+ ツー活カード compose）", contracts: ["card"], Body: CardCatalog },
  { key: "skeleton", navLabel: "Skeleton/Empty", title: "Skeleton + EmptyState", contracts: ["skeleton", "emptyState"], Body: SkeletonEmptyStateCatalog },
  { key: "layout", navLabel: "Stack/Row", title: "Stack + Row（layout primitives）", contracts: ["stack", "row"], Body: LayoutCatalog },
  { key: "screen", navLabel: "Screen/Header", title: "Screen + Header（画面骨格）", contracts: ["screen", "header"], Body: ScreenHeaderCatalog },
  { key: "avatar", navLabel: "Avatar/Icon", title: "Avatar + Icon", contracts: ["avatar", "icon"], Body: AvatarIconCatalog },
  { key: "textfield", navLabel: "TextField", title: "TextField（form）", contracts: ["textfield"], Body: TextFieldCatalog },
  { key: "toggle", navLabel: "Toggle", title: "Toggle（form）", contracts: ["toggle"], Body: ToggleCatalog },
  { key: "checkbox", navLabel: "Checkbox", title: "Checkbox（form）", contracts: ["checkbox"], Body: CheckboxCatalog },
  { key: "radio", navLabel: "Radio", title: "Radio（form）", contracts: ["radio"], Body: RadioCatalog },
  { key: "alert", navLabel: "Alert", title: "Alert（feedback）", contracts: ["alert"], Body: AlertCatalog },
  { key: "toast", navLabel: "Toast", title: "Toast（feedback）", contracts: ["toast"], Body: ToastCatalog },
  { key: "progress", navLabel: "Progress", title: "Progress（feedback）", contracts: ["progress"], Body: ProgressCatalog },
  { key: "modal", navLabel: "Modal", title: "Modal（overlay）", contracts: ["modal"], Body: ModalCatalog },
  { key: "actionSheet", navLabel: "ActionSheet", title: "ActionSheet（overlay）", contracts: ["actionSheet"], Body: ActionSheetCatalog },
  { key: "bottomSheet", navLabel: "BottomSheet", title: "BottomSheet（overlay）", contracts: ["bottomSheet"], Body: BottomSheetCatalog },
];

const TOKENS_KEY = "tokens";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <RNText style={[styles.sectionTitle, { color: colors["text-heading"] }]}>{title}</RNText>
      {children}
    </View>
  );
}

/** グループ見出し（Components / Design tokens の大区切り）。 */
function GroupHeading({ title, caption }: { title: string; caption?: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.groupHeading, { borderTopColor: colors["border-default"] }]}>
      <RNText style={[styles.groupTitle, { color: colors["text-heading"] }]}>{title}</RNText>
      {caption != null && (
        <RNText style={[styles.swatchLabel, { color: colors["text-muted"] }]}>{caption}</RNText>
      )}
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

/** セクションへのジャンプナビ（sticky）。COMPONENT_SECTIONS から自動生成。 */
function JumpNav({
  onJump,
  onHeight,
}: {
  onJump: (key: string) => void;
  onHeight: (h: number) => void;
}) {
  const { colors } = useTheme();
  const items = [
    ...COMPONENT_SECTIONS.map((s) => ({ key: s.key, label: s.navLabel })),
    { key: TOKENS_KEY, label: "Tokens" },
  ];
  return (
    <View
      style={{ backgroundColor: colors["bg-page"] }}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.jumpNavContent}
      >
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onJump(item.key)}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} セクションへ移動`}
            style={[
              styles.jumpChip,
              { borderColor: colors["border-default"], backgroundColor: colors["bg-surface"] },
            ]}
          >
            <RNText style={[styles.jumpChipLabel, { color: colors["text-default"] }]}>
              {item.label}
            </RNText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

interface ThemeCatalogProps {
  mode: ThemeMode;
  onToggleMode: () => void;
}

export function ThemeCatalog({ mode, onToggleMode }: ThemeCatalogProps) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  // 各セクションの y 位置（onLayout で記録、ジャンプナビの scrollTo 先）
  const sectionY = useRef<Record<string, number>>({});
  // sticky ナビの実高。ジャンプ先がナビの下に潜らないよう scrollTo から差し引く（Codex L指摘）
  const navHeight = useRef(0);

  const handleJump = (key: string) => {
    const y = sectionY.current[key];
    if (y != null)
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - navHeight.current - t.spacing["2"]),
        animated: true,
      });
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={{ backgroundColor: colors["bg-page"] }}
      contentContainerStyle={styles.container}
      stickyHeaderIndices={[1]}
    >
      {/* index 0: ヘッダー */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <RNText style={[styles.h1, { color: colors["text-heading"] }]}>melta-app catalog</RNText>
          <RNText style={[styles.swatchLabel, { color: colors["text-muted"] }]}>
            melta-contracts 駆動の RN DS。各 chip は実装が満たす contract メタ（§6）。
          </RNText>
        </View>
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

      {/* index 1: sticky ジャンプナビ */}
      <JumpNav onJump={handleJump} onHeight={(h) => (navHeight.current = h)} />

      <GroupHeading
        title="Components"
        caption={`MVP ${Object.keys(CONTRACTS).length} 個（Icon は melta-app/icons subpath）`}
      />

      {COMPONENT_SECTIONS.map(({ key, title, contracts, Body }) => (
        <View
          key={key}
          onLayout={(e) => {
            sectionY.current[key] = e.nativeEvent.layout.y;
          }}
        >
          <Section title={title}>
            {contracts.map((id) => (
              <ContractChip key={id} id={id} />
            ))}
            <Body />
          </Section>
        </View>
      ))}

      <View
        onLayout={(e) => {
          sectionY.current[TOKENS_KEY] = e.nativeEvent.layout.y;
        }}
        style={styles.tokensGroup}
      >
        <GroupHeading title="Design tokens" caption="melta-contracts tokens.json → NativeTheme（生成物）" />

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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // maxWidth + 中央寄せは web showcase 向け（native の狭い画面では no-op）
  container: {
    padding: t.spacing["4"],
    gap: t.spacing["6"],
    width: "100%",
    maxWidth: 960,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: t.spacing["3"],
  },
  h1: {
    fontSize: t.typography.fontSize["2xl"].fontSize,
    lineHeight: t.typography.fontSize["2xl"].lineHeight,
    fontWeight: t.typography.fontWeight.bold,
  },
  groupHeading: {
    borderTopWidth: 1,
    paddingTop: t.spacing["4"],
    gap: t.spacing["1"],
  },
  groupTitle: {
    fontSize: t.typography.fontSize.xl.fontSize,
    fontWeight: t.typography.fontWeight.bold,
  },
  toggle: {
    paddingVertical: t.spacing["2"],
    paddingHorizontal: t.spacing["3"],
    borderWidth: 1,
    borderRadius: t.radius.md,
  },
  jumpNavContent: {
    gap: t.spacing["2"],
    paddingVertical: t.spacing["2"],
  },
  jumpChip: {
    paddingVertical: t.spacing["1"],
    paddingHorizontal: t.spacing["3"],
    borderWidth: 1,
    borderRadius: t.radius.full,
  },
  jumpChipLabel: {
    fontSize: t.typography.fontSize.sm.fontSize,
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
  tokensGroup: { gap: t.spacing["6"] },
});
