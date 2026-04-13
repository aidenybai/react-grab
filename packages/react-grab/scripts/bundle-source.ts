import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { parseSync } from "oxc-parser";
import type {
  ExportSpecifier,
  ImportDeclarationSpecifier,
  Program,
  StringLiteral,
} from "oxc-parser";
import { encodingForModel } from "js-tiktoken";

const SOURCE_DIR = resolve(import.meta.dirname, "..", "src");
const OUTPUT_PATH = resolve(import.meta.dirname, "..", "SOURCE.md");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

interface ExportedSymbol {
  name: string;
  kind: "value" | "type" | "default" | "namespace";
}

interface ImportedSymbol {
  localName: string;
  importedName: string;
  kind: "value" | "type" | "default" | "namespace";
}

interface ImportLink {
  resolvedPath: string | null;
  rawSpecifier: string;
  isExternal: boolean;
  symbols: ImportedSymbol[];
}

interface FileInfo {
  relativePath: string;
  absolutePath: string;
  content: string;
  tokens: number;
  lines: number;
  exports: ExportedSymbol[];
  imports: ImportLink[];
  importedBy: string[];
}

const collectSourceFiles = (directory: string): string[] => {
  const entries = readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
    } else if (SOURCE_EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf(".")))) {
      files.push(fullPath);
    }
  }
  return files;
};

