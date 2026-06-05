const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Watch the root workspace folder to allow resolving symlinked library files
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

config.watchFolders = [workspaceRoot];

// Force resolver to use the local node_modules of expo-demo for react, react-native, and skia
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, "node_modules/react"),
  "react-native": path.resolve(projectRoot, "node_modules/react-native"),
  "@shopify/react-native-skia": path.resolve(
    projectRoot,
    "node_modules/@shopify/react-native-skia"
  ),
};

module.exports = config;
