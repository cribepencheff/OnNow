import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

import { HomeHeaderAddButton } from "./index";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarButtonTestID: "tab-home",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "house", android: "home", web: "home" }}
              tintColor={color}
              size={size}
            />
          ),
          headerShown: true,
          headerTitle: () => null,
          headerRight: () => <HomeHeaderAddButton />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarButtonTestID: "tab-calendar",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "calendar", android: "event", web: "event" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="shows"
        options={{
          title: "Shows",
          tabBarButtonTestID: "tab-shows",
          tabBarIcon: ({ color, size }) => (
            <SymbolView
              name={{ ios: "tv", android: "tv", web: "tv" }}
              tintColor={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
