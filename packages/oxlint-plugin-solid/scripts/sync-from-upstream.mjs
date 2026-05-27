#!/usr/bin/env node
/**
 * Re-syncs `src/` against a pinned version of the upstream
 * oxlint-plugin-solidjs bundle. Run from the package root:
 *
 *   pnpm sync-from-upstream            # pulls UPSTREAM_VERSION
 *   pnpm sync-from-upstream 0.2.0      # pulls 0.2.0 instead
 *
 * What it does:
 *   1. Downloads the published tarball from the npm registry.
 *   2. Walks the `// packages/plugin-solid/src/<rel>.ts` section comments in
 *      the upstream `dist/index.js` and writes each section to the matching
 *      path under `src/`.
 *   3. Normalizes per-section: top-level `var X = ...` to `const X = ...`,
 *      strips bundler-induced numeric suffixes (`isFunctionNode4` etc.),
 *      converts `<X>_default = ...` to `const ruleDefinition` + a default
 *      export, and adds explicit imports for cross-file utility identifiers
 *      from `./utils`.
 *   4. Rewrites `src/index.ts` to import each rule by name and to wire the
 *      recommended config through `eslintCompatPlugin` from `@oxlint/plugins`
 *      (which we depend on as a regular dependency, not vendored).
 *
 * After running, rebuild and verify:
 *   pnpm build && cd ../.. && pnpm lint
 *
 * Note: oxfmt is intentionally excluded from `packages/oxlint-plugin-solid/src`
 * in the root `vite.config.ts` so re-sync output stays byte-stable until the
 * next intentional sync.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+(?:-[A-Za-z0-9.-]+)?$/;

const rawVersionArg = process.argv[2] ?? "0.1.1";
if (!VERSION_PATTERN.test(rawVersionArg)) {
  console.error(
    `Invalid version "${rawVersionArg}". Expected a semver like 0.1.1 or 0.2.0-beta.1.`,
  );
  process.exit(1);
}
const UPSTREAM_VERSION = rawVersionArg;
const PACKAGE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC_ROOT = join(PACKAGE_ROOT, "src");
const STAGING_DIR = join(PACKAGE_ROOT, ".sync-staging");

const SUFFIX_RENAMES = {
  isFunctionNode2: "isFunctionNode",
  isFunctionNode3: "isFunctionNode",
  isFunctionNode4: "isFunctionNode",
  isPropsByName2: "isPropsByName",
  getFunctionName2: "getFunctionName",
  getPropertyName2: "getPropertyName",
  getStaticValue2: "getStaticValue",
};

const UTILS_EXPORTS = {
  HTML_TAGS: "utils/jsx.js",
  isDOMElementName: "utils/jsx.js",
  isJSXElementOrFragment: "utils/jsx.js",
  jsxPropName: "utils/jsx.js",
  jsxGetAllProps: "utils/jsx.js",
  jsxHasProp: "utils/jsx.js",
  jsxGetProp: "utils/jsx.js",
  trace: "utils/trace.js",
  trackImports: "utils/imports.js",
  find: "utils/traverse.js",
  findParent: "utils/traverse.js",
};

const RULE_NAMES = [
  ["components-return-once", "componentsReturnOnce"],
  ["event-handlers", "eventHandlers"],
  ["imports", "imports"],
  ["jsx-no-duplicate-props", "jsxNoDuplicateProps"],
  ["jsx-no-script-url", "jsxNoScriptUrl"],
  ["jsx-no-undef", "jsxNoUndef"],
  ["jsx-uses-vars", "jsxUsesVars"],
  ["no-array-handlers", "noArrayHandlers"],
  ["no-destructure", "noDestructure"],
  ["no-innerhtml", "noInnerhtml"],
  ["no-proxy-apis", "noProxyApis"],
  ["no-react-deps", "noReactDeps"],
  ["no-react-specific-props", "noReactSpecificProps"],
  ["no-unknown-namespaces", "noUnknownNamespaces"],
  ["prefer-classlist", "preferClasslist"],
  ["prefer-for", "preferFor"],
  ["prefer-show", "preferShow"],
  ["reactivity", "reactivity"],
  ["self-closing-comp", "selfClosingComp"],
  ["style-prop", "styleProp"],
];

const RECOMMENDED_CONFIG = {
  "solid/jsx-no-duplicate-props": "error",
  "solid/jsx-no-undef": "error",
  "solid/jsx-uses-vars": "error",
  "solid/no-unknown-namespaces": "error",
  "solid/no-innerhtml": "error",
  "solid/jsx-no-script-url": "error",
  "solid/components-return-once": "warn",
  "solid/no-destructure": "error",
  "solid/prefer-for": "error",
  "solid/reactivity": "warn",
  "solid/event-handlers": "warn",
  "solid/imports": "warn",
  "solid/style-prop": "warn",
  "solid/no-react-deps": "warn",
  "solid/no-react-specific-props": "warn",
  "solid/self-closing-comp": "warn",
  "solid/no-array-handlers": "off",
  "solid/prefer-show": "off",
  "solid/no-proxy-apis": "off",
  "solid/prefer-classlist": "off",
};

const renameSuffixedIdentifiers = (text) => {
  let next = text;
  for (const [suffixed, base] of Object.entries(SUFFIX_RENAMES)) {
    next = next.replace(new RegExp(String.raw`\b${suffixed}\b`, "g"), base);
  }
  return next;
};

const convertDefaultExport = (text) => {
  const match = /^var\s+(\w+_default)\s*=\s*/m.exec(text);
  if (!match) return text;
  const [, originalName] = match;
  let next = text.replace(match[0], "const ruleDefinition = ");
  if (!next.endsWith("\n")) next += "\n";
  next += "\nexport default ruleDefinition;\n";
  return next.replace(new RegExp(String.raw`\b${originalName}\b`, "g"), "ruleDefinition");
};

