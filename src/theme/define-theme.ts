/**
 * define-theme — 消費者ブランドの theme を注入するための入口（設計書 Step 2-①）。
 *
 * melta 既定の theme は melta-contracts から codegen した `nativeTheme` だが、消費者が自分の
 * ブランドトークンで塗り替えられる正規の口をここで提供する。`defineTheme()` を通した成果物だけを
 * `<ThemeProvider theme={...}>` が受け取る（Chakra の `$$chakra` と同じ brand 方式。
 * 生オブジェクトの直渡しを型で塞ぎ、validation を必ず1回通すため）。
 *
 * 設計の要点:
 * - **capability は宣言でなく導出する**。「この theme は dark しか持たない」は
 *   `color.semantic` のキー集合そのものが語る（Primer の colorSchemes / DTCG Resolver の contexts と同じ流儀）。
 *   別欄で宣言すると「宣言と実体の不一致」という新種の嘘が生まれ、それを警備する検査が要るだけになる。
 * - **嘘の値で埋めない**。単一 colorScheme の theme は存在しない mode を **書かない**。
 *   ゼロ埋め・他 mode のコピー・センチネル値はいずれも「その mode が存在する」という嘘をトークンに残す。
 * - **Proxy は使わない**。Hermes は Proxy が使われていなくても全プロパティアクセスに分岐が入る
 *   （hermes#33）。存在しない mode の検出は non-enumerable な getter で行う（下記）。
 *
 * 注: accent（primary パレット / text-accent）・elevation・status の light 値は、単一 dark の
 * theme でも現状 **必須のまま**。①の射程は colorScheme 軸だけで、それらの capability 化は
 * 後続（accent 依存の除去）で扱う。
 */

import type {
  ElevationKey,
  FontSizeKey,
  FontWeightKey,
  NativeTheme,
  PrimaryScale,
  RadiusKey,
  SemanticColors,
  SpacingKey,
  StatusColors,
  ThemeColor,
  ThemeMode,
} from "./types";

// ---------------------------------------------------------------------------
// dev 判定
// ---------------------------------------------------------------------------

/**
 * 開発ビルドか。**裸の `__DEV__` を直接書かないこと。**
 *
 * `__DEV__` は Metro のグローバルで、Metro なら prod ビルド時に `false` へ畳み込まれて
 * dev ブロックごと消える。一方 melta は package.json の exports の `import` / `default` 条件で
 * 同じ ESM を非 Metro の web バンドラにも配っており、react-native-web は `__DEV__` を
 * **定義しない**（vendored 側で `process.env.NODE_ENV` にローカル shim している）。
 * そこで `typeof` で存在を確かめ、無い環境では `NODE_ENV === "development"` のときだけ有効にする
 * （判定不能なら dev 機能を**切る**側に倒す ＝ 本番に dev コストを漏らさない）。
 * `process` を識別子として直接参照しないのは、それを書くと tsconfig.build.json（bob build）だけが
 * TS2591 で落ちるため（typecheck は通ってしまうので気づけない）。
 */
export const isDev: boolean =
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV ===
      "development";

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

/** theme が持つ配色の能力。`color.semantic` のキー集合から導出される（宣言ではない）。 */
export type ColorSchemeCapability = "light-dark" | "single-light" | "single-dark";

/**
 * 解決済みの capability 集合。context 経由で全 component が読める。
 * 後続で accent / elevation の軸が増えるのもこの器（それらはキー集合から導出できないので宣言になる）。
 */
export interface ResolvedCapabilities {
  colorScheme: ColorSchemeCapability;
}

/**
 * `defineTheme()` の入力。`NativeTheme` との差は `color.semantic` が mode ごとに任意な点だけ。
 * 持っていない mode は **書かない**（capability はキー集合から導出される）。
 */
export interface ThemeOptions extends Omit<NativeTheme, "color"> {
  /** 診断・エラーメッセージ用の識別子（任意）。preset compiler の成果物では preset 名を入れる。 */
  readonly id?: string;
  readonly version?: string;
  color: Omit<ThemeColor, "semantic"> & {
    semantic: Partial<Record<ThemeMode, SemanticColors>>;
  };
}

/**
 * `defineTheme()` の成果物。`ThemeProvider` の `theme` prop が受け取れる唯一の形。
 * `$$melta` brand により生オブジェクトの直渡しを型で塞ぐ（＝ validation を必ず1回通す）。
 */
