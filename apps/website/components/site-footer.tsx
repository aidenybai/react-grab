import { AccentLink } from "@/components/prose";
import { ThemeSwitch } from "@/components/theme-switch";

/**
 * Understated footer, million.dev style: a hairline rule, then the primary links
 * on the left and the theme toggle on the right, all in the subtle prose-link
 * treatment rather than a separate mono chrome bar.
 */
export const SiteFooter = () => {
  return (
    <footer className="flex flex-col gap-6">
      <hr className="border-line" />
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <AccentLink href="https://github.com/aidenybai/react-grab">GitHub</AccentLink>
          <AccentLink href="https://github.com/aidenybai/react-grab#readme">Docs</AccentLink>
          <AccentLink href="/benchmarks" external={false}>
            Benchmarks
          </AccentLink>
          <AccentLink href="https://million.dev">Million</AccentLink>
        </div>
        <ThemeSwitch />
      </div>
    </footer>
  );
};
