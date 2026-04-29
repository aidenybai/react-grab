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

export interface ExecFileCallSnapshot {
  binary: string;
  args: string[];
}

export const getExecFileCall = (mockExecFile: Mock, callIndex = 0): ExecFileCallSnapshot => {
  const call = mockExecFile.mock.calls[callIndex];
  if (!call) {
    throw new Error(`expected execFile to have been called at least ${callIndex + 1} time(s)`);
  }
  const [binary, args] = call;
  if (typeof binary !== "string") {
    throw new Error("expected execFile binary to be a string");
  }
  if (!Array.isArray(args) || args.some((arg) => typeof arg !== "string")) {
    throw new Error("expected execFile args to be a string array");
  }
  return { binary, args };
};

export const getExecFileFlagValue = (mockExecFile: Mock, flag: string, callIndex = 0): string => {
  const { args } = getExecFileCall(mockExecFile, callIndex);
  const flagIndex = args.indexOf(flag);
  if (flagIndex === -1) {
    throw new Error(`expected execFile args to contain '${flag}'`);
  }
  const value = args[flagIndex + 1];
  if (typeof value !== "string") {
    throw new Error(`expected '${flag}' to be followed by a string value`);
  }
  return value;
};
