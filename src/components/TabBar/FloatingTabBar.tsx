// The floating tab bar (CRI-133), Instagram style: a frosted pill centred
// above the content, so the content scrolls visibly behind it. Icon-only
// tabs; the active one is its icon filled on a wide light-grey pill.
// Everything is neutral white and grey, no accent.
//
// Each tab's icon, title (its accessibility label) and test ID come from
// its screen's options in app/(tabs)/_layout.tsx. Presses follow React
// Navigation's own tab bar: a tabPress event first, so a tap on the active
// tab still scrolls its view to the top (Home to the hero) or goes back to
// its start, then the switch.

import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import type { Tabs } from "expo-router";

import {
  ACTIVE_TAB_PADDING_VERTICAL,
  FLOATING_TAB_BAR_BOTTOM,
} from "@/logic/tab-bar";
import { t } from "@/theme/tokens";

// The props a custom tab bar receives, taken from Tabs' public props
// rather than expo-router's internal React Navigation types.
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.bar} testID="tab-bar">
        {/* The blur first, the fill over it: a fill under the blur would be
            blurred into a solid colour (as in ImageControlMaterial). */}
        <BlurView
          intensity={t.tabBarBlur}
          tint="systemUltraThinMaterialDark"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.fill]} />

        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const active = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!active && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: "tabLongPress", target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityLabel={options.title}
              accessibilityState={{ selected: active }}
              onPress={onPress}
              onLongPress={onLongPress}
              testID={options.tabBarButtonTestID}
              style={[styles.tab, active && styles.tabActive]}
            >
              {options.tabBarIcon?.({
                focused: active,
                color: t.ink,
                size: t.tabBarIconSize,
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: FLOATING_TAB_BAR_BOTTOM,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: t.tabBarGap,
    padding: t.tabBarPadding,
    borderRadius: t.radiusPill,
    borderWidth: t.tabBarEdgeWidth,
    borderColor: t.tabBarEdge,
    // Clips the blur to the pill.
    overflow: "hidden",
  },
  fill: {
    backgroundColor: t.tabBarBackground,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: t.radiusPill,
  },
  // Noticeably wider than tall.
  tabActive: {
    paddingVertical: ACTIVE_TAB_PADDING_VERTICAL,
    paddingHorizontal: 23,
    backgroundColor: t.tabBarActivePill,
  },
});
