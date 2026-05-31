import { bench, do_not_optimize, run } from "mitata";
import {
  calculateBaselineAngles,
  calculateConsensusAngle,
  calculateLineAngle,
  calculateMinRectAngles,
} from "../src/deskew-angles";
import type { TextRegion, WeightedAngle } from "../src/deskew-angles";

type BenchContext<T> = { get(name: string): T };

function makePoints(pointCount: number, slope = 0.03): Array<{ x: number; y: number }> {
  return Array.from({ length: pointCount }, (_, i) => ({
    x: i,
    y: Math.round(i * slope + Math.sin(i / 41) * 8 + Math.cos(i / 97) * 3),
  }));
}

function makeRegion(pointCount: number, slope = 0.03, offsetX = 0): TextRegion {
  const data = new Int32Array(pointCount * 2);

  for (let i = 0; i < pointCount; i++) {
    const x = offsetX + i;
    const y = Math.round(i * slope + Math.sin(i / 37) * 11 + Math.cos(i / 113) * 5);
    data[i * 2] = x;
    data[i * 2 + 1] = y;
  }

  return {
    contour: {
      data32S: data,
    } as unknown as TextRegion["contour"],
    area: pointCount,
    aspectRatio: 4,
  };
}

function makeMinRectRegion(area: number, aspectRatio: number): TextRegion {
  return {
    contour: {
      data32S: new Int32Array([0, 0, 10, 0, 10, 10, 0, 10]),
    } as unknown as TextRegion["contour"],
    area,
    aspectRatio,
  };
}

function makeConsensusAngles(count: number): Array<WeightedAngle & { method: string }> {
  const methods = ["minRect", "baseline", "hough"];

  return Array.from({ length: count }, (_, i) => ({
    angle: Math.sin(i / 17) * 4 + Math.cos(i / 53) * 1.5,
    weight: 1 + (i % 31),
    method: methods[i % methods.length] ?? "minRect",
  }));
}

function makeMinRectCvStub() {
  const previous = globalThis.cv;

  globalThis.cv = {
    ...previous,
    minAreaRect: ((_contour: TextRegion["contour"]) => ({
      angle: 12,
    })) as typeof globalThis.cv.minAreaRect,
  };

  return () => {
    globalThis.cv = previous;
  };
}

const pointSets = {
  "line-angle/3": makePoints(3),
  "line-angle/100": makePoints(100),
  "line-angle/10k": makePoints(10_000),
  "line-angle/100k": makePoints(100_000),
};

const singleRegions = {
  "baseline/1k-points/1-region": [makeRegion(1_000)],
  "baseline/10k-points/1-region": [makeRegion(10_000)],
  "baseline/100k-points/1-region": [makeRegion(100_000)],
};

const multiRegions = {
  "baseline/100-regions/100-points": Array.from({ length: 100 }, (_, i) =>
    makeRegion(100, 0.02 + (i % 5) * 0.005, i * 200)
  ),
  "baseline/100-regions/1k-points": Array.from({ length: 100 }, (_, i) =>
    makeRegion(1_000, 0.02 + (i % 5) * 0.005, i * 2_000)
  ),
};

const consensusSets = {
  "consensus/10-angles": makeConsensusAngles(10),
  "consensus/1k-angles": makeConsensusAngles(1_000),
  "consensus/10k-angles": makeConsensusAngles(10_000),
};

for (const [name, points] of Object.entries(pointSets)) {
  bench(name, function* (ctx: BenchContext<typeof points>) {
    const input = ctx.get("points");

    yield {
      [0]() {
        return input;
      },

      bench(points: typeof input) {
        return do_not_optimize(calculateLineAngle(points));
      },
    };
  }).args("points", [points]);
}

for (const [name, regions] of Object.entries(singleRegions)) {
  bench(name, function* (ctx: BenchContext<typeof regions>) {
    const input = ctx.get("regions");

    yield {
      [0]() {
        return input;
      },

      bench(regions: typeof input) {
        return do_not_optimize(calculateBaselineAngles(regions));
      },
    };
  }).args("regions", [regions]);
}

for (const [name, regions] of Object.entries(multiRegions)) {
  bench(name, function* (ctx: BenchContext<typeof regions>) {
    const input = ctx.get("regions");

    yield {
      [0]() {
        return input;
      },

      bench(regions: typeof input) {
        return do_not_optimize(calculateBaselineAngles(regions));
      },
    };
  }).args("regions", [regions]);
}

for (const [name, angles] of Object.entries(consensusSets)) {
  bench(name, function* (ctx: BenchContext<typeof angles>) {
    const input = ctx.get("angles");

    yield {
      [0]() {
        return input;
      },

      bench(angles: typeof input) {
        return do_not_optimize(calculateConsensusAngle(angles, -15, 15, () => undefined));
      },
    };
  })
    .args("angles", [angles])
    .gc("inner");
}

const restoreCv = makeMinRectCvStub();
const minRectRegions = Array.from({ length: 10_000 }, (_, i) =>
  makeMinRectRegion(100 + i, 1.5 + (i % 10) / 10)
);

bench("min-rect/10k-regions", function* (ctx: BenchContext<typeof minRectRegions>) {
  const input = ctx.get("regions");

  yield {
    [0]() {
      return input;
    },

    bench(regions: typeof input) {
      return do_not_optimize(calculateMinRectAngles(regions));
    },
  };
}).args("regions", [minRectRegions]);

await run();
restoreCv();
