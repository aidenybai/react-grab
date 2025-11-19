import path from "path";
import fs from "fs/promises";
import { runClaudeCodeTest } from "./claude-code";
import createSpinner from "yocto-spinner";
import { TEST_CASES } from "./test-cases";

const TARGET_ENVIRONMENT_DIR = path.join(__dirname, "shadcn-dashboard");

const run = async () => {
  const spinner = createSpinner({ text: "Running…" }).start();

  const allTests = TEST_CASES.flatMap((testCase) => {
    const { name, prompt, expectedFile, reactGrabOutput } = testCase;

    return [
      {
        testName: name,
        type: "control" as const,
        promise: runClaudeCodeTest({
          prompt: `ONLY RETURN THE FILE NAME, NO OTHER TEXT. ${prompt}`,
          expectedFile,
          cwd: TARGET_ENVIRONMENT_DIR,
        }),
      },
      {
        testName: name,
        type: "treatment" as const,
        promise: runClaudeCodeTest({
          prompt: `ONLY RETURN THE FILE NAME, NO OTHER TEXT. ${prompt}

${reactGrabOutput}`,
          expectedFile,
          cwd: TARGET_ENVIRONMENT_DIR,
        }),
      },
    ];
  });

  const results = await Promise.all(
    allTests.map(async ({ testName, type, promise }) => {
      const result = await promise;
      return {
        testName,
        type,
        ...result,
      };
    })
  );

  const outputPath = path.join(__dirname, "results.json");
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`Results written to ${outputPath}`);
  console.log(`Total tests run: ${results.length}`);

  spinner.stop();
};

run();
