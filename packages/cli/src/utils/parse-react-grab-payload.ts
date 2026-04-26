import { z } from "zod";

export interface ReactGrabPayloadEntry {
  tagName?: string;
  componentName?: string;
  content: string;
  commentText?: string;
}

export interface ReactGrabPayload {
  version: string;
  content: string;
  entries: ReactGrabPayloadEntry[];
  timestamp: number;
}

const reactGrabEntrySchema: z.ZodType<ReactGrabPayloadEntry> = z.object({
  tagName: z.string().optional(),
  componentName: z.string().optional(),
  content: z.string(),
  commentText: z.string().optional(),
});

const reactGrabPayloadSchema: z.ZodType<ReactGrabPayload> = z.object({
  version: z.string(),
  content: z.string(),
  entries: z.array(reactGrabEntrySchema),
  timestamp: z.number(),
});

export const parseReactGrabPayload = (raw: string | null): ReactGrabPayload | null => {
  if (!raw) return null;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return null;
  }

  const validation = reactGrabPayloadSchema.safeParse(parsedJson);
  return validation.success ? validation.data : null;
};
