import React from "react";
import { StyleSheet, ScrollView, SafeAreaView } from "react-native";
import { StatusBar } from "expo-status-bar";

import { useImageSource } from "./src/hooks/useImageSource";
import { useImagePipeline } from "./src/hooks/useImagePipeline";

import { Header } from "./src/components/Header";
import { ErrorBox } from "./src/components/ErrorBox";
import { PreviewCard } from "./src/components/PreviewCard";
import { SourceSelector } from "./src/components/SourceSelector";
import { PipelineControls } from "./src/components/PipelineControls";
import { RegionFilters } from "./src/components/RegionFilters";
import { CropGallery } from "./src/components/CropGallery";

const CANVAS_SIZE = 300;

export default function App(): React.JSX.Element {
  const {
    originalCanvas,
    imageUrl,
    setImageUrl,
    loading,
    errorMessage,
    generateProceduralTest,
    loadCustomImage,
    loadReceiptImage,
  } = useImageSource({ CANVAS_SIZE });

  const {
    grayscale,
    setGrayscale,
    invert,
    setInvert,
    thresh,
    setThresh,
    border,
    setBorder,
    angle,
    setAngle,
    minArea,
    setMinArea,
    processedImage,
    regions,
    pipelineTime,
    croppedImages,
  } = useImagePipeline({ originalCanvas });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ErrorBox message={errorMessage} />

        <PreviewCard
          loading={loading}
          processedImage={processedImage}
          regions={regions}
          pipelineTime={pipelineTime}
          CANVAS_SIZE={CANVAS_SIZE}
        />

        <SourceSelector
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          generateProceduralTest={generateProceduralTest}
          loadReceiptImage={loadReceiptImage}
          loadCustomImage={loadCustomImage}
        />

        <PipelineControls
          grayscale={grayscale}
          setGrayscale={setGrayscale}
          invert={invert}
          setInvert={setInvert}
          border={border}
          setBorder={setBorder}
          thresh={thresh}
          setThresh={setThresh}
          angle={angle}
          setAngle={setAngle}
        />

        <RegionFilters minArea={minArea} setMinArea={setMinArea} />

        <CropGallery croppedImages={croppedImages} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0f19",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
