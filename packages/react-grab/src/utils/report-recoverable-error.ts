import type { RecoverableError } from "../errors.js";

export const reportRecoverableError = (error: RecoverableError): void => {
  console.warn("[react-grab]", error);
};
