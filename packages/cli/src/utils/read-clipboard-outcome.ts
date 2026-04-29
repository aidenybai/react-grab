export interface ClipboardReadOutcome {
  payload: string | null;
  hint?: string;
  recoverable?: boolean;
}
