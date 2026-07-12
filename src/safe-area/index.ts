/**
 * melta-app/safe-area — react-native-safe-area-context adapter の subpath エントリ。
 *
 * 本体エントリ（"melta-app"）から分離している理由: このファイルだけが
 * react-native-safe-area-context（optional peerDependency）に依存するため。
 * Metro は import を静的に解決するので、本体エントリに含めると未 install の
 * 利用者がバンドルできなくなる（分離の前例 = melta-app/icons × react-native-svg）。
 *
 * 使い方: アプリの entry で一度呼ぶ（Screen の初回 render より前）。
 *
 *   import { enableSafeAreaContext } from "melta-app/safe-area";
 *   enableSafeAreaContext();
 *
 * これで Screen の SafeArea が react-native-safe-area-context の SafeAreaView に
 * 切り替わり、RN core SafeAreaView の deprecation 警告（RN 0.85+）も出なくなる。
 */

import { SafeAreaView } from "react-native-safe-area-context";
import { setSafeAreaView } from "../components/safe-area-registry";

/** Screen の SafeArea を react-native-safe-area-context に切り替える。 */
export function enableSafeAreaContext(): void {
  setSafeAreaView(SafeAreaView);
}
