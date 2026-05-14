import type { cv } from "../cv-provider.js";
import type {
  OperationFunction,
  OperationName,
  OperationOptions,
  OperationResult,
} from "./index.js";

/**
 * Registry that maps operation names to their implementation functions and
 * default-option factories. Operation files call {@link OperationRegistry.register}
 * at module-load time to make themselves available to {@link executeOperation}.
 */
export class OperationRegistry {
  // oxlint-disable-next-line typescript/no-explicit-any -- registry surface holds heterogeneous operation signatures
  private operations: Map<string, OperationFunction<any>> = new Map();
  // oxlint-disable-next-line typescript/no-explicit-any -- registry surface holds heterogeneous operation signatures
  private defaultOptions: Map<string, any> = new Map();

  /**
   * Register a named operation.
   * @param name Unique operation name (must match a key in {@link RegisteredOperations}).
   * @param operation The function that performs the operation.
   * @param defaultOptions Optional factory returning default option values.
   */
  register<Name extends OperationName>(
    name: Name,
    operation: OperationFunction<OperationOptions<Name>>,
    defaultOptions?: () => Partial<OperationOptions<Name>>
  ): void {
    // oxlint-disable-next-line typescript/no-explicit-any -- registry surface holds heterogeneous operation signatures
    this.operations.set(name, operation as OperationFunction<any>);
    if (defaultOptions) {
      this.defaultOptions.set(name, defaultOptions);
    }
  }

  /** Look up the implementation for an operation by name. */
  // oxlint-disable-next-line typescript/no-explicit-any -- registry surface holds heterogeneous operation signatures
  getOperation(name: string): OperationFunction<any> | undefined {
    return this.operations.get(name);
  }

  /** Return the default-options factory for an operation, or an empty object if none was registered. */
  // oxlint-disable-next-line typescript/no-explicit-any -- registry surface holds heterogeneous operation signatures
  getDefaultOptionsGenerator(name: string): any {
    return this.defaultOptions.get(name) || {};
  }

  /** Return `true` if an operation with the given name has been registered. */
  hasOperation(name: string): boolean {
    return this.operations.has(name);
  }

  /** Return the names of all registered operations. */
  getOperationNames(): OperationName[] {
    return Array.from(this.operations.keys()) as OperationName[];
  }
}

/** Singleton registry populated by each `src/operations/*.ts` module at load time. */
export const registry: OperationRegistry = new OperationRegistry();

/**
 * Look up and execute a registered operation, merging caller-supplied options
 * with the operation's defaults.
 *
 * @param operationName Name of the registered operation.
 * @param img Input OpenCV Mat. The Mat is consumed (deleted) by the operation.
 * @param options Partial options to merge with the operation's defaults.
 * @returns The operation result containing the transformed Mat and its dimensions.
 * @throws {Error} If no operation with `operationName` is registered.
 */
export function executeOperation<Name extends OperationName>(
  operationName: Name,
  img: cv.Mat,
  options?: Partial<OperationOptions<Name>>
): OperationResult {
  const operation = registry.getOperation(operationName);
  if (!operation) {
    throw new Error(`Operation "${operationName}" not found in registry`);
  }

  const maybeGenerator = registry.getDefaultOptionsGenerator(operationName);
  const defaultOptionsGenerator: () => OperationOptions<Name> =
    typeof maybeGenerator === "function" ? maybeGenerator : () => ({}) as OperationOptions<Name>;

  const mergedOptions = {
    ...defaultOptionsGenerator(),
    ...options,
  } as OperationOptions<Name>;

  return operation(img, mergedOptions);
}
