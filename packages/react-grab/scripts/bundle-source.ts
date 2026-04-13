import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
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
const ENTRY_FILES = new Set(["index.ts", "primitives.ts"]);

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

interface UnusedExport {
  file: string;
  symbolName: string;
  kind: string;
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
          exports.push({ name, kind: isTypeExport ? "type" : "value" });
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
    return { localName: specifier.local.name, importedName: "default", kind: "default" };
  }
  if (specifier.type === "ImportNamespaceSpecifier") {
    return { localName: specifier.local.name, importedName: "*", kind: "namespace" };
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

const buildConsumedSymbolsMap = (allFiles: Map<string, FileInfo>): Map<string, Set<string>> => {
  const consumed = new Map<string, Set<string>>();

  for (const file of allFiles.values()) {
    for (const importLink of file.imports) {
      if (!importLink.resolvedPath || !allFiles.has(importLink.resolvedPath)) continue;
      const targetRelative = allFiles.get(importLink.resolvedPath)!.relativePath;

      if (!consumed.has(targetRelative)) {
        consumed.set(targetRelative, new Set());
      }
      const symbolSet = consumed.get(targetRelative)!;

      for (const symbol of importLink.symbols) {
        symbolSet.add(symbol.importedName);
      }
    }
  }

  return consumed;
};

const findUnusedExports = (
  allFiles: Map<string, FileInfo>,
  consumedSymbols: Map<string, Set<string>>,
): UnusedExport[] => {
  const unused: UnusedExport[] = [];

  for (const file of allFiles.values()) {
    if (ENTRY_FILES.has(file.relativePath)) continue;

    const hasStarImporter = [...allFiles.values()].some((otherFile) =>
      otherFile.imports.some(
        (importLink) =>
          importLink.resolvedPath === file.absolutePath &&
          importLink.symbols.length === 0 &&
          !importLink.isExternal,
      ),
    );
    if (hasStarImporter) continue;

    const consumed = consumedSymbols.get(file.relativePath) ?? new Set();

    for (const exportedSymbol of file.exports) {
      if (exportedSymbol.kind === "namespace") continue;

      const isConsumed =
        consumed.has(exportedSymbol.name) ||
        (exportedSymbol.kind === "default" && consumed.has("default"));

      if (!isConsumed) {
        unused.push({
          file: file.relativePath,
          symbolName: exportedSymbol.name,
          kind: exportedSymbol.kind,
        });
      }
    }
  }

  return unused;
};

const findOrphanFiles = (allFiles: Map<string, FileInfo>): string[] => {
  const orphans: string[] = [];
  for (const file of allFiles.values()) {
    if (ENTRY_FILES.has(file.relativePath)) continue;
    if (file.importedBy.length === 0) {
      orphans.push(file.relativePath);
    }
  }
  return orphans.sort();
};

const findSingleConsumerExports = (
  allFiles: Map<string, FileInfo>,
): Array<{ file: string; consumer: string }> => {
  const results: Array<{ file: string; consumer: string }> = [];
  for (const file of allFiles.values()) {
    if (ENTRY_FILES.has(file.relativePath)) continue;
    if (file.importedBy.length === 1 && file.exports.length > 0) {
      results.push({ file: file.relativePath, consumer: file.importedBy[0] });
    }
  }
  return results.sort((first, second) => first.file.localeCompare(second.file));
};

const formatSymbolKind = (kind: string): string => {
  if (kind === "type") return "type ";
  if (kind === "default") return "default ";
  if (kind === "namespace") return "* ";
  return "";
};

const formatNumber = (value: number): string => value.toLocaleString("en-US");

const generateMarkdown = (orderedFiles: FileInfo[], allFiles: Map<string, FileInfo>): string => {
  const totalTokens = orderedFiles.reduce((sum, file) => sum + file.tokens, 0);
  const totalLines = orderedFiles.reduce((sum, file) => sum + file.lines, 0);

  const consumedSymbols = buildConsumedSymbolsMap(allFiles);
  const unusedExports = findUnusedExports(allFiles, consumedSymbols);
  const orphanFiles = findOrphanFiles(allFiles);
  const singleConsumerFiles = findSingleConsumerExports(allFiles);

  const lines: string[] = [];
  const push = (...text: string[]) => lines.push(...text);

  push("# react-grab source");
  push("");
  push(
    `${formatNumber(orderedFiles.length)} files, ${formatNumber(totalLines)} lines, ${formatNumber(totalTokens)} tokens`,
  );
  push("");
  push(
    "Files are topologically sorted: dependencies appear before dependents. Entry points: index.ts (public API), primitives.ts (low-level primitives).",
  );
  push("");

  push("## Analysis");
  push("");

  if (orphanFiles.length > 0) {
    push("### Orphan files (no internal importer)");
    push("");
    push(
      "These files are not imported by any other source file. They may be entry points, dead code, or only used at runtime via side effects.",
    );
    push("");
    for (const orphan of orphanFiles) {
      push(`- ${orphan}`);
    }
    push("");
  }

  if (unusedExports.length > 0) {
    push("### Unused exports (not imported by any internal file)");
    push("");
    push(
      "These symbols are exported but never imported within the codebase. They may be part of the public API consumed externally, or they may be dead code.",
    );
    push("");

    const groupedByFile = new Map<string, UnusedExport[]>();
    for (const entry of unusedExports) {
      if (!groupedByFile.has(entry.file)) {
        groupedByFile.set(entry.file, []);
      }
      groupedByFile.get(entry.file)!.push(entry);
    }

    for (const [filePath, symbols] of [...groupedByFile.entries()].sort()) {
      const symbolList = symbols
        .map((symbol) => `${formatSymbolKind(symbol.kind)}${symbol.symbolName}`)
        .join(", ");
      push(`- ${filePath}: ${symbolList}`);
    }
    push("");
  }

  if (singleConsumerFiles.length > 0) {
    push("### Single-consumer files (inlining candidates)");
    push("");
    push(
      "These files are only imported by one other file. The code may be better inlined into the consumer.",
    );
    push("");
    for (const { file, consumer } of singleConsumerFiles) {
      push(`- ${file} → only used by ${consumer}`);
    }
    push("");
  }

  const externalDeps = new Map<string, Set<string>>();
  for (const file of orderedFiles) {
    for (const importLink of file.imports) {
      if (importLink.isExternal) {
        const packageName = importLink.rawSpecifier.startsWith("@")
          ? importLink.rawSpecifier.split("/").slice(0, 2).join("/")
          : importLink.rawSpecifier.split("/")[0];
        if (!externalDeps.has(packageName)) {
          externalDeps.set(packageName, new Set());
        }
        externalDeps.get(packageName)!.add(file.relativePath);
      }
    }
  }

  push("### External dependencies");
  push("");
  for (const [packageName, importers] of [...externalDeps.entries()].sort()) {
    push(`- ${packageName}: ${[...importers].sort().join(", ")}`);
  }
  push("");

  push("---");
  push("");

  for (const file of orderedFiles) {
    push(`## ${file.relativePath}`);
    push("");
    push(`${file.tokens} tokens, ${file.lines} lines`);

    const internalImports = file.imports.filter(
      (importLink) => !importLink.isExternal && importLink.resolvedPath,
    );
    const externalImports = file.imports.filter((importLink) => importLink.isExternal);

    if (internalImports.length > 0) {
      const importLines = internalImports.map((importLink) => {
        const targetInfo = allFiles.get(importLink.resolvedPath!);
        const targetRelative = targetInfo?.relativePath ?? importLink.rawSpecifier;
        const symbolList = importLink.symbols
          .map(
            (symbol) =>
              `${formatSymbolKind(symbol.kind)}${symbol.importedName !== symbol.localName ? `${symbol.importedName} as ` : ""}${symbol.localName}`,
          )
          .join(", ");
        return symbolList ? `${targetRelative} { ${symbolList} }` : targetRelative;
      });
      push(`imports: ${importLines.join("; ")}`);
    }

    if (externalImports.length > 0) {
      const importLines = externalImports.map((importLink) => {
        const symbolList = importLink.symbols
          .map(
            (symbol) =>
              `${formatSymbolKind(symbol.kind)}${symbol.importedName !== symbol.localName ? `${symbol.importedName} as ` : ""}${symbol.localName}`,
          )
          .join(", ");
        return symbolList
          ? `${importLink.rawSpecifier} { ${symbolList} }`
          : importLink.rawSpecifier;
      });
      push(`external: ${importLines.join("; ")}`);
    }

    if (file.exports.length > 0) {
      const exportList = file.exports
        .map((symbol) => `${formatSymbolKind(symbol.kind)}${symbol.name}`)
        .join(", ");
      push(`exports: ${exportList}`);
    }

    if (file.importedBy.length > 0) {
      push(`imported by: ${file.importedBy.sort().join(", ")}`);
    } else if (!ENTRY_FILES.has(file.relativePath)) {
      push("imported by: (none — possible dead code)");
    }

    push("");

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
