import path from "path";
import fs from "fs/promises";
import { runClaudeCodeTest } from "./claude-code";
import createSpinner from "yocto-spinner";
import { TEST_CASES } from "./test-cases";

const TARGET_ENVIRONMENT_DIR = path.join(__dirname, "shadcn-dashboard");

const run = async () => {
  const spinner = createSpinner({ text: "Running…" }).start();

  const testCasesJson = TEST_CASES.map(({ name, prompt }) => ({
    name,
    prompt,
  }));
  const testCasesPath = path.join(__dirname, "test-cases.json");
  await fs.writeFile(testCasesPath, JSON.stringify(testCasesJson, null, 2));

  const allTests = TEST_CASES.flatMap((testCase) => {
    const { name, prompt, expectedFile, reactGrabOutput } = testCase;

    return [
      {
        testName: name,
        type: "control" as const,
        run: () =>
          runClaudeCodeTest({
            prompt: `ONLY RETURN THE FILE NAME, NO OTHER TEXT. ${prompt}`,
            expectedFile,
            cwd: TARGET_ENVIRONMENT_DIR,
          }),
      },
      {
        testName: name,
        type: "treatment" as const,
        run: () =>
          runClaudeCodeTest({
            prompt: `ONLY RETURN THE FILE NAME, NO OTHER TEXT. ${prompt}

${reactGrabOutput}`,
            expectedFile,
            cwd: TARGET_ENVIRONMENT_DIR,
          }),
      },
    ];
  });

  const outputPath = path.join(__dirname, "results.json");
  const results: Array<{
    testName: string;
    type: "control" | "treatment";
    [key: string]: unknown;
  }> = [];

  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

  const BATCH_SIZE = 5;

  for (let i = 0; i < allTests.length; i += BATCH_SIZE) {
    const batch = allTests.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async ({ testName, type, run }) => {
        const result = await run();
        const testResult = {
          testName,
          type,
          ...result,
        };

        results.push(testResult);
        await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

        spinner.text = `Completed ${results.length}/${allTests.length} tests`;
      }),
    );
  }

  spinner.stop();

  console.log(`Results written to ${outputPath}`);
  console.log(`Total tests run: ${results.length}`);

  process.exit(0);
};

run();
