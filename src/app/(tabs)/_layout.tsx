import { Pressable, type GestureResponderEvent } from "react-native";
import { SymbolView } from "expo-symbols";
import { Tabs, useRouter } from "expo-router";

// The hidden image review screen is reached by a long press on the Shows
// tab, development builds only. Typed loosely rather than importing
// expo-router's internal BottomTabBarButtonProps, which is not part of
// its public exports.
function ShowsTabButton(props: {
  children?: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  [key: string]: unknown;
}) {
  const router = useRouter();
  return (
    <Pressable
      {...props}
      onLongPress={__DEV__ ? () => router.push("/dev/images") : undefined}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      // The translucent tab bar: surface at 72% with a hairline top edge;
      // active ink, others ink-subtle. No background blur (expo-blur is
      // not installed).
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
          // No native header: the hero backdrop fills the screen.
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
          // Long press opens the hidden image review screen.
          tabBarButton: ShowsTabButton,
        }}
      />
    </Tabs>
  );
}