export interface ResolvedNativeTheme extends ThemeOptions {
  readonly $$melta: true;
  readonly capabilities: ResolvedCapabilities;
}

/** 解決した mode が theme の能力と食い違ったこと。ThemeProvider は dev で報告し、値は clamp する。 */
export interface ThemeModeViolation {
  kind: "forced-mode-unsupported";
  /** 呼び出し側が forcedMode で明示した mode。 */
  requested: ThemeMode;
  /** 実際に使われる mode。 */
  resolved: ThemeMode;
  colorScheme: ColorSchemeCapability;
}

// ---------------------------------------------------------------------------
// キー集合（型と実行時の二重管理を防ぐ: Record<K, true> で網羅性を tsc に検査させる）
// ---------------------------------------------------------------------------

function keysOf<T extends object>(map: T): (keyof T)[] {
  return Object.keys(map) as (keyof T)[];
}

const MODES = keysOf<Record<ThemeMode, true>>({ light: true, dark: true });

const SEMANTIC_KEYS = keysOf<Record<keyof SemanticColors, true>>({
  "bg-page": true,
  "bg-page-alt": true,
  "bg-surface": true,
  "bg-surface-alt": true,
  "text-heading": true,
  "text-default": true,
  "text-muted": true,
  "border-default": true,
  "border-strong": true,
  "input-bg": true,
  "input-border": true,
  "text-accent": true,
  "text-on-accent": true,
});

const PRIMARY_KEYS = keysOf<Record<PrimaryScale, true>>({
  "50": true,
  "100": true,
  "200": true,
  "300": true,
  "400": true,
  "500": true,
  "600": true,
  "700": true,
  "800": true,
  "900": true,
  "950": true,
});

const STATUS_KINDS = keysOf<Record<keyof ThemeColor["status"], true>>({
  success: true,
  warning: true,
  danger: true,
});

const STATUS_COLOR_KEYS = keysOf<Record<keyof StatusColors, true>>({
  base: true,
  subtleLight: true,
  textLight: true,
  subtleDark: true,
  textDark: true,
});

const SPACING_KEYS = keysOf<Record<SpacingKey, true>>({
  "1": true,
  "2": true,
  "3": true,
  "4": true,
  "5": true,
  "6": true,
  "8": true,
  "10": true,
  "12": true,
  "14": true,
  "16": true,
});

const RADIUS_KEYS = keysOf<Record<RadiusKey, true>>({
  sm: true,
  md: true,
  lg: true,
  full: true,
});

const ELEVATION_KEYS = keysOf<Record<ElevationKey, true>>({
  none: true,
  sm: true,
  md: true,
  overlay: true,
});

const FONT_SIZE_KEYS = keysOf<Record<FontSizeKey, true>>({
  xxs: true,
  xs: true,
  sm: true,
  base: true,
  lg: true,
  xl: true,
  "2xl": true,
  "3xl": true,
});

const FONT_WEIGHT_KEYS = keysOf<Record<FontWeightKey, true>>({
  normal: true,
  medium: true,
  semibold: true,
  bold: true,
});

// ---------------------------------------------------------------------------
// capability の導出
// ---------------------------------------------------------------------------

/**
 * theme が実際に値を持っている mode。
 *
 * **enumerable な own key だけを見る**こと。`hasOwnProperty` は non-enumerable な own
 * プロパティにも true を返すので、それで判定すると「持っていない mode に置いた番人の getter」を
 * 値として数えてしまい、解決後の theme に対して常に light / dark 両方を返す（0.4.0 の不具合）。
 * 入力（素のデータプロパティ）と解決後（番人つき）のどちらに対しても正しく答える必要がある。
 */
export function declaredModes(semantic: Partial<Record<ThemeMode, SemanticColors>>): ThemeMode[] {
  const withValue = new Set(Object.keys(semantic));
  return MODES.filter((mode) => withValue.has(mode));
}

/** colorScheme capability を `color.semantic` のキー集合から導出する。 */
export function deriveColorScheme(
  semantic: Partial<Record<ThemeMode, SemanticColors>>,
): ColorSchemeCapability {
  const modes = declaredModes(semantic);
  if (modes.length === 2) return "light-dark";
  if (modes[0] === "dark") return "single-dark";
  if (modes[0] === "light") return "single-light";
  throw new Error(
    "melta: theme.color.semantic に light / dark のどちらも無い。最低1つの mode が要る。",
  );
}

