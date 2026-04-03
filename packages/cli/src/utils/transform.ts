import { accessSync, constants, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Framework, NextRouterType } from "./detect.js";
import {
  NEXT_APP_ROUTER_SCRIPT,
  SCRIPT_IMPORT,
  TANSTACK_EFFECT,
  VITE_IMPORT,
  WEBPACK_IMPORT,
} from "./templates.js";

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

const hasReactGrabCode = (content: string): boolean => {
  const fuzzyPatterns = [
    /["'`][^"'`]*react-grab/,
    /react-grab[^"'`]*["'`]/,
    /<[^>]*react-grab/i,
    /import[^;]*react-grab/i,
    /require[^)]*react-grab/i,
    /from\s+[^;]*react-grab/i,
    /src[^>]*react-grab/i,
    /href[^>]*react-grab/i,
  ];
  return fuzzyPatterns.some((pattern) => pattern.test(content));
};

const findLayoutFile = (projectRoot: string): string | null => {
  const possiblePaths = [
    join(projectRoot, "app", "layout.tsx"),
    join(projectRoot, "app", "layout.jsx"),
    join(projectRoot, "src", "app", "layout.tsx"),
    join(projectRoot, "src", "app", "layout.jsx"),
  ];

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const findInstrumentationFile = (projectRoot: string): string | null => {
  const possiblePaths = [
    join(projectRoot, "instrumentation-client.ts"),
    join(projectRoot, "instrumentation-client.js"),
    join(projectRoot, "src", "instrumentation-client.ts"),
    join(projectRoot, "src", "instrumentation-client.js"),
  ];

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const hasReactGrabInInstrumentation = (projectRoot: string): boolean => {
  const instrumentationPath = findInstrumentationFile(projectRoot);
  if (!instrumentationPath) return false;

  const content = readFileSync(instrumentationPath, "utf-8");
  return hasReactGrabCode(content);
};

const findDocumentFile = (projectRoot: string): string | null => {
  const possiblePaths = [
    join(projectRoot, "pages", "_document.tsx"),
    join(projectRoot, "pages", "_document.jsx"),
    join(projectRoot, "src", "pages", "_document.tsx"),
    join(projectRoot, "src", "pages", "_document.jsx"),
  ];

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const findIndexHtml = (projectRoot: string): string | null => {
  const possiblePaths = [
    join(projectRoot, "index.html"),
    join(projectRoot, "public", "index.html"),
  ];

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const findEntryFile = (projectRoot: string): string | null => {
  const possiblePaths = [
    join(projectRoot, "src", "index.tsx"),
    join(projectRoot, "src", "index.jsx"),
    join(projectRoot, "src", "index.ts"),
    join(projectRoot, "src", "index.js"),
    join(projectRoot, "src", "main.tsx"),
    join(projectRoot, "src", "main.jsx"),
    join(projectRoot, "src", "main.ts"),
    join(projectRoot, "src", "main.js"),
  ];

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
};

const findTanStackRootFile = (projectRoot: string): string | null => {
  const possiblePaths = [
    join(projectRoot, "src", "routes", "__root.tsx"),
    join(projectRoot, "src", "routes", "__root.jsx"),
    join(projectRoot, "app", "routes", "__root.tsx"),
    join(projectRoot, "app", "routes", "__root.jsx"),
  ];

  for (const filePath of possiblePaths) {
    if (existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
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
  force: boolean = false,
): TransformResult => {
  const layoutPath = findLayoutFile(projectRoot);

  if (!layoutPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find app/layout.tsx or app/layout.jsx",
    };
  }

  const originalContent = readFileSync(layoutPath, "utf-8");
  let newContent = originalContent;
  const hasReactGrabInFile = hasReactGrabCode(originalContent);
  const hasReactGrabInInstrumentationFile = hasReactGrabInInstrumentation(projectRoot);

  if (!force && hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return alreadyConfiguredResult(layoutPath);
  }

  if (!force && (hasReactGrabInFile || hasReactGrabInInstrumentationFile)) {
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
  force: boolean = false,
): TransformResult => {
  const documentPath = findDocumentFile(projectRoot);

  if (!documentPath) {
    return {
      success: false,
      filePath: "",
      message:
        "Could not find pages/_document.tsx or pages/_document.jsx.\n\n" +
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
  const hasReactGrabInFile = hasReactGrabCode(originalContent);
  const hasReactGrabInInstrumentationFile = hasReactGrabInInstrumentation(projectRoot);

  if (!force && hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return alreadyConfiguredResult(documentPath);
  }

  if (!force && (hasReactGrabInFile || hasReactGrabInInstrumentationFile)) {
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
  if (!hasReactGrabCode(content)) return null;

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
  force: boolean = false,
): TransformResult => {
  const entryPath = findEntryFile(projectRoot);

  if (!force) {
    const indexPath = findIndexHtml(projectRoot);
    if (indexPath) {
      const existingResult = checkExistingInstallation(indexPath, reactGrabAlreadyConfigured);
      if (existingResult) return existingResult;
    }
  }

  if (!entryPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find entry file (src/index.tsx, src/main.tsx, etc.)",
    };
  }

  if (!force) {
    const existingResult = checkExistingInstallation(entryPath, reactGrabAlreadyConfigured);
    if (existingResult) return existingResult;
  }

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
  force: boolean = false,
): TransformResult => {
  const entryPath = findEntryFile(projectRoot);

  if (!entryPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find entry file (src/index.tsx, src/main.tsx, etc.)",
    };
  }

  if (!force) {
    const existingResult = checkExistingInstallation(entryPath, reactGrabAlreadyConfigured);
    if (existingResult) return existingResult;
  }

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

const transformTanStack = (
  projectRoot: string,
  reactGrabAlreadyConfigured: boolean,
  force: boolean = false,
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
  const hasReactGrabInFile = hasReactGrabCode(originalContent);

  if (!force && hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return alreadyConfiguredResult(rootPath);
  }

  if (!force && hasReactGrabInFile) {
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

export const previewTransform = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  reactGrabAlreadyConfigured: boolean = false,
  force: boolean = false,
): TransformResult => {
  switch (framework) {
    case "next":
      if (nextRouterType === "app") {
        return transformNextAppRouter(projectRoot, reactGrabAlreadyConfigured, force);
      }
      return transformNextPagesRouter(projectRoot, reactGrabAlreadyConfigured, force);

    case "vite":
      return transformVite(projectRoot, reactGrabAlreadyConfigured, force);

    case "tanstack":
      return transformTanStack(projectRoot, reactGrabAlreadyConfigured, force);

    case "webpack":
      return transformWebpack(projectRoot, reactGrabAlreadyConfigured, force);

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
    accessSync(filePath, constants.W_OK);
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

const findReactGrabFile = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
): string | null => {
  switch (framework) {
    case "next":
      if (nextRouterType === "app") {
        return findLayoutFile(projectRoot);
      }
      return findDocumentFile(projectRoot);
    case "vite": {
      const entryFile = findEntryFile(projectRoot);
      if (entryFile && hasReactGrabCode(readFileSync(entryFile, "utf-8"))) {
        return entryFile;
      }
      const indexHtml = findIndexHtml(projectRoot);
      if (indexHtml && hasReactGrabCode(readFileSync(indexHtml, "utf-8"))) {
        return indexHtml;
      }
      return entryFile;
    }
    case "tanstack":
      return findTanStackRootFile(projectRoot);
    case "webpack":
      return findEntryFile(projectRoot);
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
    /import\s*\(\s*["']react-grab["']\s*\)(?:\.then\s*\(\s*\(m\)\s*=>\s*m\.init\s*\([^)]*\)\s*\))?/,
  );

  if (!reactGrabImportWithInitMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab import",
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
    /(?:void\s+import\s*\(\s*["']react-grab["']\s*\)|import\s*\(\s*["']react-grab\/core["']\s*\)\.then\s*\(\s*\(\s*\{\s*init\s*\}\s*\)\s*=>\s*init\s*\([^)]*\)\s*\))/,
  );

  if (!reactGrabImportWithInitMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab import",
    };
  }

  const optionsJson = formatOptionsAsJson(options);
  const newImport = `import("react-grab/core").then(({ init }) => init(${optionsJson}))`;

  const newContent = originalContent.replace(reactGrabImportWithInitMatch[0], newImport);

  return {
    success: true,
    filePath,
    message: "Update React Grab options",
    originalContent,
    newContent,
  };
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

  if (!hasReactGrabCode(originalContent)) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab code in the file",
    };
  }

  switch (framework) {
    case "next":
      return addOptionsToNextScript(originalContent, options, filePath);
    case "vite":
      return addOptionsToDynamicImport(originalContent, options, filePath);
    case "tanstack":
      return addOptionsToTanStackImport(originalContent, options, filePath);
    case "webpack":
      return addOptionsToDynamicImport(originalContent, options, filePath);
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
