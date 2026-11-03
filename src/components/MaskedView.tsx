// @react-native-masked-view/masked-view, re-exported with working types.
// Its own type file builds on React Native's NativeMethods type, which
// React Native 0.88 (Expo SDK 58) no longer exports, so TypeScript stops
// accepting it as a JSX component. The component itself is unchanged and
// still the version Expo SDK 58 expects, so this only restates its props.
// Remove it once the package ships types that work with React Native 0.88.

import RNMaskedView from "@react-native-masked-view/masked-view";
import type { ComponentType, ReactElement } from "react";
import type { ViewProps } from "react-native";

type MaskedViewProps = ViewProps & {
  maskElement: ReactElement;
  androidRenderingMode?: "software" | "hardware";
};

export const MaskedView =
  RNMaskedView as unknown as ComponentType<MaskedViewProps>;
