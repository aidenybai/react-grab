// Video configuration
export const VIDEO_WIDTH_PX = 1920;
export const VIDEO_HEIGHT_PX = 1080;
export const VIDEO_FPS = 40;
export const TOTAL_DURATION_FRAMES = 600;

// Background
export const BACKGROUND_COLOR = "#ffffff";

// Per-scene frame budgets
export const SCENE_1_START = 0;
export const SCENE_1_DURATION = 80; // 2s — Dashboard + Toolbar

export const SCENE_2_START = 80;
export const SCENE_2_DURATION = 160; // 4s — Select & Copy

export const SCENE_3_START = 240;
export const SCENE_3_DURATION = 200; // 5s — Comment Flow

export const SCENE_4_START = 440;
export const SCENE_4_DURATION = 80; // 2s — Context Menu

export const SCENE_5_START = 520;
export const SCENE_5_DURATION = 80; // 2s — History

// Theme colors (from react-grab/src/styles.css)
export const GRAB_PINK = "#b21c8e";
export const GRAB_PINK_LIGHT = "#fde7f7";
export const GRAB_PINK_BORDER = "#f7c5ec";
export const GRAB_PURPLE = "rgb(210, 57, 192)";
export const LABEL_TAG_BORDER = "#730079";
export const LABEL_TAG_TEXT = "#1e001f";
export const LABEL_GRAY_BORDER = "#b0b0b0";
export const LABEL_SUCCESS_BG = "#d9ffe4";
export const LABEL_SUCCESS_BORDER = "#00bb69";
export const LABEL_SUCCESS_TEXT = "#006e3b";
export const LABEL_DIVIDER = "#dedede";
export const LABEL_MUTED = "#767676";
export const PANEL_WHITE = "#ffffff";

// Component constants (from react-grab/src/constants.ts)
export const PANEL_STYLES = "bg-white";
export const ARROW_HEIGHT_PX = 8;
export const ARROW_MIN_SIZE_PX = 4;
export const ARROW_MAX_LABEL_WIDTH_RATIO = 0.2;
export const ARROW_CENTER_PERCENT = 50;
export const ARROW_LABEL_MARGIN_PX = 16;
export const LABEL_GAP_PX = 4;
export const DROPDOWN_ICON_SIZE_PX = 11;

// ---- Scene 1 internal timing (relative to scene start, 0-80) ----
export const S1_TOOLBAR_ENTER_FRAME = 20;

// ---- Scene 2 internal timing (relative to scene start, 0-160) ----
export const S2_CURSOR_APPEAR = 0;
export const S2_CURSOR_ARRIVE = 30;
export const S2_SELECTION_SHOW = 30;
export const S2_LABEL_SHOW = 35;
export const S2_COPYING_START = 70;
export const S2_COPIED_START = 110;
export const S2_FADE_OUT = 140;
export const S2_FADE_DURATION = 5;

// ---- Scene 3 internal timing (relative to scene start, 0-200) ----
export const S3_CURSOR_ARRIVE = 25;
export const S3_SELECTION_SHOW = 25;
export const S3_LABEL_SHOW = 30;
export const S3_PROMPT_MODE = 50;
export const S3_TYPING_START = 55;
export const S3_TYPING_CHARS = 3; // frames per character
export const S3_COMMENT_TEXT = "add CSV option";
export const S3_SUBMIT_FRAME = 55 + 14 * 3 + 5; // after typing + small pause
export const S3_THINKING_START = 55 + 14 * 3 + 5;
export const S3_COMPLETION_START = 155;

// ---- Scene 4 internal timing (relative to scene start, 0-80) ----
export const S4_CURSOR_ARRIVE = 20;
export const S4_SELECTION_SHOW = 20;
export const S4_CONTEXT_MENU_SHOW = 30;

// ---- Scene 5 internal timing (relative to scene start, 0-80) ----
export const S5_DROPDOWN_SHOW = 10;

// ---- Toolbar position ----
export const TOOLBAR_X = 960;
export const TOOLBAR_Y = 1020;
