import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { FrameworkProvider } from "../components/ui/framework-provider";
import { DETAIL_LOADER_DELAY_MS } from "../constants";

const getDetailLoaderData = createServerFn({ method: "GET" }).handler(async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, DETAIL_LOADER_DELAY_MS);
  });

  return {
    framework: "TanStack Start",
    loadedAt: Date.now(),
    source: "server loader",
  };
});

const DetailPending = () => <main data-testid="detail-pending-target">Loading detail route</main>;

const Detail = () => {
  const detailLoaderData = Route.useLoaderData();
  const router = useRouter();

  const revalidateDetail = async () => {
    await router.invalidate();
  };

  return (
    <FrameworkProvider>
      <main>
        <h1 data-testid="route-detail-target">TanStack Start detail route</h1>
        <p data-testid="route-detail-loader-target">
          {detailLoaderData.framework} {detailLoaderData.source}: {detailLoaderData.loadedAt}
        </p>
        <button data-testid="route-detail-revalidate" onClick={revalidateDetail} type="button">
          Revalidate detail loader
        </button>
        <Link data-testid="detail-back-link" to="/">
          Back to fixture home
        </Link>
      </main>
    </FrameworkProvider>
  );
};

export const Route = createFileRoute("/detail")({
  component: Detail,
  loader: () => getDetailLoaderData(),
  pendingComponent: DetailPending,
  pendingMinMs: DETAIL_LOADER_DELAY_MS,
  pendingMs: 0,
});