const convertTopLevelVar = (text) => text.replace(/^var\s+/gm, "const ");

const exportTopLevelDeclarations = (text) =>
  text.replace(/^(function\*?|const|let)\s+/gm, (matched) => `export ${matched.trim()} `);

const isLocallyDeclared = (text, symbol) => {
  const declarationPattern = new RegExp(
    String.raw`^(?:export\s+)?(?:function|const|let)\s+${symbol}\b`,
    "m",
  );
  const generatorPattern = new RegExp(String.raw`^(?:export\s+)?function\*\s+${symbol}\b`, "m");
  return declarationPattern.test(text) || generatorPattern.test(text);
};

const injectUtilityImports = (text, fileRelativePath) => {
  const importsBySource = new Map();
  const fileDir = dirname(fileRelativePath);
  for (const [symbol, sourceFromSrcRoot] of Object.entries(UTILS_EXPORTS)) {
    const bareIdentifierPattern = new RegExp(String.raw`(?<![\w.])${symbol}(?![\w])`);
    if (!bareIdentifierPattern.test(text)) continue;
    if (isLocallyDeclared(text, symbol)) continue;
    let relativeImport = relative(fileDir, sourceFromSrcRoot).replaceAll("\\", "/");
    if (!relativeImport.startsWith(".")) relativeImport = `./${relativeImport}`;
    if (!importsBySource.has(relativeImport)) {
      importsBySource.set(relativeImport, new Set());
    }
    importsBySource.get(relativeImport).add(symbol);
  }
  if (importsBySource.size === 0) return text;
  const importLines = [...importsBySource.entries()]
    .sort(([sourceA], [sourceB]) => sourceA.localeCompare(sourceB))
    .map(([source, symbols]) => `import { ${[...symbols].sort().join(", ")} } from "${source}";`);
  return `${importLines.join("\n")}\n\n${text}`;
};

const processRuleFile = (text, fileRelativePath) => {
  let next = renameSuffixedIdentifiers(text);
  next = convertDefaultExport(next);
  next = convertTopLevelVar(next);
  next = injectUtilityImports(next, fileRelativePath);
  return next;
};

const processUtilFile = (text) => {
  let next = renameSuffixedIdentifiers(text);
  next = convertTopLevelVar(next);
  next = exportTopLevelDeclarations(next);
  return next;
};

const renderIndexFile = () => {
  const importLines = [
    'import { eslintCompatPlugin } from "@oxlint/plugins";',
    ...RULE_NAMES.map(([kebab, camel]) => `import ${camel} from "./rules/${kebab}.js";`),
  ];
  const ruleEntries = RULE_NAMES.map(([kebab, camel]) => `    "${kebab}": ${camel},`).join("\n");
  const recommendedEntries = Object.entries(RECOMMENDED_CONFIG)
    .map(([rule, severity]) => `        "${rule}": "${severity}",`)
    .join("\n");
  return `${importLines.join("\n")}

const plugin = eslintCompatPlugin({
  meta: { name: "oxlint-plugin-solidjs" },
  rules: {
${ruleEntries}
  },
  configs: {
    recommended: {
      rules: {
${recommendedEntries}
      },
    },
  },
});

export default plugin;
`;
};

