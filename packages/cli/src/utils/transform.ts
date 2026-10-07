import { accessSync, constants, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Framework, NextRouterType } from "./detect.js";
import {
  NEXT_APP_ROUTER_SCRIPT,
  SCRIPT_IMPORT,
  SVELTEKIT_IMPORT,
  TANSTACK_EFFECT,
  VITE_IMPORT,
  WEBPACK_IMPORT,
} from "./templates.js";
import { hasReactGrabSetupCode } from "./react-grab-code.js";
import {
  findDocumentFile,
  findEntryFile,
  findIndexHtml,
  findLayoutFile,
  findTanStackRootFile,
  getDocumentFileCandidates,
  getEntryFileCandidates,
  getIndexHtmlCandidates,
  getInstrumentationFileCandidates,
  getLayoutFileCandidates,
  getSvelteKitSetupFileCandidates,
  getTanStackRootFileCandidates,
  isInstrumentationFile,
} from "./react-grab-setup-files.js";

export interface TransformResult {
  success: boolean;
  filePath: string;
  message: string;
  originalContent?: string;
  newContent?: string;
  noChanges?: boolean;
}

export interface ReactGrabOptions {
  activationKey?: string;
  activationMode?: "toggle" | "hold";
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
}

const hasReactGrabInInstrumentation = (projectRoot: string): boolean => {
  return findFileWithReactGrabSetup(getInstrumentationFileCandidates(projectRoot)) !== null;
};

const findFileWithReactGrabSetup = (fileCandidates: string[]): string | null => {
  for (const filePath of fileCandidates) {
    if (!existsSync(filePath)) continue;
    if (hasReactGrabSetupCode(readFileSync(filePath, "utf-8"))) return filePath;
  }
  return null;
};

const findSvelteKitHooksClientFile = (projectRoot: string): string | null => {
  const candidates = [
    join(projectRoot, "src", "hooks.client.ts"),
    join(projectRoot, "src", "hooks.client.js"),
  ];
  return candidates.find(existsSync) ?? null;
};

const findSvelteKitReactGrabFile = (projectRoot: string): string | null => {
  return findFileWithReactGrabSetup(getSvelteKitSetupFileCandidates(projectRoot));
};

const alreadyConfiguredResult = (filePath: string): TransformResult => ({
  success: true,
  filePath,
  message: "React Grab is already configured",
  noChanges: true,
});

