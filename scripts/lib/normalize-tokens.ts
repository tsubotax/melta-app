/**
 * normalize-tokens — melta-contracts の tokens.json(web 形式)を
 * React Native 向け NativeTheme に変換する純粋関数群。
 *
 * 副作用なし・I/O なし（fs アクセスは generate-native-theme.ts 側）。
 * 変換規則は requirements-melta-app.md §4 に対応する。テストは normalize-tokens.test.ts。
 */

import type {
  ElevationKey,
  FontSizeEntry,
  FontSizeKey,
  FontWeightKey,
  FontWeightValue,
  NativeTheme,
  PrimaryScale,
  RadiusKey,
  SemanticColors,
  ShadowStyle,
  SpacingKey,
  StatusColors,
} from "../../src/theme/types";
import { DEFAULT_MIN_LINE_HEIGHT_RATIO, clampLineHeight } from "../../src/theme/line-height";

/**
 * Android elevation は CSS box-shadow の blur/offset とは別概念で、(offsetY+blur) からの自動算出は
 * overlay が最大値付近に跳ねるなど不正確。MVP は token ごとの手動 mapping table で持ち、実機で微調整する。
 */
const ANDROID_ELEVATION: Record<ElevationKey, number> = {
  none: 0,
  sm: 2,
  md: 5,
  overlay: 10,
};

// --- tokens.json の最小 raw 型（必要な形だけ緩く受ける） ---

interface ValueEntry {
  value: string;
}
interface FontSizeRaw {
  px: number;
  lineHeight: string; // 比率文字列 "1.4" 等
}
interface FontWeightRaw {
  value: number;
}
interface RadiusRaw {
  px: number;
}

export interface RawTokens {
  /** tokens.json 自身の version（生成 banner に使う） */
  version?: string;
  color: {
    primary: Record<string, ValueEntry>;
    body: ValueEntry;
    semantic: { light: Record<string, ValueEntry>; dark: Record<string, ValueEntry> };
    status: Record<string, Record<string, ValueEntry>>;
  };
  typography: {
    fontFamily: { sans: { value: string[] }; mono: { value: string[] } };
    fontSize: Record<string, FontSizeRaw>;
    fontWeight: Record<string, FontWeightRaw>;
    letterSpacing: { heading: ValueEntry; body: ValueEntry };
  };
  spacing: Record<string, ValueEntry>;
  elevation: Record<string, ValueEntry>;
  radius: Record<string, RadiusRaw>;
  motion: {
    duration: Record<string, ValueEntry>;
    easing: Record<string, ValueEntry>;
  };
  zIndex: Record<string, { value: number }>;
}

// --- primitive 変換ヘルパ ---

/** "4px" / "0.25rem" / "150ms" 等から先頭の数値を取り出す。 */
export function toNumber(raw: string): number {
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) throw new Error(`数値化できない値: "${raw}"`);
  return n;
}

/** "rgba(0,0,0,0.05)" / "#000" を { color, opacity } に分解。 */
export function parseColor(raw: string): { color: string; opacity: number } {
  const t = raw.trim();
  const m = t.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(",").map((s) => Number.parseFloat(s.trim()));
    const [r, g, b, a] = parts;
    return { color: `rgb(${r}, ${g}, ${b})`, opacity: a ?? 1 };
  }
  return { color: t, opacity: 1 }; // hex はそのまま、opacity は別管理
}

/**
 * CSS box-shadow → iOS 向け shadow props（ShadowStyle）。
 * 例 "0 1px 2px rgba(0,0,0,0.05)" → { shadowColor, shadowOffset, shadowOpacity, shadowRadius }。
 * Android の elevation はここでは決めず、ANDROID_ELEVATION の手動 mapping で別途付与する。
 */
export function parseBoxShadow(raw: string): ShadowStyle {
  if (!raw || raw.trim() === "none") {
    return {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    };
  }
  const m = raw
    .trim()
    .match(/^(-?[\d.]+\w*)\s+(-?[\d.]+\w*)\s+(-?[\d.]+\w*)\s+(.+)$/);
  if (!m) throw new Error(`対応していない box-shadow 形式: "${raw}"`);
  const offsetX = toNumber(m[1]);
  const offsetY = toNumber(m[2]);
  const blur = toNumber(m[3]);
  const { color, opacity } = parseColor(m[4]);
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
  };
}

/** "cubic-bezier(0.4, 0, 0.2, 1)" → [0.4, 0, 0.2, 1]。 */
export function parseCubicBezier(raw: string): [number, number, number, number] {
  const m = raw.match(/cubic-bezier\(([^)]+)\)/);
  if (!m) throw new Error(`cubic-bezier 以外の easing 未対応: "${raw}"`);
  const parts = m[1].split(",").map((s) => Number.parseFloat(s.trim()));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`cubic-bezier の引数が不正: "${raw}"`);
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

