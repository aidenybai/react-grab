import { execFile, type ExecFileOptions } from "node:child_process";

interface ExecFileSuccess {
  stdout: string;
  stderr: string;
}

export interface ExecFileFailure extends Error {
  stdout?: string;
  stderr?: string;
}

export const runExecFile = (
  file: string,
  args: string[],
  options: ExecFileOptions,
): Promise<ExecFileSuccess> =>
  new Promise((resolve, reject) => {
    execFile(file, args, { ...options, encoding: "utf8" }, (error, stdout, stderr) => {
      if (error) {
        const enriched: ExecFileFailure = error;
        enriched.stdout = String(stdout ?? "");
        enriched.stderr = String(stderr ?? "");
        reject(enriched);
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
