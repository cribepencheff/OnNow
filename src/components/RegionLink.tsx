// The way to the region picker (FR-016, CRI-88, ADR 0014): a quiet line in
// the Shows footer until there is a settings view (FR-019).

import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

import { useRegion } from "@/hooks/useRegion";
import { regionName } from "@/logic/regions";
import { t, type } from "@/theme/tokens";

export function RegionLink() {
  const router = useRouter();
  const { region } = useRegion();
  if (!region) {
    return null;
  }
  const label = `Streaming region: ${regionName(region)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Changes the region used for streaming services"
      onPress={() => router.push("/region")}
      hitSlop={8}
    >
      <Text style={styles.line}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: {
    ...type.meta,
    textAlign: "center",
    color: t.inkMuted,
    paddingHorizontal: t.space4,
    paddingTop: t.space6,
    paddingBottom: t.space2,
  },
});
