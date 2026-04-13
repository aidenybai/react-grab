import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { encodingForModel } from "js-tiktoken";

const SOURCE_DIR = join(import.meta.dirname, "..", "src");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);

interface FileTokenCount {
  path: string;
  tokens: number;
  lines: number;
  characters: number;
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

const formatNumber = (value: number): string => value.toLocaleString("en-US");

const run = () => {
  const encoding = encodingForModel("gpt-4o");
  const sourceFiles = collectSourceFiles(SOURCE_DIR).sort();

  const fileCounts: FileTokenCount[] = sourceFiles.map((filePath) => {
    const content = readFileSync(filePath, "utf8");
    const tokens = encoding.encode(content).length;
    const lines = content.split("\n").length;
    return {
      path: relative(SOURCE_DIR, filePath),
      tokens,
      lines,
      characters: content.length,
    };
  });

  const totalTokens = fileCounts.reduce((sum, file) => sum + file.tokens, 0);
  const totalLines = fileCounts.reduce((sum, file) => sum + file.lines, 0);
  const totalCharacters = fileCounts.reduce((sum, file) => sum + file.characters, 0);

  const maxPathLength = Math.max(...fileCounts.map((file) => file.path.length));
  const maxTokenLength = Math.max(...fileCounts.map((file) => formatNumber(file.tokens).length));

  console.log(`\n  react-grab source token count (cl100k_base encoding)\n`);

  const sortedByTokens = [...fileCounts].sort((first, second) => second.tokens - first.tokens);

  for (const file of sortedByTokens) {
    const paddedPath = file.path.padEnd(maxPathLength);
    const paddedTokens = formatNumber(file.tokens).padStart(maxTokenLength);
    console.log(`  ${paddedPath}  ${paddedTokens} tokens`);
  }

  const separatorLength = maxPathLength + maxTokenLength + 12;
  console.log(`  ${"─".repeat(separatorLength)}`);
  console.log(
    `  ${"Total".padEnd(maxPathLength)}  ${formatNumber(totalTokens).padStart(maxTokenLength)} tokens`,
  );
  console.log(`\n  ${formatNumber(sourceFiles.length)} files`);
  console.log(`  ${formatNumber(totalLines)} lines`);
  console.log(`  ${formatNumber(totalCharacters)} characters`);
  console.log(`  ${formatNumber(totalTokens)} tokens\n`);
};

run();