const transformNextAppRouter = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const layoutPath = findLayoutFile(projectRoot);

  if (!layoutPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find app/layout.tsx, app/layout.jsx, app/layout.ts, or app/layout.js",
    };
  }

  const originalContent = readFileSync(layoutPath, "utf-8");
  let newContent = originalContent;
  const hasReactGrabInFile = hasReactGrabSetupCode(originalContent);
  const hasReactGrabInInstrumentationFile = hasReactGrabInInstrumentation(projectRoot);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return alreadyConfiguredResult(layoutPath);
  }

  if (hasReactGrabInFile || hasReactGrabInInstrumentationFile) {
    return {
      success: true,
      filePath: layoutPath,
      message:
        "React Grab is already installed" +
        (hasReactGrabInInstrumentationFile ? " in instrumentation-client" : " in this file"),
      noChanges: true,
    };
  }

  if (!newContent.includes('import Script from "next/script"')) {
    const importMatch = newContent.match(/^import .+ from ['"].+['"];?\s*$/m);
    if (importMatch) {
      newContent = newContent.replace(importMatch[0], `${importMatch[0]}\n${SCRIPT_IMPORT}`);
    } else {
      newContent = `${SCRIPT_IMPORT}\n\n${newContent}`;
    }
  }

  const headMatch = newContent.match(/<head[^>]*>/);
  if (headMatch) {
    newContent = newContent.replace(
      headMatch[0],
      `${headMatch[0]}\n        ${NEXT_APP_ROUTER_SCRIPT}`,
    );
  } else {
    const htmlMatch = newContent.match(/<html[^>]*>/);
    if (htmlMatch) {
      newContent = newContent.replace(
        htmlMatch[0],
        `${htmlMatch[0]}\n      <head>\n        ${NEXT_APP_ROUTER_SCRIPT}\n      </head>`,
      );
    }
  }

  return {
    success: true,
    filePath: layoutPath,
    message: "Add React Grab",
    originalContent,
    newContent,
  };
};

const transformNextPagesRouter = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const documentPath = findDocumentFile(projectRoot);

  if (!documentPath) {
    return {
      success: false,
      filePath: "",
      message:
        "Could not find pages/_document.tsx, pages/_document.jsx, pages/_document.ts, or pages/_document.js.\n\n" +
        "To set up React Grab with Pages Router, create pages/_document.tsx with:\n\n" +
        '  import { Html, Head, Main, NextScript } from "next/document";\n' +
        '  import Script from "next/script";\n\n' +
        "  export default function Document() {\n" +
        "    return (\n" +
        "      <Html>\n" +
        "        <Head>\n" +
        '          {process.env.NODE_ENV === "development" && (\n' +
        '            <Script src="//unpkg.com/react-grab/dist/index.global.js" strategy="beforeInteractive" />\n' +
        "          )}\n" +
        "        </Head>\n" +
        "        <body>\n" +
        "          <Main />\n" +
        "          <NextScript />\n" +
        "        </body>\n" +
        "      </Html>\n" +
        "    );\n" +
        "  }",
    };
  }

  const originalContent = readFileSync(documentPath, "utf-8");
  let newContent = originalContent;
  const hasReactGrabInFile = hasReactGrabSetupCode(originalContent);
  const hasReactGrabInInstrumentationFile = hasReactGrabInInstrumentation(projectRoot);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return alreadyConfiguredResult(documentPath);
  }

  if (hasReactGrabInFile || hasReactGrabInInstrumentationFile) {
    return {
      success: true,
      filePath: documentPath,
      message:
        "React Grab is already installed" +
        (hasReactGrabInInstrumentationFile ? " in instrumentation-client" : " in this file"),
      noChanges: true,
    };
  }

  if (!newContent.includes('import Script from "next/script"')) {
    const importMatch = newContent.match(/^import .+ from ['"].+['"];?\s*$/m);
    if (importMatch) {
      newContent = newContent.replace(importMatch[0], `${importMatch[0]}\n${SCRIPT_IMPORT}`);
    }
  }

  const headMatch = newContent.match(/<Head[^>]*>/);
  if (headMatch) {
    newContent = newContent.replace(
      headMatch[0],
      `${headMatch[0]}\n        ${NEXT_APP_ROUTER_SCRIPT}`,
    );
  }

  return {
    success: true,
    filePath: documentPath,
    message: "Add React Grab",
    originalContent,
    newContent,
  };
};

const checkExistingInstallation = (
  filePath: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult | null => {
  const content = readFileSync(filePath, "utf-8");
  if (!hasReactGrabSetupCode(content)) return null;

  return {
    success: true,
    filePath,
    message: reactGrabAlreadyConfigured
      ? "React Grab is already configured"
      : "React Grab is already installed in this file",
    noChanges: true,
  };
};

const transformVite = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const entryPath = findEntryFile(projectRoot);

  const indexPath = findIndexHtml(projectRoot);
  if (indexPath) {
    const existingResult = checkExistingInstallation(indexPath, reactGrabAlreadyConfigured);
    if (existingResult) return existingResult;
  }

  if (!entryPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find entry file (src/index.tsx, src/main.tsx, etc.)",
    };
  }

  const existingResult = checkExistingInstallation(entryPath, reactGrabAlreadyConfigured);
  if (existingResult) return existingResult;

  const originalContent = readFileSync(entryPath, "utf-8");
  const newContent = `${VITE_IMPORT}\n\n${originalContent}`;

  return {
    success: true,
    filePath: entryPath,
    message: "Add React Grab",
    originalContent,
    newContent,
  };
};

const transformWebpack = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const entryPath = findEntryFile(projectRoot);

  if (!entryPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find entry file (src/index.tsx, src/main.tsx, etc.)",
    };
  }

  const existingResult = checkExistingInstallation(entryPath, reactGrabAlreadyConfigured);
  if (existingResult) return existingResult;

  const originalContent = readFileSync(entryPath, "utf-8");
  const newContent = `${WEBPACK_IMPORT}\n\n${originalContent}`;

  return {
    success: true,
    filePath: entryPath,
    message: "Add React Grab",
    originalContent,
    newContent,
  };
};

