import { cpToLib, exec } from "./utils";

// Write required files
await Promise.all(
  [
    "./README.md",
    "./package.json",
    "./haarcascade_eye_tree_eyeglasses.xml",
    "./haarcascade_eye.xml",
    "./haarcascade_frontalface_default.xml",
  ].map(cpToLib)
);

await exec`cd lib && bun publish --access=public`;
