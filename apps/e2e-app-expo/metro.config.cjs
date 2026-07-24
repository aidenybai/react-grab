/* oxlint-disable typescript-eslint/no-require-imports */
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.resolver.unstable_enablePackageExports = true;

module.exports = config;