const resolveImportSpecifier = (
  specifier: string,
  importerAbsolutePath: string,
  allAbsolutePaths: Set<string>,
): string | null => {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }

  const importerDir = dirname(importerAbsolutePath);
  let resolved = resolve(importerDir, specifier);

  resolved = resolved.replace(/\.js$/, "").replace(/\.jsx$/, "");

  for (const candidate of [
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}/index.ts`,
    `${resolved}/index.tsx`,
    resolved,
  ]) {
    if (allAbsolutePaths.has(candidate)) {
      return candidate;
    }
  }

  return null;
};

const getNodeName = (node: Record<string, unknown>): string | undefined => {
  const identifier = node.id as Record<string, unknown> | undefined;
  return identifier?.name as string | undefined;
};

const extractExports = (program: Program): ExportedSymbol[] => {
  const exports: ExportedSymbol[] = [];

  for (const node of program.body) {
    if (node.type === "ExportNamedDeclaration") {
      if (node.declaration) {
        const declaration = node.declaration;
        const name = getNodeName(declaration);
        if (name) {
          const isTypeExport =
            declaration.type === "TSInterfaceDeclaration" ||
            declaration.type === "TSTypeAliasDeclaration" ||
            declaration.type === "TSEnumDeclaration";
          exports.push({
            name,
            kind: isTypeExport ? "type" : "value",
          });
        }
        if ("declarations" in declaration && Array.isArray(declaration.declarations)) {
          for (const declarator of declaration.declarations) {
            const declaratorName = getNodeName(declarator);
            if (declaratorName) {
              exports.push({ name: declaratorName, kind: "value" });
            }
          }
        }
      }
      for (const specifier of node.specifiers) {
        const kind = node.exportKind === "type" ? "type" : "value";
        exports.push({ name: specifier.exported.name, kind });
      }
    }

    if (node.type === "ExportDefaultDeclaration") {
      const name = getNodeName(node.declaration as Record<string, unknown>) ?? "(default)";
      exports.push({ name, kind: "default" });
    }

    if (node.type === "ExportAllDeclaration") {
      const label = node.exported?.name ?? "*";
      exports.push({ name: label, kind: "namespace" });
    }
  }

  return exports;
};

const specifierToSymbol = (
  specifier: ImportDeclarationSpecifier | ExportSpecifier,
  importKind: string,
): ImportedSymbol => {
  if (specifier.type === "ImportSpecifier") {
    return {
      localName: specifier.local.name,
      importedName: specifier.imported?.name ?? specifier.local.name,
      kind: importKind === "type" ? "type" : "value",
    };
  }
  if (specifier.type === "ImportDefaultSpecifier") {
    return {
      localName: specifier.local.name,
      importedName: "default",
      kind: "default",
    };
  }
  if (specifier.type === "ImportNamespaceSpecifier") {
    return {
      localName: specifier.local.name,
      importedName: "*",
      kind: "namespace",
    };
  }
  return {
    localName: specifier.exported?.name ?? "?",
    importedName: specifier.local?.name ?? "?",
    kind: importKind === "type" ? "type" : "value",
  };
};

const extractImports = (
  program: Program,
  importerAbsolutePath: string,
  allAbsolutePaths: Set<string>,
): ImportLink[] => {
  const imports: ImportLink[] = [];

  const processSource = (
    source: StringLiteral | null,
    specifiers: Array<ImportDeclarationSpecifier | ExportSpecifier>,
    importKind: string,
  ): void => {
    if (!source) return;

    const rawSpecifier = source.value;
    const isExternal = !rawSpecifier.startsWith(".") && !rawSpecifier.startsWith("/");
    const resolvedPath = isExternal
      ? null
      : resolveImportSpecifier(rawSpecifier, importerAbsolutePath, allAbsolutePaths);

    const symbols: ImportedSymbol[] = specifiers.map((specifier) =>
      specifierToSymbol(specifier, importKind),
    );

    imports.push({ resolvedPath, rawSpecifier, isExternal, symbols });
  };

  for (const node of program.body) {
    if (node.type === "ImportDeclaration") {
      processSource(node.source, node.specifiers, node.importKind ?? "value");
    }
    if (node.type === "ExportNamedDeclaration" && node.source) {
      processSource(node.source, node.specifiers, node.exportKind ?? "value");
    }
    if (node.type === "ExportAllDeclaration") {
      processSource(node.source, [], "value");
    }
  }

  return imports;
};

const topologicalSort = (files: Map<string, FileInfo>): FileInfo[] => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const ordered: FileInfo[] = [];

  const visit = (filePath: string): void => {
    if (visited.has(filePath)) return;
    if (visiting.has(filePath)) return;
    visiting.add(filePath);

    const fileInfo = files.get(filePath);
    if (fileInfo) {
      for (const importLink of fileInfo.imports) {
        if (importLink.resolvedPath && files.has(importLink.resolvedPath)) {
          visit(importLink.resolvedPath);
        }
      }
    }

    visiting.delete(filePath);
    visited.add(filePath);
    if (fileInfo) {
      ordered.push(fileInfo);
    }
  };

  for (const filePath of files.keys()) {
    visit(filePath);
  }

  return ordered;
};

const fileAnchor = (relativePath: string): string =>
  relativePath.replace(/[/.]/g, "-").toLowerCase();

const formatNumber = (value: number): string => value.toLocaleString("en-US");

const generateMarkdown = (orderedFiles: FileInfo[], allFiles: Map<string, FileInfo>): string => {
  const totalTokens = orderedFiles.reduce((sum, file) => sum + file.tokens, 0);
  const totalLines = orderedFiles.reduce((sum, file) => sum + file.lines, 0);

  const externalDeps = new Map<string, string[]>();
  for (const file of orderedFiles) {
    for (const importLink of file.imports) {
      if (importLink.isExternal) {
        const packageName = importLink.rawSpecifier.startsWith("@")
          ? importLink.rawSpecifier.split("/").slice(0, 2).join("/")
          : importLink.rawSpecifier.split("/")[0];
        if (!externalDeps.has(packageName)) {
          externalDeps.set(packageName, []);
        }
        externalDeps.get(packageName)!.push(file.relativePath);
      }
    }
  }

  const lines: string[] = [];
  const push = (...text: string[]) => lines.push(...text);

  push("# react-grab source");
  push("");
  push(
    `> **${formatNumber(orderedFiles.length)}** files · **${formatNumber(totalLines)}** lines · **${formatNumber(totalTokens)}** tokens (cl100k_base)`,
  );
  push("");

  push("## Table of contents");
  push("");

  const groupedFiles = new Map<string, FileInfo[]>();
  for (const file of orderedFiles) {
    const directory = dirname(file.relativePath);
    const groupKey = directory === "." ? "(root)" : directory;
    if (!groupedFiles.has(groupKey)) {
      groupedFiles.set(groupKey, []);
    }
    groupedFiles.get(groupKey)!.push(file);
  }

  const directoryOrder = [
    "(root)",
    "core",
    "core/plugins",
    "components",
    "components/icons",
    "components/selection-label",
    "components/toolbar",
    "utils",
  ];
  const sortedGroups = [...groupedFiles.entries()].sort((first, second) => {
    const indexFirst = directoryOrder.indexOf(first[0]);
    const indexSecond = directoryOrder.indexOf(second[0]);
    const orderFirst = indexFirst === -1 ? 999 : indexFirst;
    const orderSecond = indexSecond === -1 ? 999 : indexSecond;
    return orderFirst - orderSecond;
  });

  for (const [groupName, groupFiles] of sortedGroups) {
    push(`### ${groupName === "(root)" ? "src/" : `src/${groupName}/`}`);
    push("");
    for (const file of groupFiles) {
      const anchor = fileAnchor(file.relativePath);
      push(`- [\`${file.relativePath}\`](#${anchor}) — ${formatNumber(file.tokens)} tokens`);
    }
    push("");
  }

  push("## External dependencies");
  push("");
  for (const [packageName, importers] of [...externalDeps.entries()].sort()) {
    const uniqueImporters = [...new Set(importers)].sort();
    push(
      `- **\`${packageName}\`** — imported by ${uniqueImporters.map((importer) => `[\`${importer}\`](#${fileAnchor(importer)})`).join(", ")}`,
    );
  }
  push("");

  push("## Dependency graph");
  push("");
  push("```mermaid");
  push("graph LR");

  const shortName = (relativePath: string): string => {
    const fileName = basename(relativePath, ".tsx").replace(/\.ts$/, "");
    const directory = dirname(relativePath);
    if (directory === ".") return fileName;
    const parts = directory.split("/");
    return `${parts[parts.length - 1]}/${fileName}`;
  };

  const mermaidId = (relativePath: string): string => relativePath.replace(/[/.]/g, "_");

  const edgeSet = new Set<string>();
  for (const file of orderedFiles) {
    for (const importLink of file.imports) {
      if (importLink.resolvedPath && allFiles.has(importLink.resolvedPath)) {
        const targetInfo = allFiles.get(importLink.resolvedPath)!;
        const edgeKey = `${file.relativePath}->${targetInfo.relativePath}`;
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          push(
            `  ${mermaidId(file.relativePath)}["${shortName(file.relativePath)}"] --> ${mermaidId(targetInfo.relativePath)}["${shortName(targetInfo.relativePath)}"]`,
          );
        }
      }
    }
  }
  push("```");
  push("");

  push("---");
  push("");
  push("## Source files");
  push("");

  for (const file of orderedFiles) {
    const anchor = fileAnchor(file.relativePath);
    push(`### ${file.relativePath}`);
    push(`<a id="${anchor}"></a>`);
    push("");

    push(`**${formatNumber(file.tokens)}** tokens · **${formatNumber(file.lines)}** lines`);
    push("");

    const internalImports = file.imports.filter(
      (importLink) => !importLink.isExternal && importLink.resolvedPath,
    );
    const externalImports = file.imports.filter((importLink) => importLink.isExternal);

    if (internalImports.length > 0 || externalImports.length > 0) {
      push("<details>");
      push("<summary>Imports</summary>");
      push("");

      if (internalImports.length > 0) {
        push("**Internal:**");
        push("");
        for (const importLink of internalImports) {
          const targetInfo = allFiles.get(importLink.resolvedPath!);
          const targetRelative = targetInfo?.relativePath ?? importLink.rawSpecifier;
          const targetAnchor = targetInfo ? fileAnchor(targetInfo.relativePath) : "";
          const symbolList = importLink.symbols
            .map((symbol) => {
              const prefix =
                symbol.kind === "type"
                  ? "type "
                  : symbol.kind === "default"
                    ? "default "
                    : symbol.kind === "namespace"
                      ? "* as "
                      : "";
              return `\`${prefix}${symbol.localName}\``;
            })
            .join(", ");
          const symbolSuffix = symbolList ? ` — ${symbolList}` : "";
          if (targetInfo) {
            push(`- [\`${targetRelative}\`](#${targetAnchor})${symbolSuffix}`);
          } else {
            push(`- \`${importLink.rawSpecifier}\`${symbolSuffix}`);
          }
        }
        push("");
      }

      if (externalImports.length > 0) {
        push("**External:**");
        push("");
        for (const importLink of externalImports) {
          const symbolList = importLink.symbols
            .map((symbol) => {
              const prefix =
                symbol.kind === "type"
                  ? "type "
                  : symbol.kind === "default"
                    ? "default "
                    : symbol.kind === "namespace"
                      ? "* as "
                      : "";
              return `\`${prefix}${symbol.localName}\``;
            })
            .join(", ");
          const symbolSuffix = symbolList ? ` — ${symbolList}` : "";
          push(`- \`${importLink.rawSpecifier}\`${symbolSuffix}`);
        }
        push("");
      }

      push("</details>");
      push("");
    }

    if (file.exports.length > 0) {
      push("<details>");
      push("<summary>Exports</summary>");
      push("");
      for (const exportedSymbol of file.exports) {
        const prefix =
          exportedSymbol.kind === "type"
            ? "type "
            : exportedSymbol.kind === "default"
              ? "default "
              : exportedSymbol.kind === "namespace"
                ? "* "
                : "";
        push(`- \`${prefix}${exportedSymbol.name}\``);
      }
      push("");
      push("</details>");
      push("");
    }

    if (file.importedBy.length > 0) {
      push("<details>");
      push("<summary>Imported by</summary>");
      push("");
      for (const importerPath of file.importedBy.sort()) {
        push(`- [\`${importerPath}\`](#${fileAnchor(importerPath)})`);
      }
      push("");
      push("</details>");
      push("");
    }

    const extension = file.relativePath.endsWith(".tsx") ? "tsx" : "ts";
    push(`\`\`\`${extension}`);
    push(file.content);
    if (!file.content.endsWith("\n")) {
      push("");
    }
    push("```");
    push("");
  }

  return lines.join("\n");
};

