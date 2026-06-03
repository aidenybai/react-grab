import { existsSync } from "node:fs";
import { join } from "node:path";

const COMPONENT_EXTENSIONS = ["tsx", "jsx", "ts", "js"];
const INSTRUMENTATION_EXTENSIONS = ["ts", "tsx", "js", "jsx", "mts", "cts", "mjs", "cjs"];
const ROUTE_EXTENSIONS = ["tsx", "jsx"];

const createFileCandidates = (
  projectRoot: string,
  directories: string[],
  baseName: string,
  extensions: string[],
): string[] => {
  const fileCandidates: string[] = [];
  for (const directory of directories) {
    for (const extension of extensions) {
      fileCandidates.push(join(projectRoot, directory, `${baseName}.${extension}`));
    }
  }
  return fileCandidates;
};

const findExistingFile = (fileCandidates: string[]): string | null => {
  for (const filePath of fileCandidates) {
    if (existsSync(filePath)) return filePath;
  }
  return null;
};

export const getLayoutFileCandidates = (projectRoot: string): string[] =>
  createFileCandidates(projectRoot, ["app", "src/app"], "layout", COMPONENT_EXTENSIONS);

export const getDocumentFileCandidates = (projectRoot: string): string[] =>
  createFileCandidates(projectRoot, ["pages", "src/pages"], "_document", COMPONENT_EXTENSIONS);

export const getInstrumentationFileCandidates = (projectRoot: string): string[] =>
  createFileCandidates(
    projectRoot,
    ["", "src"],
    "instrumentation-client",
    INSTRUMENTATION_EXTENSIONS,
  );

export const getIndexHtmlCandidates = (projectRoot: string): string[] => [
  join(projectRoot, "index.html"),
  join(projectRoot, "public", "index.html"),
];

export const getEntryFileCandidates = (projectRoot: string): string[] => [
  ...createFileCandidates(projectRoot, ["src"], "index", COMPONENT_EXTENSIONS),
  ...createFileCandidates(projectRoot, ["src"], "main", COMPONENT_EXTENSIONS),
];

export const getTanStackRootFileCandidates = (projectRoot: string): string[] =>
  createFileCandidates(projectRoot, ["src/routes", "app/routes"], "__root", ROUTE_EXTENSIONS);

export const getReactGrabSetupFileCandidates = (projectRoot: string): string[] => [
  ...getLayoutFileCandidates(projectRoot),
  ...getDocumentFileCandidates(projectRoot),
  ...getInstrumentationFileCandidates(projectRoot),
  ...getIndexHtmlCandidates(projectRoot),
  ...getEntryFileCandidates(projectRoot),
  ...getTanStackRootFileCandidates(projectRoot),
];

export const findLayoutFile = (projectRoot: string): string | null =>
  findExistingFile(getLayoutFileCandidates(projectRoot));

export const findDocumentFile = (projectRoot: string): string | null =>
  findExistingFile(getDocumentFileCandidates(projectRoot));

export const findInstrumentationFile = (projectRoot: string): string | null =>
  findExistingFile(getInstrumentationFileCandidates(projectRoot));

export const findIndexHtml = (projectRoot: string): string | null =>
  findExistingFile(getIndexHtmlCandidates(projectRoot));

export const findEntryFile = (projectRoot: string): string | null =>
  findExistingFile(getEntryFileCandidates(projectRoot));

export const findTanStackRootFile = (projectRoot: string): string | null =>
  findExistingFile(getTanStackRootFileCandidates(projectRoot));

export const isInstrumentationFile = (filePath: string): boolean =>
  /(?:^|[/\\])instrumentation-client\.[cm]?[jt]sx?$/.test(filePath);
