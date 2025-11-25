import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema, type Config } from "./types.js";

export const loadConfig = (): Config => {
  try {
    const configPath = resolve(process.cwd(), "react-grab.config.json");
    const configContent = readFileSync(configPath, "utf-8");
    const rawConfig = JSON.parse(configContent);
    const result = configSchema.safeParse(rawConfig);

    if (!result.success) {
      console.error("Invalid config:", result.error.issues);
      process.exit(1);
    }

    return result.data;
  } catch (error) {
    return {};
  }
};