/** capability が実際に描ける mode。 */
export function supportedModes(colorScheme: ColorSchemeCapability): ThemeMode[] {
  if (colorScheme === "single-dark") return ["dark"];
  if (colorScheme === "single-light") return ["light"];
  return ["light", "dark"];
}

// ---------------------------------------------------------------------------
// mode 解決
// ---------------------------------------------------------------------------

/**
 * 表示 mode を解決する（純関数。ThemeProvider はこの結果に従うだけで判定はしない）。
 *
 * - **OS 由来の不一致は無反応で clamp する**。「light テーマを作らない」は消費者の意図的な設計判断で、
 *   OS が light なのは環境の事実にすぎない。ここで警告を出すと light 設定のユーザ全員に出てしまう
 *   （CSS の `color-scheme` / Expo の `userInterfaceStyle` も黙って clamp する）。
 * - **`forcedMode` との不一致は報告する**。宣言同士の矛盾＝呼び出し側の間違いなので violation を返す。
 *   ただし throw はしない（clamp して描き続ける）。厳格に落としたいテストや compiler が
 *   violation を error に昇格させる側の責務にする。
 */
export function resolveMode(
  colorScheme: ColorSchemeCapability,
  forcedMode: ThemeMode | undefined,
  systemMode: ThemeMode,
): { mode: ThemeMode; violation?: ThemeModeViolation } {
  const supported = supportedModes(colorScheme);
  const requested = forcedMode ?? systemMode;
  if (supported.includes(requested)) return { mode: requested };

  const resolved = supported[0];
  // OS 由来の clamp は「事故」ではないので violation を立てない。
  if (forcedMode === undefined) return { mode: resolved };
  return {
    mode: resolved,
    violation: { kind: "forced-mode-unsupported", requested, resolved, colorScheme },
  };
}

// ---------------------------------------------------------------------------
// validation（開発時のみ。純関数なのでテストからも直接呼べる）
// ---------------------------------------------------------------------------

function missingKeys(target: object | undefined, keys: readonly (string | number)[]): string[] {
  if (target === null || typeof target !== "object") return [...keys].map(String);
  return keys.filter((key) => !Object.prototype.hasOwnProperty.call(target, key)).map(String);
}

/**
 * theme の形を検査して問題の一覧を返す（空配列 ＝ 問題なし）。
 *
 * 「宣言した mode の色が欠けている」「as キャストでキーが抜けた」といった、型を通り抜けた欠落を拾う。
 * `defineTheme()` が dev で1回だけ呼ぶ。**render 中に呼ばないこと**（theme-ui は Provider の
 * render body で毎レンダー全色を再帰走査して性能を落とした前例がある）。
 */
export function validateTheme(options: ThemeOptions): string[] {
  const problems: string[] = [];
  const where = options.id ? `theme "${options.id}"` : "theme";

  const semantic = options.color?.semantic;
  if (semantic === null || typeof semantic !== "object") {
    problems.push(`${where}: color.semantic が無い`);
    return problems;
  }

  const unknownModes = Object.keys(semantic).filter(
    (key) => !(MODES as string[]).includes(key),
  );
  for (const key of unknownModes) {
    problems.push(`${where}: color.semantic の未知のキー "${key}"（light / dark のみ）`);
  }

  const modes = declaredModes(semantic);
  if (modes.length === 0) {
    problems.push(`${where}: color.semantic に light / dark のどちらも無い`);
  }
  for (const mode of modes) {
    const missing = missingKeys(semantic[mode], SEMANTIC_KEYS);
    if (missing.length > 0) {
      problems.push(`${where}: color.semantic.${mode} に欠けている色 — ${missing.join(", ")}`);
    }
  }

  const groups: [string, object | undefined, readonly string[]][] = [
    ["color.primary", options.color?.primary, PRIMARY_KEYS],
    ["spacing", options.spacing, SPACING_KEYS],
    ["radius", options.radius, RADIUS_KEYS],
    ["elevation", options.elevation, ELEVATION_KEYS],
    ["typography.fontSize", options.typography?.fontSize, FONT_SIZE_KEYS],
    ["typography.fontWeight", options.typography?.fontWeight, FONT_WEIGHT_KEYS],
    ["color.status", options.color?.status, STATUS_KINDS],
  ];
  for (const [label, target, keys] of groups) {
    const missing = missingKeys(target, keys);
    if (missing.length > 0) {
      problems.push(`${where}: ${label} に欠けているキー — ${missing.join(", ")}`);
    }
  }

  const status = options.color?.status;
  if (status !== null && typeof status === "object") {
    for (const kind of STATUS_KINDS) {
      if (!Object.prototype.hasOwnProperty.call(status, kind)) continue;
      const missing = missingKeys(status[kind], STATUS_COLOR_KEYS);
      if (missing.length > 0) {
        problems.push(`${where}: color.status.${kind} に欠けているキー — ${missing.join(", ")}`);
      }
    }
  }

  return problems;
}

