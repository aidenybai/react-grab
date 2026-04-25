import type { Mock } from "vite-plus/test";

interface ExecFileResponse {
  stdout?: string;
  stderr?: string;
  error?: NodeJS.ErrnoException;
}

type ExecFileCallback = (
  error: NodeJS.ErrnoException | null,
  stdout: string,
  stderr: string,
) => void;

const invokeCallbackWith = (callback: ExecFileCallback, response: ExecFileResponse): void => {
  callback(response.error ?? null, response.stdout ?? "", response.stderr ?? "");
};

const lastArgAsCallback = (mockArgs: unknown[]): ExecFileCallback =>
  mockArgs[mockArgs.length - 1] as ExecFileCallback;

export const stubExecFile = (mockExecFile: Mock, response: ExecFileResponse): void => {
  mockExecFile.mockImplementation((...mockArgs: unknown[]) => {
    invokeCallbackWith(lastArgAsCallback(mockArgs), response);
  });
};

export const stubExecFilePerCall = (mockExecFile: Mock, responses: ExecFileResponse[]): void => {
  let callIndex = 0;
  mockExecFile.mockImplementation((...mockArgs: unknown[]) => {
    const response = responses[callIndex] ?? {};
    callIndex += 1;
    invokeCallbackWith(lastArgAsCallback(mockArgs), response);
  });
};

export const enoentError = (): NodeJS.ErrnoException => {
  const error = new Error("ENOENT") as NodeJS.ErrnoException;
  error.code = "ENOENT";
  return error;
};
