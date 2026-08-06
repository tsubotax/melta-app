/**
 * tap-target-conformance.test — 全操作要素の **実効タップ標的 ≥ 44pt** を機械照合する。
 *
 * 契約側の根拠は melta-contracts の `A11Y_MIN_TAP_TARGET_44`（rules.json）:
 * 「すべての操作要素は実効タップ標的 44pt を下回らない。視覚寸法は契約どおり据え置き、
 * 当たり判定だけを広げる。app は視覚 24pt + hitSlop 10 の正典パターンか minHeight で下限を保証する
 * （height 固定は fontScale でクリップするので使わない）」。
 * detector は `manual` なので web 側の lint では検知できない ＝ **app 側はここが唯一の自動検知**。
 *
 * ## 照合の作り
 *
 * 実効寸法 = **視覚寸法（styles resolver の出力）+ hitSlop（styles モジュールの export 定数）**。
 * どちらもテストに数字を書かず実装から引く（二重記述すると片方だけ直して drift する）。
 *
 * fail-open を避けるための決め:
 * - hitSlop 定数は各 `*.styles.ts` に **literal** で置く規約（`requiredHitSlop()` から自動導出しない）。
 *   導出にすると視覚寸法を変えたとき hitSlop も一緒に動き、この照合が構造的に必ず通ってしまう。
 * - 定数を export しただけで component が使っていない、という抜けを塞ぐため、
 *   実装ファイルが定数名を参照していることも併せて見る。
 * - 幅が可変（テキスト幅で決まる）要素は `width: null` として縦だけ見る。null にするには
 *   理由の記述を必須にしてある（黙って検査を外せない）。
 *
 * ## 横方向 hitSlop の上限（隣接要素との重なり）
 *
 * hitSlop は視覚境界の外へ当たり判定を広げるので、隣り合う操作要素同士では**重なり得る**。
 * 重なった帯では後から描画された側が勝ち、押し違いが起きる（Toast の action と × で実際に起きていた）。
 * そのため横方向の hitSlop は **隣接 gap の 1/2 以下**に抑える（AGENTS.md の resolver 規約）。
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { MIN_TAP_TARGET } from "../../src/a11y/tap-target.js";
import { nativeTheme } from "../../src/theme/native-theme.js";
import { resolveTextShape } from "../../src/primitives/text.styles.js";
import {
  BUTTON_SIZE_SPEC,
  BUTTON_VERTICAL_HIT_SLOP,
  resolveButtonHitSlop,
  type ButtonSize,
} from "../../src/primitives/button.styles.js";
import {
  TAG_FILTER_CHIP_VERTICAL_HIT_SLOP,
  TAG_REMOVE_TAP_TARGET,
  resolveTagFilterChipVisualHeight,
} from "../../src/primitives/tag.styles.js";
import { MODAL_CLOSE_TAP_TARGET } from "../../src/components/modal.styles.js";
import { ALERT_CLOSE_TAP_TARGET } from "../../src/components/alert.styles.js";
import { TOAST_SPEC, TOAST_TAP_TARGET } from "../../src/components/toast.styles.js";
import { RADIO_SPEC } from "../../src/components/radio.styles.js";
import { TOGGLE_SIZE_SPEC, TOGGLE_VERTICAL_HIT_SLOP } from "../../src/components/toggle.styles.js";
import { CHECKBOX_SPEC } from "../../src/components/checkbox.styles.js";

const here = dirname(fileURLToPath(import.meta.url)); // scripts/lib
const srcRoot = resolve(here, "../../src");

/** RN の hitSlop（省略した辺は 0 とみなす）。 */
interface Slop {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}

interface TapTarget {
  /** 表示名（失敗メッセージ用）。 */
  name: string;
  /** hitSlop / 寸法定数を実際に使っている実装ファイル（src からの相対）。 */
  source: string;
  /** 実装ファイルに現れるはずの定数名（export しただけで使っていない事故を塞ぐ）。 */
  usesConstants: string[];
  /** 視覚高さ（resolver / SPEC 由来）。 */
  height: number;
  /** 視覚幅。テキスト幅で決まり静的に確定できない要素は null（reason 必須）。 */
  width: number | null;
  /** width を null にした理由（null のとき必須）。 */
  widthUnknownReason?: string;
  hitSlop: Slop;
  /**
   * 横に隣接する別の操作要素との間隔。指定した場合、横 hitSlop が gap/2 を超えないことを検査する。
   */
  adjacentGap?: number;
  note: string;
}

