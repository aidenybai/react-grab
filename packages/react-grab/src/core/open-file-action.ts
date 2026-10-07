import { OpenFileError } from "../errors.js";
import type { OpenFileActionHooks } from "../types.js";
import { requestOpenFile } from "../utils/open-file.js";
import { reportRecoverableError } from "../utils/report-recoverable-error.js";

const reportOpenFileError = (
  error: unknown,
  filePath: string,
  lineNumber: number | undefined,
): void => {
  reportRecoverableError(
    error instanceof OpenFileError ? error : new OpenFileError(filePath, lineNumber, error),
  );
};

export const executeOpenFileAction = (
  filePath: string,
  lineNumber: number | undefined,
  hooks: OpenFileActionHooks,
): void => {
  try {
    if (hooks.onOpenFile(filePath, lineNumber)) return;

    void requestOpenFile(filePath, lineNumber, hooks.transformOpenFileUrl).catch((error) => {
      reportOpenFileError(error, filePath, lineNumber);
    });
  } catch (error) {
    reportOpenFileError(error, filePath, lineNumber);
  }
};
