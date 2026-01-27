import { type ReactElement } from "react";
import { IconGithub } from "./icons/icon-github";

export const GithubButton = (): ReactElement => {
  return (
    <a
      href="https://github.com/aidenybai/react-grab"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white px-3 py-1.5 text-sm text-black transition-all hover:bg-white/90 active:scale-[0.98] sm:text-base"
    >
      <IconGithub className="h-[18px] w-[18px]" />
      Star on GitHub
    </a>
  );
};

GithubButton.displayName = "GithubButton";
