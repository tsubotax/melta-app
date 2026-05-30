import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import { ThemeProvider, type ThemeMode } from "./src/theme";
import { ThemeCatalog } from "./catalog/ThemeCatalog";

export default function App() {
  // カタログの light/dark トグル（§6）。ThemeProvider.forcedMode に流す。
  const [mode, setMode] = useState<ThemeMode>("light");
  return (
    <ThemeProvider forcedMode={mode}>
      <SafeAreaView style={styles.root}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ThemeCatalog
          mode={mode}
          onToggleMode={() => setMode((m) => (m === "light" ? "dark" : "light"))}
        />
      </SafeAreaView>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
