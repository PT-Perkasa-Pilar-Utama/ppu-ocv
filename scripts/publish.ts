import { cpToLibNoFolder, exec } from "./utils";

await exec`cd lib && bun publish --access=public`;
