// The header of Show detail inside the Search tab (PRD 5.6, CRI-133): only
// a back arrow to Search, in a bar of fixed height under the status bar.
// It was made for the Search sheet, where the native header settled its
// height a moment after opening and made the view jump; it is kept so the
// header is the same from the first frame.

import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { t } from "@/theme/tokens";

// The iOS navigation bar's height.
export const BACK_HEADER_HEIGHT = 44;

export function BackHeader() {
  const router = useGuardedRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.bar} testID="back-header">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.back}
          testID="back-header-back"
        >
          <SymbolView
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            tintColor={t.ink}
            size={20}
            weight="semibold"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: t.bg,
  },
  bar: {
    height: BACK_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space2,
  },
  back: {
    width: BACK_HEADER_HEIGHT,
    height: BACK_HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
