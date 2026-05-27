import React from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";

type SourceSelectorProps = {
  imageUrl: string;
  setImageUrl: (url: string) => void;
  generateProceduralTest: () => void;
  loadReceiptImage: () => void;
  loadCustomImage: () => void;
};

export function SourceSelector({
  imageUrl,
  setImageUrl,
  generateProceduralTest,
  loadReceiptImage,
  loadCustomImage,
}: SourceSelectorProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Source Image Selection</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.accentButton} onPress={generateProceduralTest}>
          <Text style={styles.accentButtonText}>Shapes</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.accentButton} onPress={loadReceiptImage}>
          <Text style={styles.accentButtonText}>Receipt</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={loadCustomImage}>
          <Text style={styles.primaryButtonText}>Fetch Remote</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.urlInput}
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="Remote Image URL"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
        autoCorrect={false}
      />
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
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#00f0ff",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#111827",
    fontWeight: "bold",
    fontSize: 13,
  },
  accentButton: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderColor: "#374151",
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  accentButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },
  urlInput: {
    backgroundColor: "#0b0f19",
    borderColor: "#1f2937",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#ffffff",
  },
});
