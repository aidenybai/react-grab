export type BlockType =
  | "paragraph"
  | "heading"
  | "blockquote"
  | "code"
  | "list"
  | "image"
  | "divider"
  | "table";

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;
  properties?: BlockProperties;
  children?: EditorBlock[];
}

export interface BlockProperties {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  language?: string;
  listType?: "ordered" | "unordered" | "checklist";
  checked?: boolean;
  src?: string;
  alt?: string;
  width?: number;
  height?: number;
  alignment?: "left" | "center" | "right";
}

export interface EditorDocument {
  id: string;
  title: string;
  blocks: EditorBlock[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EditorSelection {
  blockId: string;
  start: number;
  end: number;
}

export type EditorAction =
  | { type: "insert_block"; block: EditorBlock; afterId?: string }
  | { type: "delete_block"; blockId: string }
  | { type: "update_block"; blockId: string; content: string }
  | { type: "move_block"; blockId: string; afterId: string }
  | {
      type: "update_properties";
      blockId: string;
      properties: Partial<BlockProperties>;
    };

export interface EditorConfig {
  placeholder: string;
  readOnly: boolean;
  maxBlocks: number;
  allowedBlockTypes: BlockType[];
  enableCollaboration: boolean;
}
