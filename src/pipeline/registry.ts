import cv from "@techstark/opencv-js";
import type {
  OperationFunction,
  OperationName,
  OperationOptions,
  OperationResult
} from "./types";

class OperationRegistry {
  private operations: Map<string, OperationFunction<any>> = new Map();
  private defaultOptions: Map<string, any> = new Map();

  register<Name extends OperationName>(
    name: Name,
    operation: OperationFunction<OperationOptions<Name>>,
    defaultOptions?: Partial<OperationOptions<Name>>
  ): void {
    this.operations.set(name, operation as OperationFunction<any>);
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

  getOperationNames(): OperationName[] {
    return Array.from(this.operations.keys()) as OperationName[];
  }
}

export const registry: OperationRegistry = new OperationRegistry();

export function executeOperation<Name extends OperationName>(
  operationName: Name,
  img: cv.Mat,
  options?: Partial<OperationOptions<Name>>
): OperationResult {
  const operation = registry.getOperation(operationName);
  if (!operation) {
    throw new Error(`Operation "${operationName}" not found in registry`);
  }

  const mergedOptions = {
    ...registry.getDefaultOptions(operationName),
    ...options,
  } as OperationOptions<Name>;

  return operation(img, mergedOptions);
}