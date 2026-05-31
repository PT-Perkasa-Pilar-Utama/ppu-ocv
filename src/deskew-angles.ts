// SPDX-License-Identifier: MIT
// Copyright (c) 2026 PT Perkasa Pilar Utama

/**
 * Skew-angle estimators used by {@link DeskewService}. Pure helpers extracted
 * from `deskew.ts`: each takes detected text regions (or a binary Mat) and
 * returns candidate angles with weights, plus a consensus reducer. Methods that
 * log accept a `log` callback so they stay free of service state.
 */
import { cv } from "./cv-provider.js";

/** A candidate skew angle with its confidence weight. */
export type WeightedAngle = { angle: number; weight: number };

/** A detected text region: its contour and basic shape metrics. */
export type TextRegion = { contour: cv.Mat; area: number; aspectRatio: number };

/** Least-squares slope of a point set, as an angle in degrees clamped to ±45°. */
export function calculateLineAngle(points: Array<{ x: number; y: number }>): number {
  if (points.length < 2) return 0;

  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;

  if (Math.abs(denominator) < 1e-10) return 0;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  let angle = (Math.atan(slope) * 180) / Math.PI;

  if (angle > 45) angle -= 90;
  if (angle < -45) angle += 90;

  return angle;
}

/** Angles from each region's minimum-area rectangle, weighted by area and aspect. */
export function calculateMinRectAngles(textRegions: TextRegion[]): WeightedAngle[] {
  const angles: WeightedAngle[] = [];

  for (const region of textRegions) {
    try {
      const minRect = cv.minAreaRect(region.contour);
      if (!minRect) continue;

      let angle = minRect.angle;

      if (angle > 45) {
        angle -= 90;
      } else if (angle < -45) {
        angle += 90;
      }

      const areaWeight = Math.log(region.area + 1);
      const aspectWeight = Math.min(region.aspectRatio, 1 / region.aspectRatio) * 2;
      const weight = areaWeight * aspectWeight;

      angles.push({ angle, weight });
    } catch {
      continue;
    }
  }

  return angles;
}

/** Angles from each region's text baseline (line fit through bottom points). */
export function calculateBaselineAngles(textRegions: TextRegion[]): WeightedAngle[] {
  const angles: WeightedAngle[] = [];

  for (const region of textRegions) {
    try {
      const points = region.contour.data32S;
      if (!points || points.length < 8) continue;

      // First pass: find x bounds
      let minX = Infinity;
      let maxX = -Infinity;

      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        if (x !== undefined) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }

      if (minX === Infinity) continue;

      // Second pass: bucket into 3 x-segments, track max-y per bucket
      const bucketMaxY: Array<{ x: number; y: number } | null> = [null, null, null];
      const xRange = maxX - minX || 1;

      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        const y = points[i + 1];
        if (x === undefined || y === undefined) continue;

        const bucket = Math.min(2, Math.floor(((x - minX) / xRange) * 3));
        const current = bucketMaxY[bucket];
        if (current === null || y > current.y) {
          bucketMaxY[bucket] = { x, y };
        }
      }

      const baselinePoints = bucketMaxY.filter((p): p is { x: number; y: number } => p !== null);

      if (baselinePoints.length >= 2) {
        const angle = calculateLineAngle(baselinePoints);
        const weight = region.area * Math.min(region.aspectRatio, 1 / region.aspectRatio);
        angles.push({ angle, weight });
      }
    } catch {
      continue;
    }
  }

  return angles;
}

/** Angles from a probabilistic Hough line transform of the morphed binary Mat. */
export function calculateHoughAngles(
  mat: cv.Mat,
  minAngle: number,
  maxAngle: number,
  log: (message: string) => void
): WeightedAngle[] {
  const angles: WeightedAngle[] = [];

  try {
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 1));
    const morphed = new cv.Mat();
    cv.morphologyEx(mat, morphed, cv.MORPH_CLOSE, kernel);

    const lines = new cv.Mat();
    cv.HoughLinesP(morphed, lines, 1, Math.PI / 180, 30, 50, 10);

    for (let i = 0; i < lines.rows; i++) {
      const line = lines.data32S.subarray(i * 4, (i + 1) * 4);
      const [x1, y1, x2, y2] = line;

      if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
        const dx = x2 - x1;
        const dy = y2 - y1;

        if (Math.abs(dx) > 1) {
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;

          if (angle > 45) angle -= 90;
          if (angle < -45) angle += 90;

          if (angle >= minAngle && angle <= maxAngle) {
            const lineLength = Math.sqrt(dx * dx + dy * dy);
            angles.push({ angle, weight: lineLength });
          }
        }
      }
    }

    morphed.delete();
    lines.delete();
    kernel.delete();
  } catch {
    log("Hough transform failed, skipping this method.");
  }

  return angles;
}

/** Robust consensus over all candidate angles: IQR outlier rejection + weighted mean. */
export function calculateConsensusAngle(
  angles: Array<WeightedAngle & { method: string }>,
  minAngle: number,
  maxAngle: number,
  log: (message: string) => void
): number {
  if (angles.length === 0) return 0;

  const sortedAngles = [...angles].sort((a, b) => a.angle - b.angle);
  const q1Index = Math.floor(sortedAngles.length * 0.25);
  const q3Index = Math.floor(sortedAngles.length * 0.75);

  const q1 = sortedAngles[q1Index]?.angle || 0;
  const q3 = sortedAngles[q3Index]?.angle || 0;
  const iqr = q3 - q1;

  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filteredAngles = angles.filter(
    (a) =>
      a.angle >= lowerBound && a.angle <= upperBound && a.angle >= minAngle && a.angle <= maxAngle
  );

  if (filteredAngles.length === 0) {
    log("All angles filtered out as outliers, using median of original set.");
    const medianIndex = Math.floor(sortedAngles.length / 2);
    return sortedAngles[medianIndex]?.angle || 0;
  }

  const totalWeight = filteredAngles.reduce((sum, a) => sum + a.weight, 0);

  if (totalWeight === 0) {
    const average = filteredAngles.reduce((sum, a) => sum + a.angle, 0) / filteredAngles.length;
    return average;
  }

  const weightedSum = filteredAngles.reduce((sum, a) => sum + a.angle * a.weight, 0);
  const weightedAverage = weightedSum / totalWeight;

  const methodCounts = filteredAngles.reduce(
    (counts, a) => {
      counts[a.method] = (counts[a.method] || 0) + 1;
      return counts;
    },
    {} as Record<string, number>
  );

  log(
    `Angle methods used: ${Object.entries(methodCounts)
      .map(([method, count]) => `${method}:${count}`)
      .join(", ")}`
  );

  return Math.max(minAngle, Math.min(maxAngle, weightedAverage));
}
