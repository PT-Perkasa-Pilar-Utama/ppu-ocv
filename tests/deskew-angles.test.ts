import { describe, expect, test } from "bun:test";
import {
  calculateBaselineAngles,
  calculateConsensusAngle,
  calculateLineAngle,
} from "../src/deskew-angles";
import type { TextRegion, WeightedAngle } from "../src/deskew-angles";

/** Build a TextRegion whose contour exposes only the `data32S` the helpers read. */
function region(coords: number[], area = 100, aspectRatio = 4): TextRegion {
  return {
    contour: { data32S: new Int32Array(coords) } as unknown as TextRegion["contour"],
    area,
    aspectRatio,
  };
}

describe("calculateLineAngle", () => {
  test("returns 0 for fewer than two points", () => {
    expect(calculateLineAngle([])).toBe(0);
    expect(calculateLineAngle([{ x: 1, y: 1 }])).toBe(0);
  });

  test("returns 0 for a horizontal line", () => {
    expect(
      calculateLineAngle([
        { x: 0, y: 5 },
        { x: 10, y: 5 },
      ])
    ).toBe(0);
  });

  test("returns 0 for a vertical line (degenerate denominator)", () => {
    expect(
      calculateLineAngle([
        { x: 3, y: 0 },
        { x: 3, y: 10 },
        { x: 3, y: 20 },
      ])
    ).toBe(0);
  });

  test("fits the least-squares slope as a degree angle", () => {
    expect(
      calculateLineAngle([
        { x: 0, y: 0 },
        { x: 10, y: 1 },
      ])
    ).toBeCloseTo(5.7106, 3);
  });

  test("clamps slopes steeper than 45 degrees into the ±45 band", () => {
    // slope 2 → atan ≈ 63.43°, wrapped to 63.43 - 90 = -26.57°
    expect(
      calculateLineAngle([
        { x: 0, y: 0 },
        { x: 1, y: 2 },
      ])
    ).toBeCloseTo(-26.565, 3);
  });
});

describe("calculateBaselineAngles", () => {
  // Pins the equal-WIDTH (spatial thirds) heuristic introduced in this change,
  // not the prior equal-COUNT split. The x distribution below is non-uniform:
  // an equal-count split would partition by rank and select different points.
  test("buckets points into spatial x-thirds and fits the max-y per third", () => {
    // bucket0 [0,30): (0,10) (5,50) (20,30) → max-y (5,50)
    // bucket1 [30,60): (40,80) (45,20)       → max-y (40,80)
    // bucket2 [60,90]: (70,100) (90,60)       → max-y (70,100)
    const out = calculateBaselineAngles([
      region([0, 10, 5, 50, 20, 30, 40, 80, 45, 20, 70, 100, 90, 60], 100, 4),
    ]);

    expect(out).toHaveLength(1);
    expect(out[0]?.angle).toBeCloseTo(37.6557, 3);
    // weight = area * min(aspectRatio, 1/aspectRatio) = 100 * 0.25
    expect(out[0]?.weight).toBeCloseTo(25, 6);
  });

  test("skips contours with fewer than 8 int32 values", () => {
    expect(calculateBaselineAngles([region([0, 0, 1, 1, 2, 2])])).toEqual([]);
  });

  test("skips near-vertical contours that collapse into a single bucket", () => {
    // All points share one x → xRange falls back to 1 → every point lands in
    // bucket 0 → a single baseline point → region contributes no vote.
    expect(calculateBaselineAngles([region([3, 0, 3, 10, 3, 20, 3, 30])])).toEqual([]);
  });

  test("still fits when only two of three buckets are populated", () => {
    // Points fall only in bucket0 [0,30) and bucket2 [60,90]; middle stays empty.
    const out = calculateBaselineAngles([region([0, 10, 5, 50, 70, 100, 90, 60])]);
    expect(out).toHaveLength(1);
    expect(out[0]?.angle).toBeCloseTo(37.5686, 3);
  });
});

describe("calculateConsensusAngle", () => {
  const noopLog = () => {};
  const angle = (
    a: number,
    weight: number,
    method = "baseline"
  ): WeightedAngle & {
    method: string;
  } => ({ angle: a, weight, method });

  test("returns 0 for an empty candidate set", () => {
    expect(calculateConsensusAngle([], -20, 20, noopLog)).toBe(0);
  });

  test("computes the weighted mean of inliers", () => {
    const out = calculateConsensusAngle([angle(2, 1), angle(4, 3)], -20, 20, noopLog);
    // (2*1 + 4*3) / (1+3) = 14/4 = 3.5
    expect(out).toBeCloseTo(3.5, 6);
  });

  test("falls back to the median when every candidate is out of range", () => {
    let message = "";
    // Both angles exceed maxAngle, so the range filter empties the inlier set
    // and the function returns the median of the original sorted candidates.
    const out = calculateConsensusAngle([angle(18, 1), angle(19, 1)], -10, 10, (m) => {
      message = m;
    });
    expect(out).toBe(19);
    expect(message).toContain("filtered out");
  });

  // F2: the totalWeight === 0 path returns the unweighted mean and must NOT log.
  test("returns the unweighted mean and does not log when total weight is 0", () => {
    let logged = false;
    const out = calculateConsensusAngle([angle(2, 0), angle(6, 0)], -20, 20, () => {
      logged = true;
    });
    expect(out).toBeCloseTo(4, 6);
    expect(logged).toBe(false);
  });

  test("logs the method mix on the weighted path", () => {
    let message = "";
    calculateConsensusAngle([angle(2, 1, "hough"), angle(4, 2, "hough")], -20, 20, (m) => {
      message = m;
    });
    expect(message).toContain("hough:2");
  });
});
