// The floating tab bar (CRI-133), Instagram style: a frosted pill centred
// above the content, so the content scrolls visibly behind it. Icon-only
// tabs, all the same size; the active one is its icon filled (Search stays
// an outline) on a wide light-grey pill that slides from tab to tab on a
// spring. A pressed icon shrinks a little and springs back, the bar's only
// size change, and a tab change gives a light haptic. Everything is neutral
// white and grey, no accent.
//
// Each tab's icon, title (its accessibility label) and test ID come from
// its screen's options in app/(tabs)/_layout.tsx. Presses follow React
// Navigation's own tab bar: a tabPress event first, so a tap on the active
// tab still scrolls its view to the top (Home to the hero) or goes back to
// its start, then the switch.

import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutRectangle,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { FLOATING_TAB_BAR_BOTTOM } from "@/logic/tab-bar";
import { t } from "@/theme/tokens";

// The props a custom tab bar receives, taken from Tabs' public props
// rather than expo-router's internal React Navigation types.
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

type TabLayout = Pick<LayoutRectangle, "x" | "width">;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  // Each tab's place in the row, measured, so the pill knows where to go.
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  const activeLayout = layouts[state.routes[state.index].key];

  // The pill follows the active tab. Its first place is set without a
  // slide, so it does not fly in from the left edge on launch.
  const pillX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillPlaced = useRef(false);
  useEffect(() => {
    if (!activeLayout) {
      return;
    }
    if (pillPlaced.current) {
      pillX.set(withSpring(activeLayout.x, t.tabBarSpring));
      pillWidth.set(withSpring(activeLayout.width, t.tabBarSpring));
    } else {
      pillX.set(activeLayout.x);
      pillWidth.set(activeLayout.width);
      pillPlaced.current = true;
    }
  }, [activeLayout, pillX, pillWidth]);
  const pillStyle = useAnimatedStyle(() => ({
    width: pillWidth.get(),
    transform: [{ translateX: pillX.get() }],
  }));

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

        {/* The tabs and the pill share this row, so the measured places
            and the pill's position have the same origin. */}
        <View style={styles.row}>
          <Animated.View
            pointerEvents="none"
            testID="tab-bar-pill"
            style={[styles.pill, !activeLayout && styles.hidden, pillStyle]}
          />
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
                void Haptics.impactAsync(
                  t.tabBarHaptic as Haptics.ImpactFeedbackStyle,
                );
                navigation.navigate(route.name, route.params);
              }
            };
            const onLongPress = () => {
              navigation.emit({ type: "tabLongPress", target: route.key });
            };

            return (
              <TabButton
                key={route.key}
                label={options.title}
                active={active}
                onPress={onPress}
                onLongPress={onLongPress}
                onLayout={(layout) =>
                  setLayouts((current) => ({ ...current, [route.key]: layout }))
                }
                testID={options.tabBarButtonTestID}
              >
                {options.tabBarIcon?.({
                  focused: active,
                  color: t.ink,
                  size: t.tabBarIconSize,
                })}
              </TabButton>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// One tab: its icon shrinks while pressed and springs back on release.
function TabButton({
  label,
  active,
  onPress,
  onLongPress,
  onLayout,
  testID,
  children,
}: {
  label?: string;
  active: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onLayout: (layout: TabLayout) => void;
  testID?: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.set(withSpring(t.tabBarPressScale, t.tabBarSpring));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, t.tabBarSpring));
      }}
      onLayout={({ nativeEvent }) =>
        onLayout({ x: nativeEvent.layout.x, width: nativeEvent.layout.width })
      }
      testID={testID}
      style={styles.tab}
    >
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Pressable>
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
  row: {
    flexDirection: "row",
    gap: t.tabBarGap,
  },
  // The active pill: the full size of a tab, so wider than tall.
  pill: {
    position: "absolute",
    top: 0,
    left: 0,
    height: t.tabBarTabHeight,
    borderRadius: t.radiusPill,
    backgroundColor: t.tabBarActivePill,
  },
  // Until the tabs are measured, there is nowhere to put the pill.
  hidden: {
    opacity: 0,
  },
  // Active and inactive tabs are the same size; only the pill marks one.
  tab: {
    width: t.tabBarTabWidth,
    height: t.tabBarTabHeight,
    alignItems: "center",
    justifyContent: "center",
  },
});
