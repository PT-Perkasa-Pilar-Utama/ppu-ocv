import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function Header(): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>ppu-ocv Expo Demo</Text>
      <Text style={styles.headerSubtitle}>Skia-backed Native Image Processing</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00f0ff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
});