const transformSvelteKit = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const existingReactGrabFile = findSvelteKitReactGrabFile(projectRoot);
  if (existingReactGrabFile) {
    const existingResult = checkExistingInstallation(
      existingReactGrabFile,
      reactGrabAlreadyConfigured,
    );
    if (existingResult) return existingResult;
  }

  if (!existsSync(join(projectRoot, "src"))) {
    return {
      success: false,
      filePath: "",
      message: "Could not find src/ directory for SvelteKit project",
    };
  }

  const existingHooks = findSvelteKitHooksClientFile(projectRoot);

  if (existingHooks) {
    const existing = checkExistingInstallation(existingHooks, reactGrabAlreadyConfigured);
    if (existing) return existing;

    const originalContent = readFileSync(existingHooks, "utf-8");
    const newContent = `${SVELTEKIT_IMPORT}\n\n${originalContent}`;
    return {
      success: true,
      filePath: existingHooks,
      message: "Add React Grab",
      originalContent,
      newContent,
    };
  }

  const newFilePath = join(projectRoot, "src", "hooks.client.ts");
  return {
    success: true,
    filePath: newFilePath,
    message: "Create src/hooks.client.ts with React Grab",
    originalContent: "",
    newContent: `${SVELTEKIT_IMPORT}\n`,
  };
};

const transformTanStack = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const rootPath = findTanStackRootFile(projectRoot);

  if (!rootPath) {
    return {
      success: false,
      filePath: "",
      message:
        "Could not find src/routes/__root.tsx or app/routes/__root.tsx.\n\n" +
        "To set up React Grab with TanStack Start, add this to your root route component:\n\n" +
        '  import { useEffect } from "react";\n\n' +
        "  useEffect(() => {\n" +
        "    if (import.meta.env.DEV) {\n" +
        '      void import("react-grab");\n' +
        "    }\n" +
        "  }, []);",
    };
  }

  const originalContent = readFileSync(rootPath, "utf-8");
  let newContent = originalContent;
  const hasReactGrabInFile = hasReactGrabSetupCode(originalContent);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return alreadyConfiguredResult(rootPath);
  }

  if (hasReactGrabInFile) {
    return {
      success: true,
      filePath: rootPath,
      message: "React Grab is already installed in this file",
      noChanges: true,
    };
  }

  const hasUseEffectImport = /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/.test(
    newContent,
  );
  if (!hasUseEffectImport) {
    const reactImportMatch = newContent.match(/import\s+\{([^}]*)\}\s+from\s+["']react["'];?/);
    if (reactImportMatch) {
      const existingImports = reactImportMatch[1];
      newContent = newContent.replace(
        reactImportMatch[0],
        `import { ${existingImports.trim()}, useEffect } from "react";`,
      );
    } else {
      const firstImportMatch = newContent.match(/^import .+ from ['"].+['"];?\s*$/m);
      if (firstImportMatch) {
        newContent = newContent.replace(
          firstImportMatch[0],
          `import { useEffect } from "react";\n${firstImportMatch[0]}`,
        );
      } else {
        newContent = `import { useEffect } from "react";\n\n${newContent}`;
      }
    }
  }

  const componentMatch = newContent.match(/function\s+(\w+)\s*\([^)]*\)\s*\{/);

  if (componentMatch) {
    const insertPosition = componentMatch.index! + componentMatch[0].length;
    newContent =
      newContent.slice(0, insertPosition) +
      `\n  ${TANSTACK_EFFECT}\n` +
      newContent.slice(insertPosition);
  } else {
    return {
      success: false,
      filePath: rootPath,
      message: "Could not find a component function in the root file",
    };
  }

  return {
    success: true,
    filePath: rootPath,
    message: "Add React Grab",
    originalContent,
    newContent,
  };
};

export const hasFrameworkEntryPoint = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
): boolean => {
  switch (framework) {
    case "next":
      return nextRouterType === "app"
        ? findLayoutFile(projectRoot) !== null
        : findDocumentFile(projectRoot) !== null;
    case "vite":
    case "webpack":
      return findEntryFile(projectRoot) !== null;
    case "tanstack":
      return findTanStackRootFile(projectRoot) !== null;
    case "sveltekit":
      return existsSync(join(projectRoot, "src"));
    default:
      return false;
  }
};

export const previewTransform = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  reactGrabAlreadyConfigured: boolean = false,
): TransformResult => {
  switch (framework) {
    case "next":
      if (nextRouterType === "app") {
        return transformNextAppRouter(projectRoot, reactGrabAlreadyConfigured);
      }
      return transformNextPagesRouter(projectRoot, reactGrabAlreadyConfigured);

    case "vite":
      return transformVite(projectRoot, reactGrabAlreadyConfigured);

    case "tanstack":
      return transformTanStack(projectRoot, reactGrabAlreadyConfigured);

    case "webpack":
      return transformWebpack(projectRoot, reactGrabAlreadyConfigured);

    case "sveltekit":
      return transformSvelteKit(projectRoot, reactGrabAlreadyConfigured);

    default:
      return {
        success: false,
        filePath: "",
        message: `Unknown framework: ${framework}. Please add React Grab manually.`,
      };
  }
};

