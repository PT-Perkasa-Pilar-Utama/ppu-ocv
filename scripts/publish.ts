import { cpToLibNoFolder, exec } from "./utils";

// Write required files
await Promise.all(["./README.md", "./package.json"].map(cpToLibNoFolder));

await exec`cd lib && bun publish --access=public`;
