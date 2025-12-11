import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Framework, NextRouterType } from "./detect.js";
import {
  NEXT_APP_ROUTER_SCRIPT_WITH_AGENT,
  NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT,
  SCRIPT_IMPORT,
  VITE_SCRIPT_WITH_AGENT,
  WEBPACK_IMPORT_WITH_AGENT,
  type AgentIntegration,
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
  activationKey?: {
    key?: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  };
  activationMode?: "toggle" | "hold";
  keyHoldDuration?: number;
  allowActivationInsideInput?: boolean;
  maxContextLines?: number;
}

export interface PackageJsonTransformResult {
  success: boolean;
  filePath: string;
  message: string;
  originalContent?: string;
  newContent?: string;
  noChanges?: boolean;
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

const addAgentToExistingNextApp = (
  originalContent: string,
  agent: AgentIntegration,
  filePath: string,
): TransformResult => {
  if (agent === "none") {
    return {
      success: true,
      filePath,
      message: "React Grab is already configured",
      noChanges: true,
    };
  }

  const agentPackage = `@react-grab/${agent}`;
  if (originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is already configured`,
      noChanges: true,
    };
  }

  const agentScript = `<Script
              src="//unpkg.com/${agentPackage}/dist/client.global.js"
              strategy="lazyOnload"
            />`;

  const reactGrabScriptMatch = originalContent.match(
    /<(?:Script|script|NextScript)[^>]*react-grab[^>]*\/?>/is,
  );

  if (reactGrabScriptMatch) {
    const newContent = originalContent.replace(
      reactGrabScriptMatch[0],
      `${reactGrabScriptMatch[0]}\n            ${agentScript}`,
    );
    return {
      success: true,
      filePath,
      message: `Add ${agent} agent`,
      originalContent,
      newContent,
    };
  }

  return {
    success: false,
    filePath,
    message: "Could not find React Grab script to add agent after",
  };
};

const addAgentToExistingVite = (
  originalContent: string,
  agent: AgentIntegration,
  filePath: string,
): TransformResult => {
  if (agent === "none") {
    return {
      success: true,
      filePath,
      message: "React Grab is already configured",
      noChanges: true,
    };
  }

  const agentPackage = `@react-grab/${agent}`;
  if (originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is already configured`,
      noChanges: true,
    };
  }