const theme = nativeTheme;
/** Text primitive が実際に描く行の高さ（クランプ後）。可変寸法の要素の視覚高さはこれで決まる。 */
const lineHeightOf = (variant: Parameters<typeof resolveTextShape>[1]): number =>
  resolveTextShape(theme, variant, "body").lineHeight;

const buttonSizes: ButtonSize[] = ["small", "medium", "large"];

const TARGETS: TapTarget[] = [
  // --- Button: labeled は minHeight + 縦 hitSlop、iconOnly は正方形 + 四方 hitSlop ---
  ...buttonSizes.map<TapTarget>((size) => ({
    name: `Button ${size}（labeled）`,
    source: "primitives/Button.tsx",
    usesConstants: ["resolveButtonHitSlop", "BUTTON_SIZE_SPEC"],
    height: BUTTON_SIZE_SPEC[size].minHeight,
    width: null,
    widthUnknownReason: "label のテキスト幅 + paddingHorizontal で決まる（横は元々十分広い）",
    hitSlop: resolveButtonHitSlop(size, false) ?? { top: 0, bottom: 0 },
    note: "横 hitSlop は付けない — Row gap 0 で隣接した Button 同士の当たり判定が重なるため",
  })),
  ...buttonSizes.map<TapTarget>((size) => ({
    name: `Button ${size}（iconOnly）`,
    source: "primitives/Button.tsx",
    usesConstants: ["resolveButtonHitSlop", "BUTTON_SIZE_SPEC"],
    height: BUTTON_SIZE_SPEC[size].iconBox,
    width: BUTTON_SIZE_SPEC[size].iconBox,
    hitSlop: resolveButtonHitSlop(size, true) ?? { top: 0, bottom: 0 },
    note: "幅も 32/40 と狭い正方形なので横にも同値を付ける",
  })),

  // --- Tag ---
  {
    name: "Tag filter-chip（押せる chip 本体）",
    source: "primitives/Tag.tsx",
    usesConstants: ["TAG_FILTER_CHIP_VERTICAL_HIT_SLOP"],
    height: resolveTagFilterChipVisualHeight(theme),
    width: null,
    widthUnknownReason: "label のテキスト幅 + paddingHorizontal で決まる",
    hitSlop: {
      top: TAG_FILTER_CHIP_VERTICAL_HIT_SLOP,
      bottom: TAG_FILTER_CHIP_VERTICAL_HIT_SLOP,
    },
    note: "背景と枠を持つので minHeight ではなく hitSlop（伸ばすと他 variant と高さが揃わない）",
  },
  {
    name: "Tag removable の ×",
    source: "primitives/Tag.tsx",
    usesConstants: ["TAG_REMOVE_TAP_TARGET"],
    height: TAG_REMOVE_TAP_TARGET.minHeight,
    width: TAG_REMOVE_TAP_TARGET.minWidth,
    hitSlop: {
      top: TAG_REMOVE_TAP_TARGET.hitSlop,
      bottom: TAG_REMOVE_TAP_TARGET.hitSlop,
      left: TAG_REMOVE_TAP_TARGET.hitSlop,
      right: TAG_REMOVE_TAP_TARGET.hitSlop,
    },
    note: "正典パターン（視覚 24 + hitSlop 10）",
  },

  // --- Modal / Alert の × ---
  {
    name: "Modal の ×",
    source: "components/Modal.tsx",
    usesConstants: ["MODAL_CLOSE_TAP_TARGET"],
    height: MODAL_CLOSE_TAP_TARGET.minHeight,
    width: MODAL_CLOSE_TAP_TARGET.minWidth,
    hitSlop: {
      top: MODAL_CLOSE_TAP_TARGET.hitSlop,
      bottom: MODAL_CLOSE_TAP_TARGET.hitSlop,
      left: MODAL_CLOSE_TAP_TARGET.hitSlop,
      right: MODAL_CLOSE_TAP_TARGET.hitSlop,
    },
    note: "正典パターン。以前は箱の下限が無く、× のグリフ幅 + hitSlop 8 で実効 29pt しかなかった",
  },
  {
    name: "Alert の ×",
    source: "components/Alert.tsx",
    usesConstants: ["ALERT_CLOSE_TAP_TARGET"],
    height: ALERT_CLOSE_TAP_TARGET.minHeight,
    width: ALERT_CLOSE_TAP_TARGET.minWidth,
    hitSlop: {
      top: ALERT_CLOSE_TAP_TARGET.hitSlop,
      bottom: ALERT_CLOSE_TAP_TARGET.hitSlop,
      left: ALERT_CLOSE_TAP_TARGET.hitSlop,
      right: ALERT_CLOSE_TAP_TARGET.hitSlop,
    },
    note: "正典パターン。隣接する操作要素が無いので横も 10 のままでよい",
  },

  // --- Toast: 右端に action と × が gap 12 で並ぶ（横 hitSlop に上限が要る） ---
  {
    name: "Toast の ×",
    source: "components/Toast.tsx",
    usesConstants: ["TOAST_TAP_TARGET"],
    height: TOAST_TAP_TARGET.closeMinHeight,
    width: TOAST_TAP_TARGET.closeMinWidth,
    hitSlop: TOAST_TAP_TARGET.hitSlop,
    adjacentGap: theme.spacing[TOAST_SPEC.gap],
    note: "横 hitSlop を gap/2 に絞るぶん箱の幅下限を 32pt に広げて 44pt を確保",
  },
  {
    name: "Toast の action",
    source: "components/Toast.tsx",
    usesConstants: ["TOAST_TAP_TARGET"],
    height: lineHeightOf(TOAST_SPEC.messageFont),
    width: null,
    widthUnknownReason: "actionLabel のテキスト幅で決まる（実運用では 44pt を大きく超える）",
    hitSlop: TOAST_TAP_TARGET.hitSlop,
    adjacentGap: theme.spacing[TOAST_SPEC.gap],
    note: "× と隣接するので横 hitSlop は gap/2 まで",
  },

  // --- Radio / Toggle / Checkbox ---
  {
    name: "Radio の option 行",
    source: "components/Radio.tsx",
    usesConstants: ["RADIO_SPEC"],
    height: RADIO_SPEC.optionMinHeight,
    width: null,
    widthUnknownReason: "circle + gap + label の横幅（親の幅いっぱいまで伸びる）",
    hitSlop: { top: 0, bottom: 0 },
    note: "背景を持たないので hitSlop ではなく minHeight（視覚不変・隣接と重ならない）",
  },
  {
    name: "Toggle medium",
    source: "components/Toggle.tsx",
    usesConstants: ["TOGGLE_VERTICAL_HIT_SLOP"],
    height: TOGGLE_SIZE_SPEC.medium.trackHeight,
    width: TOGGLE_SIZE_SPEC.medium.trackWidth,
    hitSlop: { top: TOGGLE_VERTICAL_HIT_SLOP.medium, bottom: TOGGLE_VERTICAL_HIT_SLOP.medium },
    note: "label 無しのとき行の高さ = track の高さ。track は背景を持つので hitSlop で補う",
  },
  {
    name: "Toggle large",
    source: "components/Toggle.tsx",
    usesConstants: ["TOGGLE_VERTICAL_HIT_SLOP"],
    height: TOGGLE_SIZE_SPEC.large.trackHeight,
    width: TOGGLE_SIZE_SPEC.large.trackWidth,
    hitSlop: { top: TOGGLE_VERTICAL_HIT_SLOP.large, bottom: TOGGLE_VERTICAL_HIT_SLOP.large },
    note: "同上",
  },
  {
    name: "Checkbox の行",
    source: "components/Checkbox.tsx",
    usesConstants: ["CHECKBOX_SPEC"],
    height: CHECKBOX_SPEC.rowMinHeight,
    width: null,
    widthUnknownReason: "box + gap + label の横幅（親の幅いっぱいまで伸びる）",
    hitSlop: { top: 0, bottom: 0 },
    note: "背景を持たないので hitSlop ではなく minHeight（Radio と同じ手当て。旧 hitSlop 12 は縦積みで隣接行と重なっていた）",
  },
];

