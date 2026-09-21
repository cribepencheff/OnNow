import { StyleSheet, Text, View } from "react-native";

export default function ShowsScreen() {
  return (
    <View style={styles.container}>
      <Text>Shows</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
