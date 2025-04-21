import { $, file, write } from "bun";
import { join } from "node:path";

export const cpToLib = async (path: string): Promise<number> =>
  write(join("./lib", path), file(path));
export const exec: (...args: Parameters<typeof $>) => Promise<any> = async (
  ...args
) => $(...args).catch((err) => process.stderr.write(err.stderr as any));
