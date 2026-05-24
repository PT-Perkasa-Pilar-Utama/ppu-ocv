import React from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet } from "react-native";

type PipelineControlsProps = {
  grayscale: boolean;
  setGrayscale: (v: boolean) => void;
  invert: boolean;
  setInvert: (v: boolean) => void;
  border: boolean;
  setBorder: (v: boolean) => void;
  thresh: number;
  setThresh: (v: number) => void;
  angle: number;
  setAngle: (v: number) => void;
};

export function PipelineControls({
  grayscale,
  setGrayscale,
  invert,
  setInvert,
  border,
  setBorder,
  thresh,
  setThresh,
  angle,
  setAngle,
}: PipelineControlsProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Pipeline Config</Text>

      <View style={styles.controlRow}>
        <View style={styles.controlLabelCol}>
          <Text style={styles.controlLabelTitle}>Grayscale Filter</Text>
          <Text style={styles.controlLabelDesc}>Convert RGB using luma coefficients</Text>
        </View>
        <Switch
          value={grayscale}
          onValueChange={setGrayscale}
          trackColor={{ false: "#374151", true: "#00f0ff" }}
          thumbColor={grayscale ? "#ffffff" : "#9ca3af"}
        />
      </View>

      <View style={styles.controlRow}>
        <View style={styles.controlLabelCol}>
          <Text style={styles.controlLabelTitle}>Invert Colors</Text>
          <Text style={styles.controlLabelDesc}>Invert colors bitwise (bitwise_not)</Text>
        </View>
        <Switch
          value={invert}
          onValueChange={setInvert}
          trackColor={{ false: "#374151", true: "#00f0ff" }}
          thumbColor={invert ? "#ffffff" : "#9ca3af"}
        />
      </View>

      <View style={styles.controlRow}>
        <View style={styles.controlLabelCol}>
          <Text style={styles.controlLabelTitle}>Add Canvas Border</Text>
          <Text style={styles.controlLabelDesc}>Pad the canvas with white margins</Text>
        </View>
        <Switch
          value={border}
          onValueChange={setBorder}
          trackColor={{ false: "#374151", true: "#00f0ff" }}
          thumbColor={border ? "#ffffff" : "#9ca3af"}
        />
      </View>

      {/* Slider Controls (Implemented as step buttons for high reliability) */}
      <Text style={styles.sliderLabel}>Binary Threshold (Current: {thresh})</Text>
      <View style={styles.sliderButtonRow}>
        {[40, 80, 127, 160, 200].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.sliderButton, thresh === v && styles.sliderButtonActive]}
            onPress={() => setThresh(v)}
          >
            <Text style={[styles.sliderButtonText, thresh === v && styles.sliderButtonTextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sliderLabel}>Rotation Angle (Current: {angle}°)</Text>
      <View style={styles.sliderButtonRow}>
        {[-90, -45, 0, 45, 90].map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.sliderButton, angle === a && styles.sliderButtonActive]}
            onPress={() => setAngle(a)}
          >
            <Text style={[styles.sliderButtonText, angle === a && styles.sliderButtonTextActive]}>
              {a}°
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
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  controlLabelCol: {
    flex: 1,
    paddingRight: 10,
  },
  controlLabelTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  controlLabelDesc: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 1,
  },
  sliderLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 16,
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
