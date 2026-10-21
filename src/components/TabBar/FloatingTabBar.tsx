// The floating tab bar (CRI-133), Instagram style: a frosted pill centred
// above the content, so the content scrolls visibly behind it. Icon-only
// tabs, all the same size; the active one is its icon filled (Search stays
// an outline) on a wide light-grey pill that slides from tab to tab on a
// spring. Everything is neutral white and grey, no accent.
//
// Touch is one gesture over the whole bar, not a button per tab: a tap
// and a drag race, and whichever wins handles the touch. Putting a finger
// down lifts the bar a little, the sign that it is listening. A tap
// commits the tab it lands on. A drag carries the pill along under the
// finger,
// 1:1; nothing is chosen until the finger lifts, when the tab nearest that
// spot is committed and the pill springs into its slot, even if the
// finger has strayed above or below the bar. The bar stays lifted until
// the finger lifts. A tab change gives one selection haptic. Screen readers cannot drag, so each tab also exposes a
// plain "activate" accessibility action.
//
// Each tab's icon, title (its accessibility label) and test ID come from
// its screen's options in app/(tabs)/_layout.tsx. Committing follows React
// Navigation's own tab bar: a tabPress event first, so landing on the
// active tab still scrolls its view to the top (Home to the hero) or goes
// back to its start, then the switch.

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import {
  FLOATING_TAB_BAR_BOTTOM,
  nearestTabIndex,
  tabBarRowGap,
  type TabLayout,
} from "@/logic/tab-bar";
import { t } from "@/theme/tokens";

// The props a custom tab bar receives, taken from Tabs' public props
// rather than expo-router's internal React Navigation types.
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

// A slow, still press is still a tap: Tap's own default (500 ms) would
// fail it, and with no drag either, nothing would be selected.
const TAP_MAX_DURATION = 60_000;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
  // The gap between tabs: wide enough that the whole bar spans the same
  // width as Home's content margins, matching the hero's "Open in" button
  // (tabBarRowGap, logic/tab-bar.ts).
  const { width: windowWidth } = useWindowDimensions();
  const rowGap = tabBarRowGap(windowWidth, state.routes.length);

  // Each tab's place in the row, measured, so the pill and the scrub both
  // know where they are.
  const [layouts, setLayouts] = useState<Record<string, TabLayout>>({});
  const orderedLayouts = state.routes.map((route) => layouts[route.key]);
  const activeLayout = orderedLayouts[state.index];

  // The pill follows the active tab at rest, and the hovered one while a
  // finger is on the bar (below). Its first place is set without a slide,
  // so it does not fly in from the left edge on launch.
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

  // The bar's lift while a finger is on it.
  const barLift = useSharedValue(1);

  function commitSelection(index: number) {
    const route = state.routes[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (index !== state.index && !event.defaultPrevented) {
      void Haptics.selectionAsync();
      navigation.navigate(route.name, route.params);
    }
  }

  // The row's full width: every tab is the same size (tabBarTabWidth),
  // rowGap apart.
  const rowWidth =
    state.routes.length * t.tabBarTabWidth + (state.routes.length - 1) * rowGap;

  // While dragging, the pill sits centred under the finger, 1:1 with no
  // spring, kept inside the row, even with the finger above or below the
  // bar.
  function followFinger(x: number) {
    "worklet";
    const left = x - t.tabBarPadding - t.tabBarTabWidth / 2;
    pillX.set(Math.min(Math.max(left, 0), rowWidth - t.tabBarTabWidth));
  }
  // On release: the tab nearest where the finger was lifted, the pill
  // springing into its slot.
  function release(x: number) {
    "worklet";
    const index = nearestTabIndex(x - t.tabBarPadding, orderedLayouts);
    const layout = orderedLayouts[index];
    if (layout) {
      pillX.set(withSpring(layout.x, t.tabBarSpring));
      pillWidth.set(withSpring(layout.width, t.tabBarSpring));
    }
    runOnJS(commitSelection)(index);
  }
  function touchDown() {
    "worklet";
    barLift.set(withSpring(t.tabBarLiftScale, t.tabBarSpring));
  }

  // A tap and a drag race: a finger that lifts without moving far is the
  // tap, one that moves is the drag, never both. onEnd only fires for the
  // one that won, so only it commits. The bar stays lifted until the touch
  // is over: the drag gesture resets it, since it ends last either way
  // (when the tap wins, the race cancels it); the tap does not, as it
  // fails the moment a drag starts and would drop the lift mid-drag.
  const tapGesture = Gesture.Tap()
    .maxDuration(TAP_MAX_DURATION)
    .onBegin(() => touchDown())
    .onEnd((event) => release(event.x));
  const dragGesture = Gesture.Pan()
    .withTestId("tab-bar-scrub")
    .onBegin(() => touchDown())
    .onUpdate((event) => followFinger(event.x))
    .onEnd((event) => release(event.x))
    .onFinalize(() => {
      barLift.set(withSpring(1, t.tabBarSpring));
    });
  const barGesture = Gesture.Race(tapGesture, dragGesture);

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barLift.get() }],
  }));

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <GestureDetector gesture={barGesture}>
        <Animated.View style={[styles.bar, barStyle]} testID="tab-bar">
          {/* The blur first, the fill over it: a fill under the blur
              would be blurred into a solid colour (as in
              ImageControlMaterial). */}
          <BlurView
            intensity={t.tabBarBlur}
            tint="systemUltraThinMaterialDark"
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.fill]} />

          {/* The tabs and the pill share this row, so the measured places
              and the pill's position have the same origin. */}
          <View style={[styles.row, { gap: rowGap }]}>
            <Animated.View
              pointerEvents="none"
              testID="tab-bar-pill"
              style={[styles.pill, !activeLayout && styles.hidden, pillStyle]}
            />
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const active = state.index === index;

              return (
                <TabButton
                  key={route.key}
                  label={options.title}
                  active={active}
                  onActivate={() => commitSelection(index)}
                  onLayout={(layout) =>
                    setLayouts((current) => ({
                      ...current,
                      [route.key]: layout,
                    }))
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
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// One tab: not itself touchable (the bar's single gesture is); a plain
// "activate" accessibility action stands in for a screen reader, which
// cannot drag.
function TabButton({
  label,
  active,
  onActivate,
  onLayout,
  testID,
  children,
}: {
  label?: string;
  active: boolean;
  onActivate: () => void;
  onLayout: (layout: TabLayout) => void;
  testID?: string;
  children: React.ReactNode;
}) {
  return (
    <View
      accessible
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      accessibilityActions={ACTIVATE_ACTION}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "activate") {
          onActivate();
        }
      }}
      onLayout={({ nativeEvent }) =>
        onLayout({ x: nativeEvent.layout.x, width: nativeEvent.layout.width })
      }
      testID={testID}
      style={styles.tab}
    >
      {children}
    </View>
  );
}

const ACTIVATE_ACTION = [{ name: "activate" }];

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
