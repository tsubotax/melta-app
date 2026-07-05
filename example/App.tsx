import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { ThemeProvider, useTheme, type ThemeMode } from "melta-app";
import { ThemeCatalog } from "./catalog/ThemeCatalog";
import { ProjectFeedScreen } from "./screens/ProjectFeedScreen";

type View_ = "catalog" | "feed" | "feed-loading" | "feed-empty";

/** 下部の簡易タブ（catalog ⇄ dogfood 実画面）。dogfood 確認用、DS の一部ではない。 */
function DevTabs({ view, onChange }: { view: View_; onChange: (v: View_) => void }) {
  const { colors, theme } = useTheme();
  const tabs: { key: View_; label: string }[] = [
    { key: "catalog", label: "Catalog" },
    { key: "feed", label: "Feed" },
    { key: "feed-loading", label: "Loading" },
    { key: "feed-empty", label: "Empty" },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: colors["border-default"],
        backgroundColor: colors["bg-surface"],
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          style={{ flex: 1, paddingVertical: theme.spacing["3"], alignItems: "center" }}
        >
          <Text
            style={{
              color: view === t.key ? colors["text-heading"] : colors["text-muted"],
              fontWeight: view === t.key ? "700" : "400",
            }}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function Root({ mode, onToggleMode }: { mode: ThemeMode; onToggleMode: () => void }) {
  const [view, setView] = useState<View_>("catalog");
  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {view === "catalog" ? (
          <SafeAreaView style={styles.root}>
            <ThemeCatalog mode={mode} onToggleMode={onToggleMode} />
          </SafeAreaView>
        ) : view === "feed-loading" ? (
          <ProjectFeedScreen state="loading" />
        ) : view === "feed-empty" ? (
          <ProjectFeedScreen state="empty" />
        ) : (
          <ProjectFeedScreen state="ready" />
        )}
      </View>
      <DevTabs view={view} onChange={setView} />
    </View>
  );
}

export default function App() {
  // light/dark トグル（§6）。ThemeProvider.forcedMode に流す。
  const [mode, setMode] = useState<ThemeMode>("light");
  return (
    <ThemeProvider forcedMode={mode}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <Root mode={mode} onToggleMode={() => setMode((m) => (m === "light" ? "dark" : "light"))} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
});
