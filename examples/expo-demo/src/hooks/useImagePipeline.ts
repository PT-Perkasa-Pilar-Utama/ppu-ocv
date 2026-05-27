import { useState, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { SkImage } from "@shopify/react-native-skia";
import type { DetectedRegion, CanvasLike } from "ppu-ocv/canvas-mobile";
import { CanvasProcessor, CanvasToolkit } from "ppu-ocv/canvas-mobile";

type PipelineConfig = {
  originalCanvas: CanvasLike | null;
};

type SkiaCanvasPrivate = {
  _surface: {
    makeImageSnapshot(): SkImage;
  };
};

export type ImagePipelineResult = {
  grayscale: boolean;
  setGrayscale: Dispatch<SetStateAction<boolean>>;
  invert: boolean;
  setInvert: Dispatch<SetStateAction<boolean>>;
  thresh: number;
  setThresh: Dispatch<SetStateAction<number>>;
  border: boolean;
  setBorder: Dispatch<SetStateAction<boolean>>;
  borderSize: number;
  setBorderSize: Dispatch<SetStateAction<number>>;
  angle: number;
  setAngle: Dispatch<SetStateAction<number>>;
  minArea: number;
  setMinArea: Dispatch<SetStateAction<number>>;
  maxArea: number;
  setMaxArea: Dispatch<SetStateAction<number>>;
  processedCanvas: CanvasLike | null;
  processedImage: SkImage | null;
  regions: DetectedRegion[];
  pipelineTime: number;
  croppedImages: SkImage[];
};

export function useImagePipeline({ originalCanvas }: PipelineConfig): ImagePipelineResult {
  // Pipeline control states
  const [grayscale, setGrayscale] = useState<boolean>(true);
  const [invert, setInvert] = useState<boolean>(false);
  const [thresh, setThresh] = useState<number>(127);
  const [border, setBorder] = useState<boolean>(false);
  const [borderSize, setBorderSize] = useState<number>(15);
  const [angle, setAngle] = useState<number>(0);

  // Region detection states
  const [minArea, setMinArea] = useState<number>(15);
  const [maxArea, setMaxArea] = useState<number>(15000);
  const [regions, setRegions] = useState<DetectedRegion[]>([]);

  // Performance/UI states
  const [pipelineTime, setPipelineTime] = useState<number>(0);
  const [processedImage, setProcessedImage] = useState<SkImage | null>(null);
  const [processedCanvas, setProcessedCanvas] = useState<CanvasLike | null>(null);
  const [croppedImages, setCroppedImages] = useState<SkImage[]>([]);

  useEffect(() => {
    if (!originalCanvas) return;

    const start = typeof performance !== "undefined" ? performance.now() : Date.now();
    try {
      // Wrap source canvas in Processor
      let processor = new CanvasProcessor(originalCanvas);

      if (grayscale) {
        processor = processor.grayscale();
      }

      if (invert) {
        processor = processor.invert();
      }

      // Always threshold so region detection has binary source
      processor = processor.threshold({ thresh });

      if (border) {
        processor = processor.border({ size: borderSize, color: "#FFFFFF" });
      }

      if (angle !== 0) {
        processor = processor.rotate({ angle });
      }

      const finalCanvas = processor.toCanvas();

      // Get the Skia Image snapshot to display inside the Skia <Canvas> component
      // (SkiaCanvasLike has the _surface property containing the raw SkSurface)
      const snapshot = (finalCanvas as unknown as SkiaCanvasPrivate)._surface.makeImageSnapshot();

      // Detect connected regions on the binary canvas
      const detected = processor.findRegions({
        foreground: "dark", // the shapes are dark/black on white canvas
        thresh: 127,
        minArea,
        maxArea,
      });

      const end = typeof performance !== "undefined" ? performance.now() : Date.now();

      setProcessedCanvas(finalCanvas);
      setProcessedImage(snapshot);
      setRegions(detected);
      setPipelineTime(Math.round(end - start));

      // Generate crops of the first 8 regions for preview
      const toolkit = CanvasToolkit.getInstance();
      const crops: SkImage[] = [];
      for (const r of detected.slice(0, 8)) {
        try {
          const croppedCanvas = toolkit.crop({ bbox: r.bbox, canvas: finalCanvas });
          const cropSnapshot = (
            croppedCanvas as unknown as SkiaCanvasPrivate
          )._surface.makeImageSnapshot();
          if (cropSnapshot) crops.push(cropSnapshot);
        } catch {
          // ignore invalid crops during transient render states
        }
      }
      setCroppedImages(crops);
    } catch (err) {
      console.error(err);
    }
  }, [originalCanvas, grayscale, invert, thresh, border, borderSize, angle, minArea, maxArea]);

  return {
    // Config states
    grayscale,
    setGrayscale,
    invert,
    setInvert,
    thresh,
    setThresh,
    border,
    setBorder,
    borderSize,
    setBorderSize,
    angle,
    setAngle,
    minArea,
    setMinArea,
    maxArea,
    setMaxArea,

    // Output states
    processedCanvas,
    processedImage,
    regions,
    pipelineTime,
    croppedImages,
  };
}
