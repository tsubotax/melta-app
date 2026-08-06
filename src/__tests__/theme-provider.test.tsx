/**
 * theme-provider — ThemeProvider の theme 注入と mode 解決の RN runtime テスト（Step 2-①）。
 *
 * 純関数側（resolveMode / validateTheme / defineTheme）は scripts/lib/theme-injection.test.ts が
 * 網羅する。ここは React と useColorScheme が絡む挙動だけを見る:
 *   - 未指定なら従来どおり nativeTheme（既存消費者に破壊的変更が無いこと）
 *   - 注入した theme が context に届くこと
 *   - 単一 colorScheme の theme に OS が非対応 mode を返しても描けること
 *   - forcedMode の矛盾は throw せず clamp し、dev で1回だけ報告すること
 *   - context value の参照が安定していること（毎レンダー新オブジェクトを配らない）
 *
 * import は公開エントリ（../index）経由 — 利用者と同じ経路で使えることの証明を兼ねる。
 * fixture は scripts/lib/fixtures から**拡張子なし**で読む（jest-resolve は .js → .ts を引けない）。
 */

import { describe, test, expect, jest, beforeEach, afterEach } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { Text as RNText, useColorScheme } from "react-native";
import { ThemeProvider, useTheme, defineTheme, nativeTheme } from "../index.js";
import type { ResolvedNativeTheme } from "../index.js";
import { singleDarkThemeOptions } from "../../scripts/lib/fixtures/single-dark.theme.js";

jest.mock("react-native/Libraries/Utilities/useColorScheme");

const mockedUseColorScheme = jest.mocked(useColorScheme);

/** 消費者と同じ使い方: module スコープで1回だけ組み立てる。 */
const singleDarkTheme: ResolvedNativeTheme = defineTheme(singleDarkThemeOptions);

interface Probe {
  mode: string;
  colorScheme: string;
  bgPage: string;
  /** context value の参照。再レンダー間で同一かを見る。 */
  values: unknown[];
}

async function renderProbe(ui: (probe: Probe) => React.ReactElement): Promise<Probe> {
  const probe: Probe = { mode: "", colorScheme: "", bgPage: "", values: [] };
  await render(ui(probe));
  return probe;
}

function Probe({ probe }: { probe: Probe }) {
  const value = useTheme();
  probe.mode = value.mode;
  probe.colorScheme = value.capabilities.colorScheme;
  probe.bgPage = value.colors["bg-page"];
  probe.values.push(value);
  return <RNText>probe</RNText>;
}

describe("ThemeProvider の theme 注入", () => {
  beforeEach(() => {
    mockedUseColorScheme.mockReturnValue("light");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("theme 未指定なら従来どおり melta 既定の nativeTheme を配る", async () => {
    const probe = await renderProbe((p) => (
      <ThemeProvider>
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.mode).toBe("light");
    expect(probe.colorScheme).toBe("light-dark");
    expect(probe.bgPage).toBe(nativeTheme.color.semantic.light["bg-page"]);
  });

  test("注入した theme の色が context に届く", async () => {
    const probe = await renderProbe((p) => (
      <ThemeProvider theme={singleDarkTheme}>
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.bgPage).toBe(singleDarkThemeOptions.color.semantic.dark?.["bg-page"]);
    expect(probe.bgPage).not.toBe(nativeTheme.color.semantic.dark["bg-page"]);
  });

  test("capability は宣言なしで導出され、context から読める", async () => {
    const probe = await renderProbe((p) => (
      <ThemeProvider theme={singleDarkTheme}>
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.colorScheme).toBe("single-dark");
  });

  test("OS が light でも single-dark theme は dark で描ける（黙って clamp する）", async () => {
    mockedUseColorScheme.mockReturnValue("light");
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const probe = await renderProbe((p) => (
      <ThemeProvider theme={singleDarkTheme}>
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.mode).toBe("dark");
    // 環境の事実であって事故ではないので何も言わない
    //（言うと light 設定のユーザ全員に警告が出る）。
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test.each([
    ["unspecified" as const, "型どおりの不明値"],
    // TS の型は 'light' | 'dark' | 'unspecified' だが Flow 側は ?ColorSchemeName で
    // 実行時に null / undefined もありうる。既定 theme はどれでも light に落ちる（従来挙動）。
    [null as unknown as "unspecified", "実行時のみありうる null"],
  ])("OS の colorScheme が %s（%s）でも既定 theme は light に落ちる", async (scheme) => {
    mockedUseColorScheme.mockReturnValue(scheme);
    const probe = await renderProbe((p) => (
      <ThemeProvider>
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.mode).toBe("light");
  });

  test("forcedMode が theme の能力と矛盾しても throw せず clamp して描く", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const probe = await renderProbe((p) => (
      <ThemeProvider theme={singleDarkTheme} forcedMode="light">
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.mode).toBe("dark");
    expect(probe.bgPage).toBe(singleDarkThemeOptions.color.semantic.dark?.["bg-page"]);
    // dev では矛盾を報告する（clamp はするが黙らない）。
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/forcedMode="light"/);
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/colorScheme=single-dark/);
  });

  test("同じ矛盾を何度描いても報告は1回だけ", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const tree = (
      <ThemeProvider theme={singleDarkTheme} forcedMode="light">
        <RNText>x</RNText>
      </ThemeProvider>
    );
    const { rerender } = await render(tree);
    await rerender(tree);
    await rerender(tree);
    expect(errorSpy.mock.calls.length).toBeLessThanOrEqual(1);
  });

  test("対応している mode の forcedMode は素直に効く（既存のカタログ用途）", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    const probe = await renderProbe((p) => (
      <ThemeProvider forcedMode="dark">
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(probe.mode).toBe("dark");
    expect(probe.bgPage).toBe(nativeTheme.color.semantic.dark["bg-page"]);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test("context value は再レンダーしても同じ参照（全 consumer の再レンダーを防ぐ）", async () => {
    const probe: Probe = { mode: "", colorScheme: "", bgPage: "", values: [] };
    // 毎回新しい element を作る（同一 element を渡すと React が bailout して再レンダーしない）。
    const tree = () => (
      <ThemeProvider theme={singleDarkTheme}>
        <Probe probe={probe} />
      </ThemeProvider>
    );
    const { rerender } = await render(tree());
    await rerender(tree());
    expect(probe.values.length).toBeGreaterThan(1);
    for (const value of probe.values) {
      expect(value).toBe(probe.values[0]);
    }
  });

  test("注入 theme を差し替えると context value も入れ替わる（useMemo の依存に入っている）", async () => {
    const probe: Probe = { mode: "", colorScheme: "", bgPage: "", values: [] };
    const other = defineTheme({ ...nativeTheme, id: "other" });
    const { rerender } = await render(
      <ThemeProvider theme={singleDarkTheme}>
        <Probe probe={probe} />
      </ThemeProvider>,
    );
    const first = probe.bgPage;
    await rerender(
      <ThemeProvider theme={other}>
        <Probe probe={probe} />
      </ThemeProvider>,
    );
    expect(probe.bgPage).not.toBe(first);
    expect(probe.colorScheme).toBe("light-dark");
  });

  test("単一 colorScheme の theme で持たない mode を直接読むと原因を名指しして落ちる", async () => {
    await renderProbe((p) => (
      <ThemeProvider theme={singleDarkTheme}>
        <Probe probe={p} />
      </ThemeProvider>
    ));
    expect(() => singleDarkTheme.color.semantic.light).toThrow(/colorScheme=single-dark/);
  });
});
