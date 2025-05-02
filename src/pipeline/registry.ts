import cv from "@techstark/opencv-js";
import type {
  BaseOperationOptions,
  OperationFunction,
  OperationResult,
} from "./types";

class OperationRegistry {
  private operations: Map<string, OperationFunction<any>> = new Map();
  private defaultOptions: Map<string, any> = new Map();

  register<T extends BaseOperationOptions>(
    name: string,
    operation: OperationFunction<T>,
    defaultOptions?: Partial<T>
  ): void {
    this.operations.set(name, operation);
    if (defaultOptions) {
      this.defaultOptions.set(name, defaultOptions);
    }
  }

  getOperation(name: string): OperationFunction<any> | undefined {
    return this.operations.get(name);
  }

  getDefaultOptions(name: string): any {
    return this.defaultOptions.get(name) || {};
  }

  hasOperation(name: string): boolean {
    return this.operations.has(name);
  }

  getOperationNames(): string[] {
    return Array.from(this.operations.keys());
  }
}

export const registry: OperationRegistry = new OperationRegistry();

export function executeOperation(
  operationName: string,
  img: cv.Mat,
  options: any = {}
): OperationResult {
  const operation = registry.getOperation(operationName);
  if (!operation) {
    throw new Error(`Operation "${operationName}" not found in registry`);
  }

  const mergedOptions = {
    ...registry.getDefaultOptions(operationName),
    ...options,
  };

  return operation(img, mergedOptions);
}
