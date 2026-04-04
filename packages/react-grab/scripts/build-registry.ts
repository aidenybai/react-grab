import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

interface RegistryFile {
  path: string;
  type: string;
  target?: string;
}

interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies: string[];
  files: RegistryFile[];
}

interface Registry {
  $schema: string;
  name: string;
  homepage: string;
  items: RegistryItem[];
}

const SCRIPTS_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(SCRIPTS_DIRECTORY, "..");
const REGISTRY_SOURCE_DIRECTORY = resolve(PACKAGE_ROOT, "src", "registry");
const OUTPUT_DIRECTORY = resolve(PACKAGE_ROOT, "..", "..", "apps", "website", "public", "r");

const registry: Registry = JSON.parse(
  readFileSync(resolve(REGISTRY_SOURCE_DIRECTORY, "registry.json"), "utf-8"),
);

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

for (const item of registry.items) {
  const registryItem = {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies,
    files: item.files.map((file) => ({
      path: file.target ?? file.path,
      content: readFileSync(resolve(REGISTRY_SOURCE_DIRECTORY, file.path), "utf-8"),
      type: file.type,
      target: file.target,
    })),
  };

  const outputPath = resolve(OUTPUT_DIRECTORY, `${item.name}.json`);
  writeFileSync(outputPath, JSON.stringify(registryItem, null, 2) + "\n");
  console.log(`Built: ${outputPath}`);
}

writeFileSync(resolve(OUTPUT_DIRECTORY, "index.json"), JSON.stringify(registry, null, 2) + "\n");

console.log(`Registry build complete: ${registry.items.length} item(s)`);
