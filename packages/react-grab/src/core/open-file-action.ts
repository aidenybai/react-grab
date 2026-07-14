import { OpenFileError } from "../errors.js";
import type { OpenFileActionHooks } from "../types.js";
import { requestOpenFile } from "../utils/open-file.js";
import { reportRecoverableError } from "../utils/report-recoverable-error.js";

export const executeOpenFileAction = (
  filePath: string,
  lineNumber: number | undefined,
  hooks: OpenFileActionHooks,
): void => {
  try {
    if (hooks.onOpenFile(filePath, lineNumber)) return;

    void requestOpenFile(filePath, lineNumber, hooks.transformOpenFileUrl).catch((error) => {
      reportRecoverableError(
        error instanceof OpenFileError ? error : new OpenFileError(filePath, lineNumber, error),
      );
    });
  } catch (error) {
    reportRecoverableError(
      error instanceof OpenFileError ? error : new OpenFileError(filePath, lineNumber, error),
    );
  }
};