const run = () => {
  const encoding = encodingForModel("gpt-4o");
  const absolutePaths = collectSourceFiles(SOURCE_DIR).sort();
  const allAbsolutePathsSet = new Set(absolutePaths);

  const filesMap = new Map<string, FileInfo>();

  for (const absolutePath of absolutePaths) {
    const content = readFileSync(absolutePath, "utf8");
    const relativePath = relative(SOURCE_DIR, absolutePath);
    const tokens = encoding.encode(content).length;
    const lines = content.split("\n").length;

    const parseResult = parseSync(absolutePath, content);
    const exports = extractExports(parseResult.program);
    const imports = extractImports(parseResult.program, absolutePath, allAbsolutePathsSet);

    filesMap.set(absolutePath, {
      relativePath,
      absolutePath,
      content,
      tokens,
      lines,
      exports,
      imports,
      importedBy: [],
    });
  }

  for (const file of filesMap.values()) {
    for (const importLink of file.imports) {
      if (importLink.resolvedPath && filesMap.has(importLink.resolvedPath)) {
        const target = filesMap.get(importLink.resolvedPath)!;
        if (!target.importedBy.includes(file.relativePath)) {
          target.importedBy.push(file.relativePath);
        }
      }
    }
  }

  const orderedFiles = topologicalSort(filesMap);
  const markdown = generateMarkdown(orderedFiles, filesMap);

  writeFileSync(OUTPUT_PATH, markdown);

  const totalTokens = orderedFiles.reduce((sum, file) => sum + file.tokens, 0);
  console.log(`\n  Wrote ${OUTPUT_PATH}`);
  console.log(
    `  ${formatNumber(orderedFiles.length)} files · ${formatNumber(totalTokens)} tokens\n`,
  );
};

run();
