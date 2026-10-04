// Region picker (FR-016, CRI-88, ADR 0014): the phone's region first, then
// every region TMDB has streaming data for. Visual design comes later.

import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { useRegion } from "@/hooks/useRegion";
import { REGIONS, regionName } from "@/logic/regions";
import { accent } from "@/theme/color";

const DEVICE = "device";

export default function RegionScreen() {
  const router = useRouter();
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
      label: option.name,
      selected: isManual && option.code === region,
    })),
  ];

  return (
    <FlatList
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
  },
});
