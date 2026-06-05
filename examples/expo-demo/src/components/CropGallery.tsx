import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { SkImage } from "@shopify/react-native-skia";
import { Canvas, Image } from "@shopify/react-native-skia";

type CropGalleryProps = {
  croppedImages: SkImage[];
};

export function CropGallery({ croppedImages }: CropGalleryProps): React.JSX.Element | null {
  if (croppedImages.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Cropped BBoxes (Direct Skia Crops)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cropRow}
      >
        {croppedImages.map((cropImg, idx) => {
          const w = cropImg.width();
          const h = cropImg.height();
          // Ensure size constraints for preview
          const maxDim = 60;
          const aspect = w / h;
          const displayW = aspect >= 1 ? maxDim : maxDim * aspect;
          const displayH = aspect >= 1 ? maxDim / aspect : maxDim;

          return (
            <View key={idx} style={styles.cropWrapper}>
              <Canvas style={{ width: displayW, height: displayH }}>
                <Image
                  image={cropImg}
                  x={0}
                  y={0}
                  width={displayW}
                  height={displayH}
                  fit="contain"
                />
              </Canvas>
              <Text style={styles.cropText}>
                {w}×{h}
              </Text>
            </View>
          );
        })}
      </ScrollView>
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
  cropRow: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 4,
  },
  cropWrapper: {
    alignItems: "center",
    backgroundColor: "#0b0f19",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1f2937",
    minWidth: 80,
    minHeight: 85,
    justifyContent: "center",
  },
  cropText: {
    fontSize: 9,
    color: "#9ca3af",
    marginTop: 6,
  },
});