// ---------------------------------------------------------------------------
// defineTheme
// ---------------------------------------------------------------------------

/**
 * 持っていない mode に「読んだら落ちる」getter を置く（**dev / production 共通**）。
 *
 * 値は捏造しない（他 mode のコピーもゼロ埋めもしない）。放置して `undefined` にすると
 * 実際に踏んだとき `Cannot read properties of undefined (reading 'bg-page')` としか出ず、
 * どの theme のどの mode の話か分からない。**落ちること自体は getter の有無に関わらず同じ**なので、
 * 原因を名指しするメッセージを本番のクラッシュレポートにも残す方を選ぶ。
 *
 * **non-enumerable にするのが要点**: spread / `Object.keys` / `JSON.stringify` /
 * React DevTools の context 列挙では踏まれない。`theme.color.semantic.light` と
 * 明示的に書いたときだけ落ちる。
 *
 * ホットパス（全 style resolver が引く `semantic[mode]`）にアクセサを混ぜることになるが、
 * getter が付くのは **単一 colorScheme の theme を注入した場合だけ**。既定の light-dark theme
 * には1つも付かないので、既存消費者の実行経路は変わらない。
 */
function installMissingModeGuards(
  semantic: Partial<Record<ThemeMode, SemanticColors>>,
  where: string,
  colorScheme: ColorSchemeCapability,
): void {
  for (const mode of MODES) {
    if (Object.prototype.hasOwnProperty.call(semantic, mode)) continue;
    Object.defineProperty(semantic, mode, {
      enumerable: false,
      configurable: true,
      get(): never {
        throw new Error(
          `melta: ${where} は colorScheme=${colorScheme} なので color.semantic.${mode} を持たない。` +
            `現在の mode の色は useTheme().colors（または color.semantic[mode]）から取ること。`,
        );
      },
    });
  }
}

/** dev 限定の再帰 freeze。enumerable なキーだけ辿るので上の guard getter は踏まない。 */
function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== "object") return;
  if (Object.isFrozen(value)) return;
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
}

/**
 * ブランド theme を組み立てる。`ThemeProvider` の `theme` prop に渡せるのはこの戻り値だけ。
 *
 * **module スコープで1回だけ呼ぶこと**（render の中で呼ぶと毎レンダー新しい参照になり、
 * context の consumer が全部再レンダーする）。styled-components / Emotion が docs で
 * 同じことを求めているのと同じ理由。
 *
 * dev では validateTheme を1回通し、問題があれば throw する（構造が壊れた theme は
 * 後段で必ず事故になるので早く落とす）。production では検査ごと省く。
 */
export function defineTheme(options: ThemeOptions): ResolvedNativeTheme {
  if (isDev) {
    const problems = validateTheme(options);
    if (problems.length > 0) {
      throw new Error(`melta: theme の形が不正。\n- ${problems.join("\n- ")}`);
    }
  }

  const semantic: Partial<Record<ThemeMode, SemanticColors>> = { ...options.color.semantic };
  const colorScheme = deriveColorScheme(semantic);

  const theme: ResolvedNativeTheme = {
    ...options,
    color: { ...options.color, semantic },
    capabilities: { colorScheme },
    $$melta: true,
  };

  // guard は本番でも置く（値は捏造せず、踏んだときのメッセージだけ良くする）。
  // freeze より先に置くこと（freeze 後は defineProperty できない）。
  installMissingModeGuards(semantic, options.id ? `theme "${options.id}"` : "theme", colorScheme);

  if (isDev) deepFreeze(theme);

  return theme;
}
