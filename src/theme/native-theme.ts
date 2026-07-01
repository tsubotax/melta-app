// ⚠️ 自動生成ファイル — 手で編集しないこと。
// 生成元: scripts/generate-native-theme.ts（入力 melta-contracts tokens.json）
// tokens version: 1.0.0

import type { NativeTheme } from "./types";

export const nativeTheme: NativeTheme = {
  "color": {
    "primary": {
      "50": "#f0f5ff",
      "100": "#dde8ff",
      "200": "#c0d4ff",
      "300": "#95b6ff",
      "400": "#6492ff",
      "500": "#2b70ef",
      "600": "#2250df",
      "700": "#1a40b5",
      "800": "#13318d",
      "900": "#0e266a",
      "950": "#07194e"
    },
    "body": "#3d4b5f",
    "semantic": {
      "light": {
        "bg-page": "#f9fafb",
        "bg-page-alt": "#f3f4f6",
        "bg-surface": "#ffffff",
        "bg-surface-alt": "#f9fafb",
        "text-heading": "#0f172a",
        "text-default": "#3d4b5f",
        "text-muted": "#64748b",
        "border-default": "#e2e8f0",
        "border-strong": "#cbd5e1",
        "input-bg": "#ffffff",
        "input-border": "#cbd5e1",
        "text-on-accent": "#ffffff"
      },
      "dark": {
        "bg-page": "#0f172a",
        "bg-page-alt": "#1e293b",
        "bg-surface": "#1e293b",
        "bg-surface-alt": "#0f172a",
        "text-heading": "#f1f5f9",
        "text-default": "#cbd5e1",
        "text-muted": "#94a3b8",
        "border-default": "#334155",
        "border-strong": "#475569",
        "input-bg": "#0f172a",
        "input-border": "#475569",
        "text-on-accent": "#ffffff"
      }
    },
    "status": {
      "success": {
        "base": "#059669",
        "subtleLight": "#ecfdf5",
        "textLight": "#047857",
        "subtleDark": "rgba(5,150,105,0.12)",
        "textDark": "#6ee7b7"
      },
      "warning": {
        "base": "#d97706",
        "subtleLight": "#fffbeb",
        "textLight": "#b45309",
        "subtleDark": "rgba(217,119,6,0.12)",
        "textDark": "#fcd34d"
      },
      "danger": {
        "base": "#ef4444",
        "subtleLight": "#fef2f2",
        "textLight": "#dc2626",
        "subtleDark": "rgba(239,68,68,0.12)",
        "textDark": "#fca5a5"
      }
    }
  },
  "typography": {
    "fontFamily": {},
    "fontSize": {
      "xs": {
        "fontSize": 13,
        "lineHeight": 18
      },
      "sm": {
        "fontSize": 15,
        "lineHeight": 26
      },
      "base": {
        "fontSize": 18,
        "lineHeight": 36
      },
      "lg": {
        "fontSize": 20,
        "lineHeight": 30
      },
      "xl": {
        "fontSize": 22,
        "lineHeight": 31
      },
      "2xl": {
        "fontSize": 26,
        "lineHeight": 36
      },
      "3xl": {
        "fontSize": 32,
        "lineHeight": 45
      }
    },
    "fontWeight": {
      "normal": "400",
      "medium": "500",
      "semibold": "600",
      "bold": "700"
    },
    "letterSpacingRatio": {
      "heading": 0.01,
      "body": 0.02
    }
  },
  "spacing": {
    "1": 4,
    "2": 8,
    "3": 12,
    "4": 16,
    "5": 20,
    "6": 24,
    "8": 32,
    "10": 40,
    "12": 48,
    "14": 56,
    "16": 64
  },
  "radius": {
    "sm": 4,
    "md": 8,
    "lg": 12,
    "full": 9999
  },
  "elevation": {
    "none": {
      "shadowColor": "#000000",
      "shadowOffset": {
        "width": 0,
        "height": 0
      },
      "shadowOpacity": 0,
      "shadowRadius": 0,
      "elevation": 0
    },
    "sm": {
      "shadowColor": "rgb(0, 0, 0)",
      "shadowOffset": {
        "width": 0,
        "height": 1
      },
      "shadowOpacity": 0.05,
      "shadowRadius": 2,
      "elevation": 2
    },
    "md": {
      "shadowColor": "rgb(0, 0, 0)",
      "shadowOffset": {
        "width": 0,
        "height": 4
      },
      "shadowOpacity": 0.1,
      "shadowRadius": 6,
      "elevation": 5
    },
    "overlay": {
      "shadowColor": "rgb(0, 0, 0)",
      "shadowOffset": {
        "width": 0,
        "height": 20
      },
      "shadowOpacity": 0.1,
      "shadowRadius": 25,
      "elevation": 10
    }
  },
  "motion": {
    "duration": {
      "fast": 150,
      "normal": 200,
      "slow": 300
    },
    "easing": {
      "default": [
        0.4,
        0,
        0.2,
        1
      ],
      "in": [
        0.4,
        0,
        1,
        1
      ],
      "out": [
        0,
        0,
        0.2,
        1
      ]
    }
  },
  "zIndex": {
    "base": 0,
    "dropdown": 20,
    "sticky": 30,
    "overlay": 40,
    "modal": 50
  }
};
