import { beforeAll, expect, test } from "bun:test";
import { cv, ImageProcessor } from "../src/index.js";
import { writeToNewMat } from "../src/write-to-new-mat.js";

beforeAll(async () => {
  await ImageProcessor.initRuntime();
});

test("writeToNewMat returns the Mat the call wrote into", () => {
  const out = writeToNewMat((mat) => {
    new cv.Mat(2, 3, cv.CV_8UC1, new cv.Scalar(7)).copyTo(mat);
  });

  expect([out.rows, out.cols, out.data[0]]).toEqual([2, 3, 7]);
  out.delete();
});

// OpenCV.js Mats live on the WASM heap and the GC never frees them, so an
// output Mat must not outlive a call that throws.
test("writeToNewMat frees the Mat and rethrows when the call throws", () => {
  const failure = new Error("opencv failed");
  let written: cv.Mat | undefined;

  expect(() =>
    writeToNewMat((mat) => {
      written = mat;
      throw failure;
    })
  ).toThrow(failure);
  expect(written?.isDeleted()).toBe(true);
});
