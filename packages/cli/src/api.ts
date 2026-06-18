export {
  detectFramework,
  detectNextRouterType,
  detectPackageManager,
  detectProject,
  detectReactGrab,
  detectReactGrabConfigured,
  detectUnsupportedFramework,
  findReactProjects,
} from "./utils/detect.js";
export type {
  Framework,
  NextRouterType,
  PackageManager,
  ProjectInfo,
  UnsupportedFramework,
  WorkspaceProject,
} from "./utils/detect.js";

export {
  applyTransform,
  hasFrameworkEntryPoint,
  previewCdnTransform,
  previewOptionsTransform,
  previewTransform,
} from "./utils/transform.js";
export type { ReactGrabOptions, TransformResult } from "./utils/transform.js";

export { getPackagesToInstall, installPackages } from "./utils/install.js";
export type { InstallPackageOptions } from "./utils/install.js";

export { installReactGrab, ReactGrabInstallError } from "./utils/install-react-grab.js";
export type {
  InstallReactGrabOptions,
  InstallReactGrabResult,
  ReactGrabInstallErrorCode,
} from "./utils/install-react-grab.js";

export { installSkill, removeSkill } from "./utils/install-skill.js";
export type { InstallSkillOptions } from "./utils/install-skill.js";