// --- セクション変換 ---

function mapValues(rec: Record<string, ValueEntry>): Record<string, string> {
  return Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v.value]));
}

function normalizeStatus(rec: Record<string, ValueEntry>): StatusColors {
  return {
    base: rec.base.value,
    subtleLight: rec["subtle-light"].value,
    textLight: rec["text-light"].value,
    subtleDark: rec["subtle-dark"].value,
    textDark: rec["text-dark"].value,
  };
}

/** tokens.json(raw) → NativeTheme。 */
export function normalizeTokens(raw: RawTokens): NativeTheme {
  const fontSize = {} as Record<FontSizeKey, FontSizeEntry>;
  for (const [key, entry] of Object.entries(raw.typography.fontSize)) {
    // 宣言比率（web 共有の意匠値）は従来どおり四捨五入で px 化し、そのうえで
    // 安全下限（DEFAULT_MIN_LINE_HEIGHT_RATIO、切り上げ）でクランプする。
    // web の contracts には手を入れない: この clip は RN Android 固有の機序（line-height.ts 参照）
    // なので、下限は native 正規化のポリシーとしてここで持つ。
    fontSize[key as FontSizeKey] = {
      fontSize: entry.px,
      lineHeight: clampLineHeight(
        entry.px,
        Math.round(entry.px * Number.parseFloat(entry.lineHeight)),
        DEFAULT_MIN_LINE_HEIGHT_RATIO,
      ),
    };
  }

  const fontWeight = {} as Record<FontWeightKey, FontWeightValue>;
  for (const [key, entry] of Object.entries(raw.typography.fontWeight)) {
    fontWeight[key as FontWeightKey] = String(entry.value) as FontWeightValue;
  }

  const spacing = {} as Record<SpacingKey, number>;
  for (const [key, entry] of Object.entries(raw.spacing)) {
    spacing[key as SpacingKey] = toNumber(entry.value);
  }

  const radius = {} as Record<RadiusKey, number>;
  for (const [key, entry] of Object.entries(raw.radius)) {
    radius[key as RadiusKey] = entry.px;
  }

  return {
    color: {
      primary: mapValues(raw.color.primary) as Record<PrimaryScale, string>,
      body: raw.color.body.value,
      semantic: {
        light: mapValues(raw.color.semantic.light) as unknown as SemanticColors,
        dark: mapValues(raw.color.semantic.dark) as unknown as SemanticColors,
      },
      status: {
        success: normalizeStatus(raw.color.status.success),
        warning: normalizeStatus(raw.color.status.warning),
        danger: normalizeStatus(raw.color.status.danger),
      },
    },
    typography: {
      // 初期は system default のため未指定（embed しない）。理由は types.ts の fontFamily コメント参照。
      fontFamily: {},
      fontSize,
      fontWeight,
      // em ratio をそのまま数値で保持（理由は types.ts の letterSpacingRatio コメント参照）
      letterSpacingRatio: {
        heading: toNumber(raw.typography.letterSpacing.heading.value),
        body: toNumber(raw.typography.letterSpacing.body.value),
      },
      // 既定 theme が前提にしているフォント環境（= system の Noto CJK JP）の下限を明示的に焼く。
      // 「なぜこの lineHeight なのか」の根拠を theme 自身が持つため（値の出どころは line-height.ts）。
      minLineHeightRatio: DEFAULT_MIN_LINE_HEIGHT_RATIO,
    },
    spacing,
    radius,
    elevation: {
      none: { ...parseBoxShadow(raw.elevation.none.value), elevation: ANDROID_ELEVATION.none },
      sm: { ...parseBoxShadow(raw.elevation.sm.value), elevation: ANDROID_ELEVATION.sm },
      md: { ...parseBoxShadow(raw.elevation.md.value), elevation: ANDROID_ELEVATION.md },
      overlay: {
        ...parseBoxShadow(raw.elevation.overlay.value),
        elevation: ANDROID_ELEVATION.overlay,
      },
    },
    motion: {
      duration: {
        fast: toNumber(raw.motion.duration.fast.value),
        normal: toNumber(raw.motion.duration.normal.value),
        slow: toNumber(raw.motion.duration.slow.value),
      },
      easing: {
        default: parseCubicBezier(raw.motion.easing.default.value),
        in: parseCubicBezier(raw.motion.easing.in.value),
        out: parseCubicBezier(raw.motion.easing.out.value),
      },
    },
    zIndex: {
      base: raw.zIndex.base.value,
      dropdown: raw.zIndex.dropdown.value,
      sticky: raw.zIndex.sticky.value,
      overlay: raw.zIndex.overlay.value,
      modal: raw.zIndex.modal.value,
    },
  };
}
