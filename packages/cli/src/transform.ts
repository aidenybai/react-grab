import { accessSync, constants, existsSync, readFileSync, writeFileSync } from "node:fs";
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
  filePath: string
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
    /<(?:Script|script|NextScript)[^>]*react-grab[^>]*\/?>/is
  );

  if (reactGrabScriptMatch) {
    const newContent = originalContent.replace(
      reactGrabScriptMatch[0],
      `${reactGrabScriptMatch[0]}\n            ${agentScript}`
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
  filePath: string
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
  const reactGrabImportMatch = originalContent.match(/import\s*\(\s*["']react-grab["']\s*\)/);

  if (reactGrabImportMatch) {
    const newContent = originalContent.replace(
      reactGrabImportMatch[0],
      `${reactGrabImportMatch[0]};\n        ${agentImport}`
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
  filePath: string
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
  const reactGrabImportMatch = originalContent.match(/import\s*\(\s*["']react-grab["']\s*\)/);

  if (reactGrabImportMatch) {
    const newContent = originalContent.replace(
      reactGrabImportMatch[0],
      `${reactGrabImportMatch[0]};\n  ${agentImport}`
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
  reactGrabAlreadyConfigured: boolean
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

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingNextApp(originalContent, agent, layoutPath);
  }

  if (hasReactGrabInFile || hasReactGrabInInstrumentationFile) {
    return {
      success: true,
      filePath: layoutPath,
      message: "React Grab is already installed" + (hasReactGrabInInstrumentationFile ? " in instrumentation-client" : " in this file"),
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

  const scriptBlock = NEXT_APP_ROUTER_SCRIPT_WITH_AGENT(agent);

  const headMatch = newContent.match(/<head[^>]*>/);
  if (headMatch) {
    newContent = newContent.replace(headMatch[0], `${headMatch[0]}\n        ${scriptBlock}`);
  } else {
    const htmlMatch = newContent.match(/<html[^>]*>/);
    if (htmlMatch) {
      newContent = newContent.replace(
        htmlMatch[0],
        `${htmlMatch[0]}\n      <head>\n        ${scriptBlock}\n      </head>`
      );
    }
  }

  return {
    success: true,
    filePath: layoutPath,
    message: "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

const transformNextPagesRouter = (
  projectRoot: string,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean
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

  if (hasReactGrabInFile && reactGrabAlreadyConfigured) {
    return addAgentToExistingNextApp(originalContent, agent, documentPath);
  }

  if (hasReactGrabInFile || hasReactGrabInInstrumentationFile) {
    return {
      success: true,
      filePath: documentPath,
      message: "React Grab is already installed" + (hasReactGrabInInstrumentationFile ? " in instrumentation-client" : " in this file"),
      noChanges: true,
    };
  }

  if (!newContent.includes('import Script from "next/script"')) {
    const importMatch = newContent.match(/^import .+ from ['"].+['"];?\s*$/m);
    if (importMatch) {
      newContent = newContent.replace(importMatch[0], `${importMatch[0]}\n${SCRIPT_IMPORT}`);
    }
  }

  const scriptBlock = NEXT_PAGES_ROUTER_SCRIPT_WITH_AGENT(agent);

  const headMatch = newContent.match(/<Head[^>]*>/);
  if (headMatch) {
    newContent = newContent.replace(headMatch[0], `${headMatch[0]}\n        ${scriptBlock}`);
  }

  return {
    success: true,
    filePath: documentPath,
    message: "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

const transformVite = (
  projectRoot: string,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean
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
    newContent = newContent.replace(headMatch[0], `${headMatch[0]}\n    ${scriptBlock}`);
  }

  return {
    success: true,
    filePath: indexPath,
    message: "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

const transformWebpack = (
  projectRoot: string,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean
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
    message: "Add React Grab" + (agent !== "none" ? ` with ${agent} agent` : ""),
    originalContent,
    newContent,
  };
};

export const previewTransform = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean = false
): TransformResult => {
  switch (framework) {
    case "next":
      if (nextRouterType === "app") {
        return transformNextAppRouter(projectRoot, agent, reactGrabAlreadyConfigured);
      }
      return transformNextPagesRouter(projectRoot, agent, reactGrabAlreadyConfigured);

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

export const transformProject = (
  projectRoot: string,
  framework: Framework,
  nextRouterType: NextRouterType,
  agent: AgentIntegration,
  reactGrabAlreadyConfigured: boolean = false
): TransformResult & { writeError?: string } => {
  const result = previewTransform(projectRoot, framework, nextRouterType, agent, reactGrabAlreadyConfigured);
  const writeResult = applyTransform(result);
  if (!writeResult.success) {
    return { ...result, success: false, writeError: writeResult.error };
  }
  return result;
};

const AGENT_PREFIXES: Record<string, string> = {
  "claude-code": "npx @react-grab/claude-code@latest &&",
  cursor: "npx @react-grab/cursor@latest &&",
  codex: "npx @react-grab/codex@latest &&",
  opencode: "npx @react-grab/opencode@latest &&",
};

export const previewPackageJsonTransform = (
  projectRoot: string,
  agent: AgentIntegration,
  installedAgents: string[]
): PackageJsonTransformResult => {
  if (agent === "none") {
    return {
      success: true,
      filePath: "",
      message: "No agent selected, skipping package.json modification",
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
  result: PackageJsonTransformResult
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