/** hitSlop を含めた実効寸法。 */
function effective(target: TapTarget): { vertical: number; horizontal: number | null } {
  const { top, bottom, left = 0, right = 0 } = target.hitSlop;
  return {
    vertical: target.height + top + bottom,
    horizontal: target.width === null ? null : target.width + left + right,
  };
}

test("実効タップ標的の表が空でない（照合が骨抜きになっていない）", () => {
  assert.ok(TARGETS.length >= 15, `操作要素の登録が少なすぎる: ${TARGETS.length} 件`);
  const names = TARGETS.map((t) => t.name);
  assert.deepEqual([...new Set(names)].length, names.length, "表に重複した name がある");
});

for (const target of TARGETS) {
  test(`${target.name}: 縦の実効タップ標的が ${MIN_TAP_TARGET}pt 以上`, () => {
    const { vertical } = effective(target);
    assert.ok(
      vertical >= MIN_TAP_TARGET,
      `実効 ${vertical}pt < ${MIN_TAP_TARGET}pt（視覚 ${target.height} + hitSlop ${target.hitSlop.top}/${target.hitSlop.bottom}）\n` +
        `  方針: ${target.note}`,
    );
  });

  test(`${target.name}: 横の実効タップ標的が ${MIN_TAP_TARGET}pt 以上`, () => {
    const { horizontal } = effective(target);
    if (horizontal === null) {
      // 検査を外すなら理由を書かせる（黙って null にできないようにする）
      assert.ok(
        (target.widthUnknownReason ?? "").length > 0,
        `${target.name}: width を null にするなら widthUnknownReason が要る`,
      );
      return;
    }
    assert.ok(
      horizontal >= MIN_TAP_TARGET,
      `実効 ${horizontal}pt < ${MIN_TAP_TARGET}pt（視覚 ${target.width} + hitSlop ${target.hitSlop.left ?? 0}/${target.hitSlop.right ?? 0}）\n` +
        `  方針: ${target.note}`,
    );
  });

  test(`${target.name}: 実装が hitSlop / 寸法の定数を実際に参照している`, () => {
    const source = readFileSync(resolve(srcRoot, target.source), "utf8");
    const missing = target.usesConstants.filter((name) => !source.includes(name));
    assert.deepEqual(
      missing,
      [],
      `${target.source} が ${missing.join(", ")} を参照していない\n` +
        "  定数を export しただけで component 側に適用し忘れると、この照合は数字の上では通ってしまう",
    );
  });
}

