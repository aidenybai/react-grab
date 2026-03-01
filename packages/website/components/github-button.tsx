import { type ReactElement } from "react";
import { IconGithub } from "./icons/icon-github";
import { Button } from "@/components/ui/button";

export const GithubButton = (): ReactElement => {
  return (
    <Button
      asChild
      variant="default"
      size="sm"
      className="h-auto gap-2 px-3 py-1.5 text-sm sm:text-base"
    >
      <a href="https://github.com/aidenybai/react-grab" target="_blank" rel="noreferrer">
        <IconGithub className="size-[18px]" />
        Star on GitHub
      </a>
    </Button>
  );
};

GithubButton.displayName = "GithubButton";
