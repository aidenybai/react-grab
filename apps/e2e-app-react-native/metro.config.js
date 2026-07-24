/* oxlint-disable typescript-eslint/no-require-imports */
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(workspaceRoot, "node_modules"),
    ],
    unstable_enablePackageExports: true,
    unstable_enableSymlinks: true,
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
