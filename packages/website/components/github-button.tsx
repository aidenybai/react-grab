import { type ReactElement } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { IconGithub } from "./icons/icon-github";

export const GithubButton = (): ReactElement => {
  return (
    <a
      href="https://github.com/aidenybai/react-grab"
      target="_blank"
      rel="noreferrer"
      className={cn(
        buttonVariants({ variant: "default" }),
        "h-auto gap-2 px-3 py-1.5 text-sm active:scale-[0.98] sm:text-base",
      )}
    >
      <IconGithub className="h-[18px] w-[18px]" />
      Star on GitHub
    </a>
  );
};

GithubButton.displayName = "GithubButton";
