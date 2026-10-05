// The header of Show detail inside the Search sheet (PRD 5.6): only a back
// arrow to Search, at a fixed height. The native header settled its height
// a moment after opening inside the sheet, which made the view jump; this
// one is the same height from the first frame, whatever it shows.

import { Pressable, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";

import { t } from "@/theme/tokens";

// The iOS navigation bar's height.
export const SHEET_HEADER_HEIGHT = 44;

export function SheetBackHeader() {
  const router = useRouter();
  return (
    <View style={styles.header} testID="sheet-back-header">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={12}
        style={styles.back}
        testID="sheet-back"
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
  );
}

const styles = StyleSheet.create({
  header: {
    height: SHEET_HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: t.space2,
    backgroundColor: t.bg,
  },
  back: {
    width: SHEET_HEADER_HEIGHT,
    height: SHEET_HEADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
});