test("横方向の hitSlop は隣接する操作要素との gap の 1/2 を超えない（押し違いの防止）", () => {
  for (const target of TARGETS) {
    if (target.adjacentGap === undefined) continue;
    const limit = target.adjacentGap / 2;
    for (const side of ["left", "right"] as const) {
      const value = target.hitSlop[side] ?? 0;
      assert.ok(
        value <= limit,
        `${target.name}: ${side} hitSlop ${value} > gap ${target.adjacentGap} の 1/2（${limit}）\n` +
          "  隣接する操作要素と当たり判定が重なり、手前に描画された側が押し勝つ",
      );
    }
  }
});

test("hitSlop 定数は styles モジュール側にあり、component に生の数値が散らばっていない", () => {
  // hitSlop={10} のような literal 直書きを検知する（定数経由なら識別子が入る）。
  const componentFiles = [...new Set(TARGETS.map((t) => t.source))];
  const offenders: string[] = [];
  for (const file of componentFiles) {
    const source = readFileSync(resolve(srcRoot, file), "utf8");
    for (const match of source.matchAll(/hitSlop=\{\s*(\d)/g)) {
      offenders.push(`${file}: hitSlop={${match[1]}…}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `hitSlop に数値を直書きしている: ${offenders.join(", ")}\n` +
      "  値は *.styles.ts の定数に置き、根拠コメントと conformance を1箇所に集める",
  );
});
