import { cv } from "../../src/index.js";

/**
 * Runs `run` while recording every Mat that `cv.getStructuringElement`
 * returns, so a test can check that each kernel was deleted afterwards.
 */
export function recordKernels(run: () => void): cv.Mat[] {
  const kernels: cv.Mat[] = [];
  const getStructuringElement = cv.getStructuringElement;
  const spy = (...args: Parameters<typeof cv.getStructuringElement>) => {
    const kernel = getStructuringElement.apply(cv, args);
    kernels.push(kernel);
    return kernel;
  };
  // Embind resolves overloads through cv.getStructuringElement.overloadTable,
  // so the spy that replaces it must carry the same table.
  Object.assign(spy, { overloadTable: Reflect.get(getStructuringElement, "overloadTable") });
  cv.getStructuringElement = spy;

  try {
    run();
  } finally {
    cv.getStructuringElement = getStructuringElement;
  }

  return kernels;
}
