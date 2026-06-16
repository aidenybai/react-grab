import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const EXPECTED_REPOSITORY_URL = "git+https://github.com/aidenybai/react-grab.git";
const WORKSPACE_GLOBS = ["packages", "apps"];

const rootDirectory = join(dirname(fileURLToPath(import.meta.url)), "..");

const collectPackageManifests = () => {
  const manifests = [];
  for (const workspaceGlob of WORKSPACE_GLOBS) {
    const workspaceDirectory = join(rootDirectory, workspaceGlob);
    if (!existsSync(workspaceDirectory)) continue;
    for (const entry of readdirSync(workspaceDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifestPath = join(workspaceDirectory, entry.name, "package.json");
      if (!existsSync(manifestPath)) continue;
      manifests.push(manifestPath);
    }
  }
  return manifests;
};

const offendingPackages = [];

for (const manifestPath of collectPackageManifests()) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.private === true) continue;

  const repositoryUrl =
    typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url;

  if (repositoryUrl !== EXPECTED_REPOSITORY_URL) {
    offendingPackages.push({
      name: manifest.name,
      manifestPath,
      repositoryUrl: repositoryUrl ?? "(missing)",
    });
  }
}

if (offendingPackages.length > 0) {
  console.error(
    `\nProvenance check failed. npm publish with provenance requires every publishable package to declare repository.url === "${EXPECTED_REPOSITORY_URL}".\n`,
  );
  for (const offendingPackage of offendingPackages) {
    console.error(
      `  - ${offendingPackage.name}: ${offendingPackage.repositoryUrl}\n    ${offendingPackage.manifestPath}`,
    );
  }
  console.error("");
  process.exit(1);
}

console.log("Provenance check passed: all publishable packages declare a matching repository.url.");
