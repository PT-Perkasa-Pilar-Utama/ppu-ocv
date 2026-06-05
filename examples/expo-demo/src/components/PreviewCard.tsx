import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import type { SkImage } from "@shopify/react-native-skia";
import { Canvas, Image, Rect } from "@shopify/react-native-skia";
import type { DetectedRegion } from "ppu-ocv/canvas-mobile";

type PreviewCardProps = {
  loading: boolean;
  processedImage: SkImage | null;
  regions: DetectedRegion[];
  pipelineTime: number;
  CANVAS_SIZE: number;
};

export function PreviewCard({
  loading,
  processedImage,
  regions,
  pipelineTime,
  CANVAS_SIZE,
}: PreviewCardProps): React.JSX.Element {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.sectionTitle}>Pipeline Output & Region Tracker</Text>
      <View style={[styles.canvasContainer, { width: CANVAS_SIZE + 8, height: CANVAS_SIZE + 8 }]}>
        {loading ? (
          <ActivityIndicator size="large" color="#00f0ff" />
        ) : (
          <View style={styles.canvasBorder}>
            <Canvas style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
              {processedImage && (
                <Image
                  image={processedImage}
                  x={0}
                  y={0}
                  width={CANVAS_SIZE}
                  height={CANVAS_SIZE}
                  fit="contain"
                />
              )}
              {/* Overlay bounding boxes dynamically! */}
              {regions.map((region, index) => {
                const { x0, y0, x1, y1 } = region.bbox;
                return (
                  <Rect
                    key={index}
                    x={x0}
                    y={y0}
                    width={x1 - x0}
                    height={y1 - y0}
                    color="#00f0ff"
                    style="stroke"
                    strokeWidth={2}
                  />
                );
              })}
            </Canvas>
          </View>
        )}
      </View>

      {/* Stats Bar */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{pipelineTime}ms</Text>
          <Text style={styles.statLabel}>Pipeline Time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{regions.length}</Text>
          <Text style={styles.statLabel}>Regions Found</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{CANVAS_SIZE}²</Text>
          <Text style={styles.statLabel}>Canvas Size</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 16,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 12,
  },
  canvasContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 12,
  },
  canvasBorder: {
    padding: 2,
    borderColor: "#374151",
    borderWidth: 2,
    borderRadius: 8,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00f0ff",
  },
  statLabel: {
    fontSize: 10,
    color: "#9ca3af",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#374151",
  },
});
