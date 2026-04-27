// `__REACT_GRAB_SKILL_TEMPLATE__` is replaced at build time by the contents of
// `skill-template.md` (see `vite.config.ts`). The same markdown is symlinked
// to the repo's top-level `skills/react-grab/SKILL.md` so the GitHub-visible
// copy and the bundled string can never drift apart.
declare const __REACT_GRAB_SKILL_TEMPLATE__: string;

export const SKILL_TEMPLATE: string = __REACT_GRAB_SKILL_TEMPLATE__;
