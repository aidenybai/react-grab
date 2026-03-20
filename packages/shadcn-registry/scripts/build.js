import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CURRENT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const ROOT_DIRECTORY = resolve(CURRENT_DIRECTORY, "..");
const OUTPUT_DIRECTORY = resolve(ROOT_DIRECTORY, "r");

const registry = JSON.parse(
  readFileSync(resolve(ROOT_DIRECTORY, "registry.json"), "utf-8"),
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
      content: readFileSync(resolve(ROOT_DIRECTORY, file.path), "utf-8"),
      type: file.type,
      target: file.target,
    })),
  };

  const outputPath = resolve(OUTPUT_DIRECTORY, `${item.name}.json`);
  writeFileSync(outputPath, JSON.stringify(registryItem, null, 2) + "\n");
  console.log(`Built: ${outputPath}`);
}

console.log(`Registry build complete: ${registry.items.length} item(s)`);