const canWriteToFile = (filePath: string): boolean => {
  try {
    if (existsSync(filePath)) {
      accessSync(filePath, constants.W_OK);
    } else {
      accessSync(dirname(filePath), constants.W_OK);
    }
    return true;
  } catch {
    return false;
  }
};

export const applyTransform = (result: TransformResult): { success: boolean; error?: string } => {
  if (result.success && result.newContent && result.filePath) {
    if (!canWriteToFile(result.filePath)) {
      return {
        success: false,
        error: `Cannot write to ${result.filePath}. Check file permissions.`,
      };
    }

    try {
      writeFileSync(result.filePath, result.newContent);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to write to ${result.filePath}: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
  return { success: true };
};

const formatOptionsForNextjs = (options: ReactGrabOptions): string => {
  const parts: string[] = [];

  if (options.activationKey) {
    parts.push(`activationKey: ${JSON.stringify(options.activationKey)}`);
  }

  if (options.activationMode) {
    parts.push(`activationMode: "${options.activationMode}"`);
  }

  if (options.keyHoldDuration !== undefined) {
    parts.push(`keyHoldDuration: ${options.keyHoldDuration}`);
  }

  if (options.allowActivationInsideInput !== undefined) {
    parts.push(`allowActivationInsideInput: ${options.allowActivationInsideInput}`);
  }

  if (options.maxContextLines !== undefined) {
    parts.push(`maxContextLines: ${options.maxContextLines}`);
  }

  return `{ ${parts.join(", ")} }`;
};

const formatOptionsAsJson = (options: ReactGrabOptions): string => {
  const cleanOptions: Record<string, unknown> = {};

  if (options.activationKey) {
    cleanOptions.activationKey = options.activationKey;
  }

  if (options.activationMode) {
    cleanOptions.activationMode = options.activationMode;
  }

  if (options.keyHoldDuration !== undefined) {
    cleanOptions.keyHoldDuration = options.keyHoldDuration;
  }

  if (options.allowActivationInsideInput !== undefined) {
    cleanOptions.allowActivationInsideInput = options.allowActivationInsideInput;
  }

  if (options.maxContextLines !== undefined) {
    cleanOptions.maxContextLines = options.maxContextLines;
  }

  return JSON.stringify(cleanOptions);
};

const escapeSingleQuotedHtmlAttribute = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/'/g, "&#39;");

const findReactGrabFile = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
): string | null => {
  switch (framework) {
    case "next": {
      const primaryFile =
        nextRouterType === "app" ? findLayoutFile(projectRoot) : findDocumentFile(projectRoot);
      const primaryCandidates =
        nextRouterType === "app"
          ? getLayoutFileCandidates(projectRoot)
          : getDocumentFileCandidates(projectRoot);
      const primarySetupFile = findFileWithReactGrabSetup(primaryCandidates);
      if (primarySetupFile) return primarySetupFile;

      const instrumentationFile = findFileWithReactGrabSetup(
        getInstrumentationFileCandidates(projectRoot),
      );
      if (instrumentationFile) return instrumentationFile;

      return primaryFile;
    }
    case "vite": {
      const entryFile = findEntryFile(projectRoot);
      const entrySetupFile = findFileWithReactGrabSetup(getEntryFileCandidates(projectRoot));
      if (entrySetupFile) return entrySetupFile;

      const indexHtml = findFileWithReactGrabSetup(getIndexHtmlCandidates(projectRoot));
      if (indexHtml) return indexHtml;

      return entryFile;
    }
    case "tanstack": {
      const rootSetupFile = findFileWithReactGrabSetup(getTanStackRootFileCandidates(projectRoot));
      return rootSetupFile ?? findTanStackRootFile(projectRoot);
    }
    case "webpack": {
      const entrySetupFile = findFileWithReactGrabSetup(getEntryFileCandidates(projectRoot));
      return entrySetupFile ?? findEntryFile(projectRoot);
    }
    case "sveltekit":
      return findSvelteKitReactGrabFile(projectRoot) ?? findSvelteKitHooksClientFile(projectRoot);
    default:
      return null;
  }
};

const addOptionsToNextScript = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const reactGrabScriptMatch = originalContent.match(
    /(<Script[\s\S]*?react-grab[\s\S]*?)\s*(\/?>)/i,
  );

  if (!reactGrabScriptMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab Script tag",
    };
  }

  const scriptTag = reactGrabScriptMatch[0];
  const scriptOpening = reactGrabScriptMatch[1];
  const scriptClosing = reactGrabScriptMatch[2];

  const existingDataOptionsMatch = scriptTag.match(/data-options=\{JSON\.stringify\([^)]+\)\}/);

  const dataOptionsAttr = `data-options={JSON.stringify(\n              ${formatOptionsForNextjs(options)}\n            )}`;

  let newScriptTag: string;
  if (existingDataOptionsMatch) {
    newScriptTag = scriptTag.replace(existingDataOptionsMatch[0], dataOptionsAttr);
  } else {
    newScriptTag = `${scriptOpening}\n            ${dataOptionsAttr}\n          ${scriptClosing}`;
  }

  const newContent = originalContent.replace(scriptTag, newScriptTag);

  return {
    success: true,
    filePath,
    message: "Update React Grab options",
    originalContent,
    newContent,
  };
};

