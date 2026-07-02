import { IconGithub } from "@/components/icons/icon-github";

interface GithubLinkProps {
  className?: string;
}

export const GithubLink = ({ className = "" }: GithubLinkProps) => (
  <a
    href="https://github.com/aidenybai/react-grab"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="React Grab on GitHub"
    className={`text-faint transition-colors hover:text-ink ${className}`}
  >
    <IconGithub />
  </a>
);

GithubLink.displayName = "GithubLink";
