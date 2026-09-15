import { test, expect } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { ThemeProvider, Card, Skeleton, Text } from "../index.js";
import { nativeTheme } from "../theme/native-theme.js";

for (const mode of ["light", "dark"] as const) {
  test(`影の指定変更がCardとSkeletonの実描画へ届く (${mode})`, async () => {
    const content = (elevation: "default" | "none") => (
      <ThemeProvider forcedMode={mode}>
        <Card elevation={elevation} testID="card"><Text>本文</Text></Card>
        <Skeleton variant="card" elevation={elevation} testID="skeleton" />
      </ThemeProvider>
    );
    const screen = await render(content("default"));
    for (const elevation of ["default", "none", "default"] as const) {
      await screen.rerender(content(elevation));
      const expected = nativeTheme.elevation[elevation === "none" ? "none" : "sm"];
      for (const id of ["card", "skeleton"]) {
        expect(StyleSheet.flatten(screen.getByTestId(id).props.style)).toMatchObject(expected);
      }
    }
  });
}
