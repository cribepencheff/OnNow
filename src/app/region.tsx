// Region picker (FR-016, CRI-88, ADR 0014): the phone's region first, then
// every region TMDB has streaming data for. Visual design comes later.

import { SymbolView } from "expo-symbols";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { useRegion } from "@/hooks/useRegion";
import { REGIONS, regionName } from "@/logic/regions";
import { accent } from "@/theme/color";
import { t, type } from "@/theme/tokens";

const DEVICE = "device";

export default function RegionScreen() {
  const router = useGuardedRouter();
  const { region, detected, isManual, setRegion, followDeviceRegion } =
    useRegion();

  const options = [
    {
      key: DEVICE,
      label: `Phone's region (${regionName(detected)})`,
      selected: !isManual,
    },
    ...REGIONS.map((option) => ({
      key: option.code,
      label: regionName(option.code),
      selected: isManual && option.code === region,
    })).sort((a, b) => a.label.localeCompare(b.label, "en")),
  ];

  return (
    <FlatList
      style={styles.list}
      data={options}
      keyExtractor={(option) => option.key}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: item.selected }}
          onPress={() => {
            if (item.key === DEVICE) {
              followDeviceRegion();
            } else {
              setRegion(item.key);
            }
            router.back();
          }}
          style={styles.row}
        >
          <Text style={styles.label}>{item.label}</Text>
          {item.selected && (
            <View>
              <SymbolView
                name={{ ios: "checkmark", android: "check", web: "check" }}
                tintColor={accent}
                size={16}
              />
            </View>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: t.bg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: t.space4,
    paddingVertical: 12,
  },
  label: {
    ...type.body,
    color: t.ink,
  },
});
