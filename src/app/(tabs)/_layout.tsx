import { SymbolView } from "expo-symbols";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      // PROTOTYPE (proto/home-backdrop): the translucent tab bar of
      // direction B: surface at 72% with a hairline top edge; active ink,
      // others ink-subtle. No background blur (expo-blur is not installed).
      screenOptions={{
        tabBarStyle: {
          position: "absolute",
          height: 83,
          backgroundColor: "rgba(22,24,29,0.72)",
          borderTopColor: "#2c2f37",
        },
        tabBarActiveTintColor: "#f4f4f6",
        tabBarInactiveTintColor: "#8b8e97",
      }}
    >
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
          // PROTOTYPE: no header; the "+" floats over the backdrop.
          headerShown: false,
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
