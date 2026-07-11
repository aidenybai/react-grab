import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { FrameworkProvider } from "../components/ui/framework-provider";

const loadFixtureError = createServerFn({ method: "GET" }).handler(() => {
  throw new Error("Intentional TanStack Start fixture loader error");
});

const FixtureError = () => (
  <FrameworkProvider>
    <main data-testid="fixture-error-fallback">
      <h1>TanStack Start route error</h1>
      <Link data-testid="fixture-error-recovery-link" to="/">
        Recover at fixture home
      </Link>
    </main>
  </FrameworkProvider>
);

export const Route = createFileRoute("/fixture-error")({
  component: () => null,
  errorComponent: FixtureError,
  loader: () => loadFixtureError(),
});
