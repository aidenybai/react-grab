import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const grabRoot = path.resolve(__dirname, "..");
const reactGrabRoot = path.resolve(__dirname, "../../react-grab");
const repoRoot = path.resolve(__dirname, "../../..");

const copyDistFiles = () => {
  const sourceDir = path.join(reactGrabRoot, "dist");
  const destDir = path.join(grabRoot, "dist");

  if (!fs.existsSync(sourceDir)) {
    console.error(
      `react-grab dist folder not found at ${sourceDir}. Run 'pnpm build' in react-grab first.`,
    );
    process.exit(1);
    return;
  }

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true });
  }

  fs.cpSync(sourceDir, destDir, { recursive: true });

  const files = fs.readdirSync(sourceDir);
  console.log(`Copied ${files.length} items from react-grab/dist to grab/dist`);
};

const transformReadme = () => {
  const sourceReadme = path.join(repoRoot, "README.md");
  const destReadme = path.join(grabRoot, "README.md");

  if (!fs.existsSync(sourceReadme)) {
    throw new Error(`README.md not found at ${sourceReadme}`);
  }

  let content = fs.readFileSync(sourceReadme, "utf8");

  content = content
    .replace(
      /# <img .* \/>.*React Grab/m,
      '# <img src="https://github.com/aidenybai/react-grab/blob/main/.github/public/logo.png?raw=true" width="60" align="center" /> Grab',
    )
    .replace(/bundlephobia\/minzip\/react-grab/g, "bundlephobia/minzip/grab")
    .replace(
      /bundlephobia\.com\/package\/react-grab/g,
      "bundlephobia.com/package/grab",
    )
    .replace(
      /img\.shields\.io\/npm\/v\/react-grab/g,
      "img.shields.io/npm/v/grab",
    )
    .replace(
      /img\.shields\.io\/npm\/dt\/react-grab/g,
      "img.shields.io/npm/dt/grab",
    )
    .replace(/npmjs\.com\/package\/react-grab/g, "npmjs.com/package/grab")
    .replace(/npm install react-grab/g, "npm install grab")
    .replace(/npm i react-grab/g, "npm i grab")
    .replace(/npx( -y)? react-grab@latest/g, "npx$1 grab@latest")
    .replace(/unpkg\.com\/react-grab/g, "unpkg.com/grab")
    .replace(/import\("react-grab"\)/g, 'import("grab")')
    .replace(/from "react-grab\/core"/g, 'from "grab/core"');

  fs.writeFileSync(destReadme, content);
  console.log("Generated grab/README.md from root README.md");
};

const syncPackageJson = () => {
  const sourcePackageJson = path.join(reactGrabRoot, "package.json");
  const destPackageJson = path.join(grabRoot, "package.json");

  const sourcePackage = JSON.parse(fs.readFileSync(sourcePackageJson, "utf8"));
  const destPackage = JSON.parse(fs.readFileSync(destPackageJson, "utf8"));

  destPackage.version = sourcePackage.version;
  destPackage.description = sourcePackage.description;
  destPackage.keywords = sourcePackage.keywords;
  destPackage.homepage = sourcePackage.homepage;
  destPackage.bugs = sourcePackage.bugs;
  destPackage.repository = sourcePackage.repository;
  destPackage.author = sourcePackage.author;
  destPackage.license = sourcePackage.license;

  fs.writeFileSync(
    destPackageJson,
    JSON.stringify(destPackage, null, 2) + "\n",
  );
  console.log(`Synced package.json (version: ${destPackage.version})`);
};

const copyLicense = () => {
  const sourceLicense = path.join(repoRoot, "LICENSE");
  const destLicense = path.join(grabRoot, "LICENSE");

  if (fs.existsSync(sourceLicense)) {
    fs.copyFileSync(sourceLicense, destLicense);
    console.log("Copied LICENSE");
  }
};

const main = () => {
  console.log("Building grab package...\n");

  copyDistFiles();
  transformReadme();
  syncPackageJson();
  copyLicense();

  console.log("\nDone!");
};

main();
