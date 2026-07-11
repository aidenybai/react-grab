import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { HomeFixtures } from "../components/home-fixtures";
import { FrameworkProvider } from "../components/ui/framework-provider";

const getServerRuntime = createServerFn({ method: "GET" }).handler(() => ({
  environment: import.meta.env.PROD ? "production" : "development",
  framework: "TanStack Start",
  runtime: "server",
}));

const ProductionIconLink = () => (
  <a
    aria-label="Production GitHub link"
    data-testid="production-icon-link"
    href="https://github.com/aidenybai/react-grab"
  >
    <svg aria-hidden="true" height="24" viewBox="0 0 24 24" width="24">
      <g>
        <path d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Z" />
      </g>
    </svg>
  </a>
);

const Home = () => {
  const serverRuntime = Route.useLoaderData();

  return (
    <FrameworkProvider>
      <main>
        <h1 data-testid="page-title">React Grab E2E (TanStack Start)</h1>
        <p data-testid="runtime-marker">
          {`Framework ${serverRuntime.framework} ${serverRuntime.environment}`}
        </p>
        <p data-testid="server-loader-target">
          {`${serverRuntime.framework} rendered on the ${serverRuntime.runtime}`}
        </p>
        <button data-testid="grab-smoke-target" type="button">
          Smoke target
        </button>
        <ProductionIconLink />
        <Link data-testid="detail-route-link" to="/detail">
          Open detail route
        </Link>
        <div id="fixture-portal-root" />
        <HomeFixtures />
      </main>
    </FrameworkProvider>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => getServerRuntime(),
});
