import { cpToLib, exec } from "./utils";

// Write required files
await Promise.all(
  [
    "./README.md",
    "./package.json",
    "./src/haarcascade_eye_tree_eyeglasses.xml",
    "./src/haarcascade_eye.xml",
    "./src/haarcascade_frontalface_default.xml",
  ].map(cpToLib)
);

await exec`cd lib && bun publish --access=public`;
