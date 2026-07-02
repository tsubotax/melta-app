/**
 * melta-app/icons — Icon の subpath エントリ。
 *
 * 本体エントリ（"melta-app"）から分離している理由: Icon だけが react-native-svg
 * （optional peerDependency）に依存するため。Metro は import を静的に解決するので、
 * 本体エントリに Icon を含めると react-native-svg 未 install の利用者がバンドルできなくなる。
 * この subpath を import する利用者だけが react-native-svg を要求される。
 */

export { Icon } from "./Icon";
export { GLYPHS, ICON_NAMES } from "./glyphs";
export type { IconName, Glyph } from "./glyphs";
