import {
  accessSync,
  constants,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { Framework, NextRouterType, PackageManager } from "./detect.js";
import {
  NEXT_APP_ROUTER_SCRIPT_WITH_AGENT,
  NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT,
  SCRIPT_IMPORT,
  TANSTACK_EFFECT_WITH_AGENT,
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
  activationKey?: string;
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
  warning?: string;
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

  const agentScript = `{process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/${agentPackage}/dist/client.global.js"
            strategy="lazyOnload"
          />
        )}`;

  const reactGrabBlockMatch = originalContent.match(
    /\{process\.env\.NODE_ENV\s*===\s*["']development["']\s*&&\s*\(\s*<Script[^>]*react-grab[^>]*\/>\s*\)\}/is,
  );

  if (reactGrabBlockMatch) {
    const newContent = originalContent.replace(
      reactGrabBlockMatch[0],
      `${reactGrabBlockMatch[0]}\n        ${agentScript}`,
    );
    return {
      success: true,
      filePath,
      message: `Add ${agent} agent`,
      originalContent,
      newContent,
    };
  }

  const bareScriptMatch = originalContent.match(
    /<Script[^>]*react-grab[^>]*\/>/i,
  );

  if (bareScriptMatch) {
    const newContent = originalContent.replace(
      bareScriptMatch[0],
      `${bareScriptMatch[0]}\n        <Script src="//unpkg.com/${agentPackage}/dist/client.global.js" strategy="lazyOnload" />`,
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

const addAgentToExistingTanStack = (
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

  const agentImport = `void import("${agentPackage}/client");`;
  const reactGrabImportMatch = originalContent.match(
    /void\s+import\s*\(\s*["']react-grab["']\s*\);?/,
  );

  if (reactGrabImportMatch) {
    const matchedText = reactGrabImportMatch[0];
    const hasSemicolon = matchedText.endsWith(";");
    const newContent = originalContent.replace(
      matchedText,
      `${hasSemicolon ? matchedText.slice(0, -1) : matchedText};\n      ${agentImport}`,
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

const transformTanStack = (
  projectRoot: string,
  agent: AgentIntegration,
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
  const hasReactGrabInFile = hasReactGrabCode(originalContent);

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingTanStack(originalContent, agent, rootPath);
  }

  if (hasReactGrabInFile) {
    return {
      success: true,
      filePath: rootPath,
      message: "React Grab is already installed in this file",
      noChanges: true,
    };
  }

  const hasUseEffectImport =
    /import\s+\{[^}]*useEffect[^}]*\}\s+from\s+["']react["']/.test(newContent);
  if (!hasUseEffectImport) {
    const reactImportMatch = newContent.match(
      /import\s+\{([^}]*)\}\s+from\s+["']react["'];?/,
    );
    if (reactImportMatch) {
      const existingImports = reactImportMatch[1];
      newContent = newContent.replace(
        reactImportMatch[0],
        `import { ${existingImports.trim()}, useEffect } from "react";`,
      );
    } else {
      const firstImportMatch = newContent.match(
        /^import .+ from ['"].+['"];?\s*$/m,
      );
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

  const effectBlock = TANSTACK_EFFECT_WITH_AGENT(agent);

  const componentMatch = newContent.match(/function\s+(\w+)\s*\([^)]*\)\s*\{/);

  if (componentMatch) {
    const insertPosition = componentMatch.index! + componentMatch[0].length;
    newContent =
      newContent.slice(0, insertPosition) +
      `\n  ${effectBlock}\n` +
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

    case "tanstack":
      return transformTanStack(projectRoot, agent, reactGrabAlreadyConfigured);

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

const getPackageExecutor = (packageManager: PackageManager): string => {
  switch (packageManager) {
    case "bun":
      return "bunx";
    case "pnpm":
      return "pnpm dlx";
    case "yarn":
      return "npx";
    case "npm":
    default:
      return "npx";
  }
};

const AGENT_PACKAGES: Record<string, string> = {
  "claude-code": "@react-grab/claude-code@latest",
  cursor: "@react-grab/cursor@latest",
  opencode: "@react-grab/opencode@latest",
  codex: "@react-grab/codex@latest",
  gemini: "@react-grab/gemini@latest",
  amp: "@react-grab/amp@latest",
  droid: "@react-grab/droid@latest",
  copilot: "@react-grab/copilot@latest",
};

export const getAgentPrefix = (
  agent: string,
  packageManager: PackageManager,
): string | null => {
  const agentPackage = AGENT_PACKAGES[agent];
  if (!agentPackage) return null;
  const executor = getPackageExecutor(packageManager);
  return `${executor} ${agentPackage} &&`;
};

const getAllAgentPrefixVariants = (agent: string): string[] => {
  const agentPackage = AGENT_PACKAGES[agent];
  if (!agentPackage) return [];
  return [
    `npx ${agentPackage} &&`,
    `bunx ${agentPackage} &&`,
    `pnpm dlx ${agentPackage} &&`,
    `yarn dlx ${agentPackage} &&`,
  ];
};

export const previewPackageJsonTransform = (
  projectRoot: string,
  agent: AgentIntegration,
  installedAgents: string[],
  packageManager: PackageManager = "npm",
): PackageJsonTransformResult => {
  if (agent === "none") {
    return {
      success: true,
      filePath: "",
      message: "No agent selected, skipping package.json modification",
      noChanges: true,
    };
  }

  if (agent === "mcp") {
    return {
      success: true,
      filePath: "",
      message: "MCP does not use package.json dev script",
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
  const agentPrefix = getAgentPrefix(agent, packageManager);

  if (!agentPrefix) {
    return {
      success: false,
      filePath: packageJsonPath,
      message: `Unknown agent: ${agent}`,
    };
  }

  const allPrefixVariants = getAllAgentPrefixVariants(agent);
  const hasExistingPrefix = allPrefixVariants.some((prefix) =>
    originalContent.includes(prefix),
  );

  if (hasExistingPrefix) {
    return {
      success: true,
      filePath: packageJsonPath,
      message: `Agent ${agent} dev script is already configured`,
      noChanges: true,
    };
  }

  try {
    const packageJson = JSON.parse(originalContent);

    let targetScriptKey = "dev";
    if (!packageJson.scripts?.dev) {
      const devScriptKeys = Object.keys(packageJson.scripts || {}).filter(
        (key) => key.startsWith("dev"),
      );
      if (devScriptKeys.length > 0) {
        targetScriptKey = devScriptKeys[0];
      } else {
        return {
          success: true,
          filePath: packageJsonPath,
          message: "No dev script found in package.json",
          noChanges: true,
          warning: `Could not inject agent into package.json (no dev script found).\nRun this command manually before starting your dev server:\n  ${agentPrefix} <your dev command>`,
        };
      }
    }

    const currentDevScript = packageJson.scripts[targetScriptKey];

    for (const installedAgent of installedAgents) {
      const installedPrefixVariants = getAllAgentPrefixVariants(installedAgent);
      const hasInstalledAgentPrefix = installedPrefixVariants.some((prefix) =>
        currentDevScript.includes(prefix),
      );
      if (hasInstalledAgentPrefix) {
        return {
          success: true,
          filePath: packageJsonPath,
          message: `Agent ${installedAgent} is already in ${targetScriptKey} script`,
          noChanges: true,
        };
      }
    }

    packageJson.scripts[targetScriptKey] = `${agentPrefix} ${currentDevScript}`;

    const newContent = JSON.stringify(packageJson, null, 2) + "\n";

    return {
      success: true,
      filePath: packageJsonPath,
      message: `Add ${agent} server to ${targetScriptKey} script`,
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
    parts.push(`activationKey: ${JSON.stringify(options.activationKey)}`);
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
    cleanOptions.activationKey = options.activationKey;
  }

  if (options.activationMode) {
    cleanOptions.activationMode = options.activationMode;
  }

  if (options.keyHoldDuration !== undefined) {
    cleanOptions.keyHoldDuration = options.keyHoldDuration;
  }

  if (options.allowActivationInsideInput !== undefined) {
    cleanOptions.allowActivationInsideInput =
      options.allowActivationInsideInput;
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

  const existingDataOptionsMatch = scriptTag.match(
    /data-options=\{JSON\.stringify\([^)]+\)\}/,
  );

  const dataOptionsAttr = `data-options={JSON.stringify(\n              ${formatOptionsForNextjs(options)}\n            )}`;

  let newScriptTag: string;
  if (existingDataOptionsMatch) {
    newScriptTag = scriptTag.replace(
      existingDataOptionsMatch[0],
      dataOptionsAttr,
    );
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

  const newContent = originalContent.replace(
    reactGrabImportWithInitMatch[0],
    newImport,
  );

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

  const newContent = originalContent.replace(
    reactGrabImportWithInitMatch[0],
    newImport,
  );

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

  const newContent = originalContent.replace(
    reactGrabImportWithInitMatch[0],
    newImport,
  );

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
    case "tanstack":
      return addOptionsToTanStackImport(originalContent, options, filePath);
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

const removeAgentFromNextApp = (
  originalContent: string,
  agent: string,
  filePath: string,
): TransformResult => {
  const agentPackage = `@react-grab/${agent}`;

  if (!originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is not configured in this file`,
      noChanges: true,
    };
  }

  const agentScriptPattern = new RegExp(
    `\\s*\\{process\\.env\\.NODE_ENV === "development" && \\(\\s*<Script[^>]*${agentPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*\\/>\\s*\\)\\}`,
    "gs",
  );

  const simpleScriptPattern = new RegExp(
    `\\s*<Script[^>]*${agentPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*\\/>`,
    "gi",
  );

  let newContent = originalContent.replace(agentScriptPattern, "");

  if (newContent === originalContent) {
    newContent = originalContent.replace(simpleScriptPattern, "");
  }

  if (newContent === originalContent) {
    return {
      success: false,
      filePath,
      message: `Could not find agent ${agent} script to remove`,
    };
  }

  return {
    success: true,
    filePath,
    message: `Remove ${agent} agent`,
    originalContent,
    newContent,
  };
};

const removeAgentFromVite = (
  originalContent: string,
  agent: string,
  filePath: string,
): TransformResult => {
  const agentPackage = `@react-grab/${agent}`;

  if (!originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is not configured in this file`,
      noChanges: true,
    };
  }

  const agentImportPattern = new RegExp(
    `\\s*import\\s*\\(\\s*["']${agentPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/client["']\\s*\\);?`,
    "g",
  );

  const newContent = originalContent.replace(agentImportPattern, "");

  if (newContent === originalContent) {
    return {
      success: false,
      filePath,
      message: `Could not find agent ${agent} import to remove`,
    };
  }

  return {
    success: true,
    filePath,
    message: `Remove ${agent} agent`,
    originalContent,
    newContent,
  };
};

const removeAgentFromWebpack = (
  originalContent: string,
  agent: string,
  filePath: string,
): TransformResult => {
  const agentPackage = `@react-grab/${agent}`;

  if (!originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is not configured in this file`,
      noChanges: true,
    };
  }

  const agentImportPattern = new RegExp(
    `\\s*import\\s*\\(\\s*["']${agentPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/client["']\\s*\\);?`,
    "g",
  );

  const newContent = originalContent.replace(agentImportPattern, "");

  if (newContent === originalContent) {
    return {
      success: false,
      filePath,
      message: `Could not find agent ${agent} import to remove`,
    };
  }

  return {
    success: true,
    filePath,
    message: `Remove ${agent} agent`,
    originalContent,
    newContent,
  };
};

const removeAgentFromTanStack = (
  originalContent: string,
  agent: string,
  filePath: string,
): TransformResult => {
  const agentPackage = `@react-grab/${agent}`;

  if (!originalContent.includes(agentPackage)) {
    return {
      success: true,
      filePath,
      message: `Agent ${agent} is not configured in this file`,
      noChanges: true,
    };
  }

  const agentImportPattern = new RegExp(
    `\\s*void\\s+import\\s*\\(\\s*["']${agentPackage.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/client["']\\s*\\);?`,
    "g",
  );

  const newContent = originalContent.replace(agentImportPattern, "");

  if (newContent === originalContent) {
    return {
      success: false,
      filePath,
      message: `Could not find agent ${agent} import to remove`,
    };
  }

  return {
    success: true,
    filePath,
    message: `Remove ${agent} agent`,
    originalContent,
    newContent,
  };
};

export const previewAgentRemoval = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  agent: string,
): TransformResult => {
  const filePath = findReactGrabFile(projectRoot, framework, nextRouterType);

  if (!filePath) {
    return {
      success: true,
      filePath: "",
      message: "Could not find file containing React Grab configuration",
      noChanges: true,
    };
  }

  const originalContent = readFileSync(filePath, "utf-8");

  switch (framework) {
    case "next":
      return removeAgentFromNextApp(originalContent, agent, filePath);
    case "vite":
      return removeAgentFromVite(originalContent, agent, filePath);
    case "tanstack":
      return removeAgentFromTanStack(originalContent, agent, filePath);
    case "webpack":
      return removeAgentFromWebpack(originalContent, agent, filePath);
    default:
      return {
        success: false,
        filePath,
        message: `Unknown framework: ${framework}`,
      };
  }
};

export const previewPackageJsonAgentRemoval = (
  projectRoot: string,
  agent: string,
): PackageJsonTransformResult => {
  const packageJsonPath = join(projectRoot, "package.json");

  if (!existsSync(packageJsonPath)) {
    return {
      success: true,
      filePath: "",
      message: "Could not find package.json",
      noChanges: true,
    };
  }

  const originalContent = readFileSync(packageJsonPath, "utf-8");
  const allPrefixVariants = getAllAgentPrefixVariants(agent);

  if (allPrefixVariants.length === 0) {
    return {
      success: true,
      filePath: packageJsonPath,
      message: `Unknown agent: ${agent}`,
      noChanges: true,
    };
  }

  const hasAnyPrefix = allPrefixVariants.some((prefix) =>
    originalContent.includes(prefix),
  );

  if (!hasAnyPrefix) {
    return {
      success: true,
      filePath: packageJsonPath,
      message: `Agent ${agent} dev script is not configured`,
      noChanges: true,
    };
  }

  try {
    const packageJson = JSON.parse(originalContent);

    for (const scriptKey of Object.keys(packageJson.scripts || {})) {
      let scriptValue = packageJson.scripts[scriptKey];
      if (typeof scriptValue === "string") {
        for (const prefix of allPrefixVariants) {
          if (scriptValue.includes(prefix)) {
            scriptValue = scriptValue
              .replace(prefix + " ", "")
              .replace(prefix, "");
          }
        }
        packageJson.scripts[scriptKey] = scriptValue;
      }
    }

    const newContent = JSON.stringify(packageJson, null, 2) + "\n";

    return {
      success: true,
      filePath: packageJsonPath,
      message: `Remove ${agent} server from dev script`,
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
    .replace(
      /(https?:)?\/\/[^/\s"']+(?=\/(?:@?react-grab))/g,
      `//${targetCdnDomain}`,
    )
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
