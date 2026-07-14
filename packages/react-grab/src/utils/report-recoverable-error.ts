import type { RecoverableError } from "../errors.js";

export const reportRecoverableError = (error: RecoverableError): void => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[react-grab]", error);
  }
};
