/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.overrideWebpackConfig((currentConfiguration) => {
  const rules = currentConfiguration.module?.rules ?? [];

  return {
    ...currentConfiguration,
    module: {
      ...currentConfiguration.module,
      rules: rules.map((rule) => {
        if (
          rule &&
          rule !== "..." &&
          rule.test instanceof RegExp &&
          rule.test.test("test.css")
        ) {
          return {
            ...rule,
            use: [
              ...(Array.isArray(rule.use) ? rule.use : []),
              {
                loader: "postcss-loader",
                options: {
                  postcssOptions: {
                    plugins: ["@tailwindcss/postcss"],
                  },
                },
              },
            ],
          };
        }
        return rule;
      }),
    },
  };
});
