import { cpToLib, exec } from "./utils";

// Write required files
await Promise.all(["./README.md", "./package.json"].map(cpToLib));

await exec`cd lib && bun publish --access=public`;