  const agentImport = `import("${agentPackage}/client");`;
  const reactGrabImportMatch = originalContent.match(
    /import\s*\(\s*["']react-grab["']\s*\);?/,
  );

  if (reactGrabImportMatch) {
    const matchedText = reactGrabImportMatch[0];
    const hasSemicolon = matchedText.endsWith(";");
    const newContent = originalContent.replace(
      matchedText,
      `${hasSemicolon ? matchedText.slice(0, -1) : matchedText};\n        ${agentImport}`,
    );
    return {
      success: true,
      filePath,
      message: `Add ${agent} agent`,
      originalContent,
      newContent,
    };
  }

  return {
    success: false,
    filePath,
    message: "Could not find React Grab import to add agent after",
  };
};

const addAgentToExistingWebpack = (
  originalContent: string,
  agent: AgentIntegration,
  filePath: string,
): TransformResult => {
  if (agent === "none") {
    return {
      success: true,
      filePath,
      message: "React Grab is already configured",
      noChanges: true,
    };
  }

  const agentPackage = `@react-grab/${agent}`;
  if (originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is already configured`,
      noChanges: true,
    };
  }

  const agentImport = `import("${agentPackage}/client");`;
  const reactGrabImportMatch = originalContent.match(
    /import\s*\(\s*["']react-grab["']\s*\);?/,
  );

  if (reactGrabImportMatch) {
    const matchedText = reactGrabImportMatch[0];
    const hasSemicolon = matchedText.endsWith(";");
    const newContent = originalContent.replace(
      matchedText,
      `${hasSemicolon ? matchedText.slice(0, -1) : matchedText};\n  ${agentImport}`,
    );
    return {
      success: true,
      filePath,
      message: `Add ${agent} agent`,
      originalContent,
      newContent,
    };
  }

  return {
    success: false,
    filePath,
    message: "Could not find React Grab import to add agent after",
  };
};

const transformNextAppRouter = (
  projectRoot: string,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean,
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
  const hasReactGrabInInstrumentationFile =
    hasReactGrabInInstrumentation(projectRoot);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingNextApp(originalContent, agent, layoutPath);
  }

  if (hasReactGrabInFile || hasReactGrabInInstrumentationFile) {
    return {
      success: true,
      filePath: layoutPath,
      message:
        "React Grab is already installed" +
        (hasReactGrabInInstrumentationFile
          ? " in instrumentation-client"
          : " in this file"),
      noChanges: true,
    };
  }

  if (!newContent.includes('import Script from "next/script"')) {
    const importMatch = newContent.match(/^import .+ from ['"].+['"];?\s*$/m);
    if (importMatch) {
      newContent = newContent.replace(
        importMatch[0],
        `${importMatch[0]}\n${SCRIPT_IMPORT}`,
      );
    } else {
      newContent = `${SCRIPT_IMPORT}\n\n${newContent}`;
    }
  }

  const scriptBlock = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT(agent);

  const headMatch = newContent.match(/<head[^>]*>/);
  if (headMatch) {
    newContent = newContent.replace(
      headMatch[0],
      `${headMatch[0]}\n        ${scriptBlock}`,
    );
  } else {
    const htmlMatch = newContent.match(/<html[^>]*>/);
    if (htmlMatch) {
      newContent = newContent.replace(
        htmlMatch[0],
        `${htmlMatch[0]}\n      <head>\n        ${scriptBlock}\n      </head>`,
      );
    }
  }

  return {
    success: true,
    filePath: layoutPath,
    message:
      "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

const transformNextPagesRouter = (
  projectRoot: string,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean,
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
  const hasReactGrabInInstrumentationFile =
    hasReactGrabInInstrumentation(projectRoot);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingNextApp(originalContent, agent, documentPath);
  }

  if (hasReactGrabInFile || hasReactGrabInInstrumentationFile) {
    return {
      success: true,
      filePath: documentPath,
      message:
        "React Grab is already installed" +
        (hasReactGrabInInstrumentationFile
          ? " in instrumentation-client"
          : " in this file"),
      noChanges: true,
    };
  }

  if (!newContent.includes('import Script from "next/script"')) {
    const importMatch = newContent.match(/^import .+ from ['"].+['"];?\s*$/m);
    if (importMatch) {
      newContent = newContent.replace(
        importMatch[0],
        `${importMatch[0]}\n${SCRIPT_IMPORT}`,
      );
    }
  }

  const scriptBlock = NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT(agent);

  const headMatch = newContent.match(/<Head[^>]*>/);
  if (headMatch) {
    newContent = newContent.replace(
      headMatch[0],
      `${headMatch[0]}\n        ${scriptBlock}`,
    );
  }

  return {
    success: true,
    filePath: documentPath,
    message:
      "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

const transformVite = (
  projectRoot: string,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean,
): TransformResult => {
  const indexPath = findIndexHtml(projectRoot);

  if (!indexPath) {
    return {
      success: false,
      filePath: "",
      message: "Could not find index.html",
    };
  }

  const originalContent = readFileSync(indexPath, "utf-8");
  let newContent = originalContent;
  const hasReactGrabInFile = hasReactGrabCode(originalContent);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingVite(originalContent, agent, indexPath);
  }

  if (hasReactGrabInFile) {
    return {
      success: true,
      filePath: indexPath,
      message: "React Grab is already installed in this file",
      noChanges: true,
    };
  }

  const scriptBlock = VITE_SCRIPT_WITH_AGENT(agent);

  const headMatch = newContent.match(/<head[^>]*>/i);
  if (headMatch) {
    newContent = newContent.replace(
      headMatch[0],
      `${headMatch[0]}\n    ${scriptBlock}`,
    );
  }

  return {
    success: true,
    filePath: indexPath,
    message:
      "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

const transformWebpack = (
  projectRoot: string,
  agent: AgentIntegration,
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

  const originalContent = readFileSync(entryPath, "utf-8");
  const hasReactGrabInFile = hasReactGrabCode(originalContent);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingWebpack(originalContent, agent, entryPath);
  }

  if (hasReactGrabInFile) {
    return {
      success: true,
      filePath: entryPath,
      message: "React Grab is already installed in this file",
      noChanges: true,
    };
  }

  const importBlock = WEBPACK_IMPORT_WITH_AGENT(agent);
  const newContent = `${importBlock}\n\n${originalContent}`;

  return {
    success: true,
    filePath: entryPath,
    message:
      "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

export const previewTransform = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean = false,
): TransformResult => {
  switch (framework) {
    case "next":
      if (nextRouterType === "app") {
        return transformNextAppRouter(
          projectRoot,
          agent,
          reactGrabAlreadyConfigured,
        );
      }
      return transformNextPagesRouter(
        projectRoot,
        agent,
        reactGrabAlreadyConfigured,
      );

    case "vite":
      return transformVite(projectRoot, agent, reactGrabAlreadyConfigured);

    case "webpack":
      return transformWebpack(projectRoot, agent, reactGrabAlreadyConfigured);

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

export const applyTransform = (
  result: TransformResult,
): { success: boolean; error?: string } => {
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

export const transformProject = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean = false,
): TransformResult & { writeError?: string } => {
  const result = previewTransform(
    projectRoot,
    framework,
    nextRouterType,
    agent,
    reactGrabAlreadyConfigured,
  );
  const writeResult = applyTransform(result);
  if (!writeResult.success) {
    return { ...result, success: false, writeError: writeResult.error };
  }
  return result;
};

const AGENT_PREFIXES: Record<string, string> = {
  "claude-code": "npx @react-grab/claude-code@latest &&",
  cursor: "npx @react-grab/cursor@latest &&",
  opencode: "npx @react-grab/opencode@latest &&",
  codex: "npx @react-grab/codex@latest &&",
  gemini: "npx @react-grab/gemini@latest &&",
  amp: "npx @react-grab/amp@latest &&",
};

export const previewPackageJsonTransform = (
  projectRoot: string,
  agent: AgentIntegration,
  installedAgents: string[],
): PackageJsonTransformResult => {
  if (agent === "none" || agent === "ami" || agent === "instant") {
    return {
      success: true,
      filePath: "",
      message:
        agent === "ami" || agent === "instant"
          ? `${agent === "ami" ? "Ami" : "Instant"} does not require package.json modification`
          : "No agent selected, skipping package.json modification",
      noChanges: true,
    };
  }

  const packageJsonPath = join(projectRoot, "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      success: false,
      filePath: "",
      message: "Could not find package.json",
    };
  }

  const originalContent = readFileSync(packageJsonPath, "utf-8");
  const agentPrefix = AGENT_PREFIXES[agent];

  if (!agentPrefix) {
    return {
      success: false,
      filePath: packageJsonPath,
      message: `Unknown agent: ${agent}`,
    };
  }

  if (originalContent.includes(agentPrefix)) {
    return {
      success: true,
      filePath: packageJsonPath,
      message: `Agent ${agent} dev script is already configured`,
      noChanges: true,
    };
  }

  try {
    const packageJson = JSON.parse(originalContent);

    if (!packageJson.scripts?.dev) {
      return {
        success: false,
        filePath: packageJsonPath,
        message: 'No "dev" script found in package.json',
      };
    }

    const currentDevScript = packageJson.scripts.dev;

    for (const installedAgent of installedAgents) {
      const existingPrefix = AGENT_PREFIXES[installedAgent];
      if (existingPrefix && currentDevScript.includes(existingPrefix)) {
        return {
          success: true,
          filePath: packageJsonPath,
          message: `Agent ${installedAgent} is already in dev script`,
          noChanges: true,
        };
      }
    }

    packageJson.scripts.dev = `${agentPrefix} ${currentDevScript}`;

    const newContent = JSON.stringify(packageJson, null, 2) + "\n";

    return {
      success: true,
      filePath: packageJsonPath,
      message: `Add ${agent} server to dev script`,
      originalContent,
      newContent,
    };
  } catch {
    return {
      success: false,
      filePath: packageJsonPath,
      message: "Failed to parse package.json",
    };
  }
};

export const applyPackageJsonTransform = (
  result: PackageJsonTransformResult,
): { success: boolean; error?: string } => {
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
    const keyParts: string[] = [];
    if (options.activationKey.key)
      keyParts.push(`key: "${options.activationKey.key}"`);
    if (options.activationKey.metaKey) keyParts.push("metaKey: true");
    if (options.activationKey.ctrlKey) keyParts.push("ctrlKey: true");
    if (options.activationKey.shiftKey) keyParts.push("shiftKey: true");
    if (options.activationKey.altKey) keyParts.push("altKey: true");
    if (keyParts.length > 0) {
      parts.push(`activationKey: { ${keyParts.join(", ")} }`);
    }
  }

  if (options.activationMode) {
    parts.push(`activationMode: "${options.activationMode}"`);
  }

  if (options.keyHoldDuration !== undefined) {
    parts.push(`keyHoldDuration: ${options.keyHoldDuration}`);
  }

  if (options.allowActivationInsideInput !== undefined) {
    parts.push(
      `allowActivationInsideInput: ${options.allowActivationInsideInput}`,
    );
  }

  if (options.maxContextLines !== undefined) {
    parts.push(`maxContextLines: ${options.maxContextLines}`);
  }

  return `{ ${parts.join(", ")} }`;
};

const formatOptionsAsJson = (options: ReactGrabOptions): string => {
  const cleanOptions: Record<string, unknown> = {};

  if (options.activationKey) {
    const activationKey: Record<string, unknown> = {};
    if (options.activationKey.key) activationKey.key = options.activationKey.key;
    if (options.activationKey.metaKey) activationKey.metaKey = true;
    if (options.activationKey.ctrlKey) activationKey.ctrlKey = true;
    if (options.activationKey.shiftKey) activationKey.shiftKey = true;
    if (options.activationKey.altKey) activationKey.altKey = true;
    if (Object.keys(activationKey).length > 0) {
      cleanOptions.activationKey = activationKey;
    }
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
    case "vite":
      return findIndexHtml(projectRoot);
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
    /(<Script[^>]*react-grab[^>]*)(\/?>)/is,
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

  const existingDataOptionsMatch = scriptTag.match(
    /data-options=\{JSON\.stringify\([^)]+\)\}/,
  );

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

const addOptionsToViteScript = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const reactGrabImportMatch = originalContent.match(
    /import\s*\(\s*["']react-grab["']\s*\)/,
  );

  if (!reactGrabImportMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab import",
    };
  }

  const optionsJson = formatOptionsAsJson(options);
  const newImport = `import("react-grab").then((m) => m.init(${optionsJson}))`;

  const newContent = originalContent.replace(reactGrabImportMatch[0], newImport);

  return {
    success: true,
    filePath,
    message: "Update React Grab options",
    originalContent,
    newContent,
  };
};

const addOptionsToWebpackImport = (
  originalContent: string,
  options: ReactGrabOptions,
  filePath: string,
): TransformResult => {
  const reactGrabImportMatch = originalContent.match(
    /import\s*\(\s*["']react-grab["']\s*\)/,
  );

  if (!reactGrabImportMatch) {
    return {
      success: false,
      filePath,
      message: "Could not find React Grab import",
    };
  }

  const optionsJson = formatOptionsAsJson(options);
  const newImport = `import("react-grab").then((m) => m.init(${optionsJson}))`;

  const newContent = originalContent.replace(reactGrabImportMatch[0], newImport);

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
      return addOptionsToViteScript(originalContent, options, filePath);
    case "webpack":
      return addOptionsToWebpackImport(originalContent, options, filePath);
    default:
      return {
        success: false,
        filePath,
        message: `Unknown framework: ${framework}`,
      };
  }
};

export const applyOptionsTransform = (
  result: TransformResult,
): { success: boolean; error?: string } => {
  return applyTransform(result);
};