const addOptionsToDynamicImport = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const reactGrabImportWithInitMatch = originalContent.match(
    /(void\s+)?import\s*\(\s*["']react-grab(?:\/[^"']+)?["']\s*\)(?:\.then\s*\(\s*(?:\(m\)\s*=>\s*m\.init\s*\([^)]*\)|\(\{\s*init\s*\}\)\s*=>\s*init\s*\([^)]*\))\s*\))?/,
  );

  if (!reactGrabImportWithInitMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab import",
    };
  }

  const optionsJson = formatOptionsAsJson(options);
  const voidPrefix = reactGrabImportWithInitMatch[1] ?? "";
  const newImport = `${voidPrefix}import("react-grab").then((m) => m.init(${optionsJson}))`;

  const newContent = originalContent.replace(reactGrabImportWithInitMatch[0], newImport);

  return {
    success: true,
    filePath,
    message: "Update React Grab options",
    originalContent,
    newContent,
  };
};

const addOptionsToSvelteKitImport = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const reactGrabImportWithInitMatch = originalContent.match(
    /(?:void\s+)?import\s*\(\s*["']react-grab["']\s*\)(?:\.then\s*\(\s*\(m\)\s*=>\s*m\.init\s*\([^)]*\)\s*\))?/,
  );

  if (!reactGrabImportWithInitMatch) {
    const reactGrabScriptMatch = originalContent.match(/<script\b[^>]*react-grab[^>]*>/i);

    if (!reactGrabScriptMatch) {
      return {
        success: false,
        filePath,
        message: "Could not find React Grab import or script tag",
      };
    }

    const scriptTag = reactGrabScriptMatch[0];
    const optionsJson = formatOptionsAsJson(options);
    const escapedOptionsJson = escapeSingleQuotedHtmlAttribute(optionsJson);
    const dataOptionsAttr = `data-options='${escapedOptionsJson}'`;
    const existingDataOptionsMatch = scriptTag.match(/\sdata-options=(["']).*?\1/);
    const newScriptTag = existingDataOptionsMatch
      ? scriptTag.replace(existingDataOptionsMatch[0], ` ${dataOptionsAttr}`)
      : scriptTag.replace(/>$/, ` ${dataOptionsAttr}>`);
    const newContent = originalContent.replace(scriptTag, newScriptTag);

    return {
      success: true,
      filePath,
      message: "Update React Grab options",
      originalContent,
      newContent,
    };
  }

  const optionsJson = formatOptionsAsJson(options);
  const newImport = `import("react-grab").then((m) => m.init(${optionsJson}))`;

  const newContent = originalContent.replace(reactGrabImportWithInitMatch[0], newImport);

  return {
    success: true,
    filePath,
    message: "Update React Grab options",
    originalContent,
    newContent,
  };
};

const addOptionsToTanStackImport = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const reactGrabImportWithInitMatch = originalContent.match(
    /(?:(void\s+)?import\s*\(\s*["']react-grab\/core["']\s*\)\.then\s*\(\s*(?:\(\s*\{\s*init\s*\}\s*\)\s*=>\s*init\s*\([^)]*\)|\(m\)\s*=>\s*m\.init\s*\([^)]*\))\s*\)|(void\s+)?import\s*\(\s*["']react-grab(?!\/core)(?:\/[^"']+)?["']\s*\))/,
  );

  if (!reactGrabImportWithInitMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab import",
    };
  }

  const optionsJson = formatOptionsAsJson(options);
  const voidPrefix = reactGrabImportWithInitMatch[1] ?? reactGrabImportWithInitMatch[2] ?? "";
  const newImport = `${voidPrefix}import("react-grab/core").then(({ init }) => init(${optionsJson}))`;

  const newContent = originalContent.replace(reactGrabImportWithInitMatch[0], newImport);

  return {
    success: true,
    filePath,
    message: "Update React Grab options",
    originalContent,
    newContent,
  };
};

const addOptionsToAnyImport = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const dynamicImportResult = addOptionsToDynamicImport(originalContent, options, filePath);
  if (dynamicImportResult.success) return dynamicImportResult;
  return addOptionsToTanStackImport(originalContent, options, filePath);
};

export const previewOptionsTransform = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  options: ReactGrabOptions,
): TransformResult => {
  const filePath = findReactGrabFile(projectRoot, framework, nextRouterType);

  if (!filePath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find file containing React Grab configuration",
    };
  }

  const originalContent = readFileSync(filePath, "utf-8");

  if (!hasReactGrabSetupCode(originalContent)) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab code in the file",
    };
  }

  switch (framework) {
    case "next":
      if (isInstrumentationFile(filePath)) {
        return addOptionsToAnyImport(originalContent, options, filePath);
      }
      return addOptionsToNextScript(originalContent, options, filePath);
    case "vite":
      return addOptionsToDynamicImport(originalContent, options, filePath);
    case "tanstack":
      return addOptionsToTanStackImport(originalContent, options, filePath);
    case "webpack":
      return addOptionsToDynamicImport(originalContent, options, filePath);
    case "sveltekit":
      return addOptionsToSvelteKitImport(originalContent, options, filePath);
    default:
      return {
        success: false,
        filePath,
        message: `Unknown framework: ${framework}`,
      };
  }
};

export const previewCdnTransform = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  targetCdnDomain: string,
): TransformResult => {
  const filePath = findReactGrabFile(projectRoot, framework, nextRouterType);
  if (!filePath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find React Grab file",
    };
  }
  const originalContent = readFileSync(filePath, "utf-8");
  const newContent = originalContent
    .replace(/(https?:)?\/\/[^/\s"']+(?=\/(?:@?react-grab))/g, `//${targetCdnDomain}`)
    .replace(
      /(https?:)?\/\/[^/\s"']*react-grab[^/\s"']*\.com(?=\/script\.js)/g,
      `//${targetCdnDomain}`,
    );
  if (newContent === originalContent) {
    return {
      success: true,
      filePath,
      message: "CDN already set",
      noChanges: true,
    };
  }
  return {
    success: true,
    filePath,
    message: "Update CDN",
    originalContent,
    newContent,
  };
};