const runProcess = (command, args, options = {}) => {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} exited with status ${result.status ?? result.signal}`,
    );
  }
};

const downloadTarball = (version) => {
  if (existsSync(STAGING_DIR)) rmSync(STAGING_DIR, { recursive: true, force: true });
  mkdirSync(STAGING_DIR, { recursive: true });
  const tarballUrl = `https://registry.npmjs.org/oxlint-plugin-solidjs/-/oxlint-plugin-solidjs-${version}.tgz`;
  const tarballPath = join(STAGING_DIR, "upstream.tgz");
  console.log(`Fetching ${tarballUrl}`);
  runProcess("curl", ["-fsSL", "-o", tarballPath, tarballUrl]);
  runProcess("tar", ["-xzf", tarballPath, "-C", STAGING_DIR]);
  return join(STAGING_DIR, "package", "dist", "index.js");
};

const SAFE_SECTION_PATH = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.ts$/;
const SECTION_BOUNDARY = /^\/\/ packages\/plugin-solid\/src\/([^\s]+\.ts)$/;

const isSafeSectionPath = (relativePath) =>
  SAFE_SECTION_PATH.test(relativePath) &&
  !relativePath.split("/").includes("..") &&
  !relativePath.startsWith("/");

const splitBundle = (bundleText) => {
  const sections = [];
  let currentRelativePath = null;
  let currentLines = [];
  for (const line of bundleText.split("\n")) {
    const match = SECTION_BOUNDARY.exec(line);
    if (match) {
      if (currentRelativePath != null) {
        sections.push({ relativePath: currentRelativePath, lines: currentLines });
      }
      const candidate = match[1];
      if (!isSafeSectionPath(candidate)) {
        throw new Error(
          `Refusing to write section "${candidate}": upstream bundle contains an unsafe path that would escape src/.`,
        );
      }
      currentRelativePath = candidate;
      currentLines = [];
      continue;
    }
    if (currentRelativePath == null) continue;
    currentLines.push(line);
  }
  if (currentRelativePath != null) {
    sections.push({ relativePath: currentRelativePath, lines: currentLines });
  }
  return sections;
};

const MINIMUM_EXPECTED_SECTIONS = 20;

const main = () => {
  const bundlePath = downloadTarball(UPSTREAM_VERSION);
  const bundleText = readFileSync(bundlePath, "utf8");
  const sections = splitBundle(bundleText);

  if (sections.length < MINIMUM_EXPECTED_SECTIONS) {
    throw new Error(
      `Found only ${sections.length} sections in the upstream bundle (expected at least ${MINIMUM_EXPECTED_SECTIONS}). Refusing to delete src/ — the upstream bundle layout likely changed and this script needs to be updated before re-running.`,
    );
  }

  if (existsSync(SRC_ROOT)) rmSync(SRC_ROOT, { recursive: true, force: true });
  mkdirSync(SRC_ROOT, { recursive: true });

  for (const { relativePath, lines } of sections) {
    if (relativePath === "index.ts") continue;
    const outputPath = join(SRC_ROOT, relativePath);
    mkdirSync(dirname(outputPath), { recursive: true });
    const body = `${lines.join("\n").replace(/\s+$/, "")}\n`;
    const isUtil = relativePath.startsWith("utils/");
    const processed = isUtil ? processUtilFile(body) : processRuleFile(body, relativePath);
    writeFileSync(outputPath, processed);
    console.log(`wrote src/${relativePath}`);
  }

  writeFileSync(join(SRC_ROOT, "index.ts"), renderIndexFile());
  console.log("wrote src/index.ts");

  rmSync(STAGING_DIR, { recursive: true, force: true });
  console.log(`\nSynced from oxlint-plugin-solidjs@${UPSTREAM_VERSION}.`);
  console.log(
    "Next: hand-fix any newly unused imports, then `pnpm build && cd ../.. && pnpm lint`.",
  );
};

main();
