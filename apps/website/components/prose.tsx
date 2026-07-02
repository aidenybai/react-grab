import type { ReactNode } from "react";

/** Understated editorial link — subtle underline that firms up on hover. */
export const LINK_CLASS_NAME =
  "text-prose underline decoration-prose/30 underline-offset-[3px] transition-colors hover:text-label hover:decoration-label";

export const AccentLink = ({
  href = "#",
  children,
  external = true,
}: {
  href?: string;
  children: ReactNode;
  external?: boolean;
}) => {
  return (
    <a
      href={href}
      className={LINK_CLASS_NAME}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
};
