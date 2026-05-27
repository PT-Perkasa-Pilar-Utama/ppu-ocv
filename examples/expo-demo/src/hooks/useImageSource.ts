import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useImage as useSkiaImage } from "@shopify/react-native-skia";
import { getPlatform, CanvasProcessor } from "ppu-ocv/canvas-mobile";
import type { CanvasLike } from "ppu-ocv/canvas-mobile";

const receiptAsset = require("../../assets/receipt.jpg");

type SourceConfig = {
  CANVAS_SIZE: number;
};

export type ImageSourceResult = {
  originalCanvas: CanvasLike | null;
  imageUrl: string;
  setImageUrl: Dispatch<SetStateAction<string>>;
  loading: boolean;
  errorMessage: string | null;
  generateProceduralTest: () => void;
  loadCustomImage: () => Promise<void>;
  loadReceiptImage: () => void;
};

export function useImageSource({ CANVAS_SIZE }: SourceConfig): ImageSourceResult {
  const skiaReceiptImage = useSkiaImage(receiptAsset);

  const [originalCanvas, setOriginalCanvas] = useState<CanvasLike | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(
    "https://static0.srcdn.com/wordpress/wp-content/uploads/2021/02/Rick-Astley-Never-Gonna-Give-You-Up-Remastered-Header.jpg"
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Generate a procedural canvas containing shapes and text
  const generateProceduralTest = () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const platform = getPlatform();
      const canvas = platform.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
      const ctx = canvas.getContext("2d");

      // White background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Draw dark geometric shapes to detect as foreground
      ctx.fillStyle = "#111827";

      // Rectangles
      ctx.fillRect(40, 45, 70, 70);
      ctx.fillRect(190, 50, 80, 50);

      // A simple composite shape
      ctx.fillRect(45, 170, 50, 50);
      ctx.fillRect(75, 200, 50, 50);

      // T-shape
      ctx.fillRect(170, 160, 90, 25);
      ctx.fillRect(202, 185, 26, 60);

      // Tiny dots (for checking area filters)
      ctx.fillRect(145, 120, 6, 6);
      ctx.fillRect(155, 120, 4, 4);
      ctx.fillRect(148, 130, 8, 8);

      setOriginalCanvas(canvas);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to generate procedural shapes: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load custom image from remote URL
  const loadCustomImage = async () => {
    if (!imageUrl.trim()) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      const loadedCanvas = await CanvasProcessor.prepareCanvas(imageUrl);

      // Resize to fit our display canvas nicely so scaling is 1:1 for visualization
      const platform = getPlatform();
      const canvas = platform.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
      canvas.getContext("2d").drawImage(loadedCanvas, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      setOriginalCanvas(canvas);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(
        `Failed to load network image. Ensure URL is valid and device is online.\nDetail: ${msg}`
      );
    } finally {
      setLoading(false);
    }
  };

  // 3. Load receipt.jpg locally using Skia native image hook
  const loadReceiptImage = () => {
    if (!skiaReceiptImage) {
      setErrorMessage("Receipt image is still loading in Skia...");
      return;
    }
    try {
      setLoading(true);
      setErrorMessage(null);

      const w = skiaReceiptImage.width();
      const h = skiaReceiptImage.height();

      const platform = getPlatform();
      const canvas = platform.createCanvas(CANVAS_SIZE, CANVAS_SIZE);
      const ctx = canvas.getContext("2d");

      // Draw Skia image onto canvas using 9-argument layout
      ctx.drawImage({ _skiaImage: skiaReceiptImage }, 0, 0, w, h, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      setOriginalCanvas(canvas);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Failed to initialize receipt canvas: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Run initial setup on mount / once Skia receipt is loaded
  useEffect(() => {
    if (skiaReceiptImage) {
      loadReceiptImage();
    }
  }, [skiaReceiptImage]);

  return {
    originalCanvas,
    imageUrl,
    setImageUrl,
    loading,
    errorMessage,
    generateProceduralTest,
    loadCustomImage,
    loadReceiptImage,
  };
}
