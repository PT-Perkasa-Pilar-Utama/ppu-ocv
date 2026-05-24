import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

type RegionFiltersProps = {
  minArea: number;
  setMinArea: (v: number) => void;
};

export function RegionFilters({ minArea, setMinArea }: RegionFiltersProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Connected Component Filters</Text>
      <Text style={styles.sliderLabel}>Minimum Area (Current: {minArea} px)</Text>
      <View style={styles.sliderButtonRow}>
        {[5, 15, 50, 100, 200].map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.sliderButton, minArea === a && styles.sliderButtonActive]}
            onPress={() => setMinArea(a)}
          >
            <Text style={[styles.sliderButtonText, minArea === a && styles.sliderButtonTextActive]}>
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginBottom: 8,
  },
  sliderButtonRow: {
    flexDirection: "row",
    gap: 6,
  },
  sliderButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    borderColor: "#374151",
    borderWidth: 1,
  },
  sliderButtonActive: {
    backgroundColor: "#00f0ff",
    borderColor: "#00f0ff",
  },
  sliderButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  sliderButtonTextActive: {
    color: "#111827",
  },
});
