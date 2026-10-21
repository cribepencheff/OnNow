// The floating tab bar (CRI-133), Instagram style: a frosted pill centred
// above the content, so the content scrolls visibly behind it. Icon-only
// tabs, all the same size; the active one is its icon filled (Search stays
// an outline) on a wide light-grey pill that slides from tab to tab on a
// spring. Everything is neutral white and grey, no accent.
//
// Touch is a single scrub, like iOS's own tab bar: one pan gesture across
// the whole bar, not a tap per tab. Putting a finger down lifts the bar a
// little; the pill and the hovered tab's icon follow the finger, snapping
// to whichever tab is under it with a selection haptic each time it moves
// to a new one; releasing commits that tab. Dragged well outside the bar
// and released, the gesture cancels and the pill springs back to the tab
// that was already active. A tap is just a scrub that never moves: the
// same gesture resolves and commits it. Screen readers cannot scrub, so
// each tab also exposes a plain "activate" accessibility action.
//
// Each tab's icon, title (its accessibility label) and test ID come from
// its screen's options in app/(tabs)/_layout.tsx. Committing follows React
// Navigation's own tab bar: a tabPress event first, so landing on the
// active tab still scrolls its view to the top (Home to the hero) or goes
// back to its start, then the switch. A long press (My shows' hidden dev
// screen) fires once the finger has rested on a tab for a moment, the
// same as a plain Pressable's.

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { Tabs } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import {
  FLOATING_TAB_BAR_BOTTOM,
  isWithinScrubBounds,
  nearestTabIndex,
  type TabLayout,
} from "@/logic/tab-bar";
import { t } from "@/theme/tokens";

// The props a custom tab bar receives, taken from Tabs' public props
// rather than expo-router's internal React Navigation types.
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

// How long a still finger takes to count as a long press, as Pressable's
// own default.
const LONG_PRESS_DURATION = 500;

export function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: TabBarProps) {
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

  // The scrub: which tab is under the finger, and whether the finger is
  // still over the bar (vertically) or has been dragged out, which cancels
  // the gesture on release instead of committing.
  const barLift = useSharedValue(1);
  const isTouching = useSharedValue(false);
  const withinBounds = useSharedValue(true);
  const hoverIndex = useSharedValue(state.index);

  // A plain JS-thread value, not a React ref: it is read and written from
  // functions the gesture calls through runOnJS, never during render.
  const longPressTimer = useSharedValue<ReturnType<typeof setTimeout> | null>(
    null,
  );
  function cancelLongPress() {
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  }
  function armLongPress(index: number) {
    cancelLongPress();
    const route = state.routes[index];
    longPressTimer.value = setTimeout(() => {
      navigation.emit({ type: "tabLongPress", target: route.key });
    }, LONG_PRESS_DURATION);
  }
  function onHoverChange(index: number) {
    void Haptics.selectionAsync();
    armLongPress(index);
  }
  function commitSelection(index: number) {
    const route = state.routes[index];
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (index !== state.index && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  }

  // One touch resolves the hovered tab and the pill's target from its
  // position; onBegin and onUpdate share this so a plain tap (which never
  // moves) resolves exactly the same way a scrub does.
  function resolveTouch(x: number, y: number) {
    "worklet";
    const inBounds = isWithinScrubBounds(y);
    withinBounds.set(inBounds);
    const index = inBounds
      ? nearestTabIndex(x - t.tabBarPadding, orderedLayouts)
      : state.index;
    const layout = orderedLayouts[index];
    if (layout) {
      pillX.set(withSpring(layout.x, t.tabBarSpring));
      pillWidth.set(withSpring(layout.width, t.tabBarSpring));
    }
    if (!inBounds) {
      runOnJS(cancelLongPress)();
      return;
    }
    if (index !== hoverIndex.get()) {
      hoverIndex.set(index);
      runOnJS(onHoverChange)(index);
    }
  }

  // minDistance(0): a plain tap never moves far enough to reach Pan's
  // normal ACTIVE state, so onEnd (which only fires from ACTIVE) would
  // never see it. Committing in onFinalize instead, which always fires
  // once, handles a tap and a cancelled or out-of-bounds drag the same
  // way, by whatever resolveTouch last found.
  const panGesture = Gesture.Pan()
    .withTestId("tab-bar-scrub")
    .minDistance(0)
    .onBegin((event) => {
      isTouching.set(true);
      hoverIndex.set(state.index);
      barLift.set(withSpring(t.tabBarLiftScale, t.tabBarSpring));
      resolveTouch(event.x, event.y);
      // Arms even a touch down that lands back on the tab that was
      // already hovered (resolveTouch only arms it on a change), so
      // holding the already-active tab still long-presses.
      runOnJS(armLongPress)(hoverIndex.get());
    })
    .onUpdate((event) => {
      resolveTouch(event.x, event.y);
    })
    .onFinalize(() => {
      if (withinBounds.get()) {
        runOnJS(commitSelection)(hoverIndex.get());
      }
      isTouching.set(false);
      barLift.set(withSpring(1, t.tabBarSpring));
      runOnJS(cancelLongPress)();
    });

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scale: barLift.get() }],
  }));

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <GestureDetector gesture={panGesture}>
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
          <View style={styles.row}>
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
                  index={index}
                  label={options.title}
                  active={active}
                  hoverIndex={hoverIndex}
                  isTouching={isTouching}
                  withinBounds={withinBounds}
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

// One tab: its icon grows a little while the finger is over it, scrubbing
// or tapping, and springs back when it isn't. Not itself touchable (the
// bar's single pan gesture is); a plain "activate" accessibility action
// stands in for a screen reader, which cannot scrub.
function TabButton({
  index,
  label,
  active,
  hoverIndex,
  isTouching,
  withinBounds,
  onActivate,
  onLayout,
  testID,
  children,
}: {
  index: number;
  label?: string;
  active: boolean;
  hoverIndex: SharedValue<number>;
  isTouching: SharedValue<boolean>;
  withinBounds: SharedValue<boolean>;
  onActivate: () => void;
  onLayout: (layout: TabLayout) => void;
  testID?: string;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);
  useAnimatedReaction(
    () => isTouching.get() && withinBounds.get() && hoverIndex.get() === index,
    (hovered, previouslyHovered) => {
      if (hovered === previouslyHovered) {
        return;
      }
      scale.set(withSpring(hovered ? t.tabBarHoverScale : 1, t.tabBarSpring));
    },
  );
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View
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
      <Animated.View style={iconStyle}>{children}</Animated.View>
    </Animated.View>
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
