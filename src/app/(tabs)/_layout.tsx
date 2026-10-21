import { useRef } from "react";
import { Tabs } from "expo-router";

import {
  CalendarIcon,
  HomeIcon,
  MyShowsIcon,
  SearchIcon,
} from "@/components/TabBar/TabIcons";
import { FloatingTabBar } from "@/components/TabBar/FloatingTabBar";
import { requestSearchFocus } from "@/hooks/search-focus";
import { useGuardedRouter } from "@/hooks/useGuardedRouter";
import { t } from "@/theme/tokens";

// The floating tab bar (CRI-133): four icon-only tabs, Home, Calendar, My
// shows and Search. Each title is the tab's accessibility label.
// Two presses on My shows this close together count as a double tap.
const DOUBLE_TAP_MS = 300;

export default function TabLayout() {
  const router = useGuardedRouter();
  const lastShowsPress = useRef(0);
  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarButtonTestID: "tab-home",
          tabBarIcon: ({ focused }) => <HomeIcon active={focused} />,
          // No native header: the hero backdrop fills the screen.
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarButtonTestID: "tab-calendar",
          tabBarIcon: ({ focused }) => <CalendarIcon active={focused} />,
          // The header on bg, like the screen under it (as in Shows).
          headerStyle: { backgroundColor: t.bg },
          headerTitleStyle: { color: t.ink },
          headerShadowVisible: false,
        }}
      />
      <Tabs.Screen
        name="shows"
        options={{
          title: "My shows",
          // The screen's own header keeps its name.
          headerTitle: "Shows",
          tabBarButtonTestID: "tab-shows",
          tabBarIcon: ({ focused }) => <MyShowsIcon active={focused} />,
          // The header on bg, like the screen under it.
          headerStyle: { backgroundColor: t.bg },
          headerTitleStyle: { color: t.ink },
          headerShadowVisible: false,
        }}
        // The hidden image review screen is reached by a double tap on
        // this tab, development builds only.
        listeners={{
          tabPress: () => {
            const now = Date.now();
            if (__DEV__ && now - lastShowsPress.current < DOUBLE_TAP_MS) {
              router.push("/dev/images");
            }
            lastShowsPress.current = now;
          },
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarButtonTestID: "tab-search",
          tabBarIcon: ({ focused }) => <SearchIcon active={focused} />,
          // Search's own stack draws its screens (search/_layout.tsx).
          headerShown: false,
        }}
        // A tap on the tab opens Search in typing mode (search-focus.ts).
        listeners={{ tabPress: requestSearchFocus }}
      />
    </Tabs>
  );
}
