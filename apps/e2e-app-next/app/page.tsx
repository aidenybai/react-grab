import Link from "next/link";
import { Suspense } from "react";
import { ClientSuspenseFixture } from "./client-suspense-fixture";
import { CloneElementFixture } from "./clone-element-fixture";
import { ErrorBoundaryFixture } from "./error-boundary-fixture";
import { HydrationCounter } from "./hydration-counter";
import { KeyedRemountFixture } from "./keyed-remount-fixture";
import { NestedRscFixture } from "./nested-rsc-fixture";
import { PassedChild } from "./passed-child";
import { PortalFixture } from "./portal-fixture";
import { ReactGrabClient } from "./react-grab-client";
import { ProductionIconLink } from "./production-icon-link";
import { ReorderFixture } from "./reorder-fixture";
import { SelectorFixture } from "./selector-fixture";
import { ServerCard } from "./server-card";
import { SlowFetcher } from "./slow-fetcher";
import { StreamedServerTarget } from "./streamed-server-target";

const Page = () => {
  const runtime = process.env.NODE_ENV === "production" ? "production" : "development";

  return (
    <main style={{ padding: 24 }}>
      <h1 data-testid="page-title">React Grab E2E (Next)</h1>
      <p data-testid="runtime-marker">Framework: Next.js · Runtime: {runtime}</p>
      <button data-testid="grab-smoke-target" type="button">
        Smoke target
      </button>
      <ProductionIconLink />
      <ServerCard />
      <section data-testid="key-edge-cases">
        {[
          <button data-testid="single-key-target" key="only" type="button">
            Single keyed target
          </button>,
        ]}
        {[
          <button data-testid="list-key-target-first" key="first" type="button">
            First keyed target
          </button>,
          <button data-testid="list-key-target-second" key="second" type="button">
            Second keyed target
          </button>,
        ]}
        {[
          <button key={1} type="button">
            Numeric keyed sibling
          </button>,
          <button data-testid="numeric-key-target" key={2} type="button">
            Numeric keyed target
          </button>,
        ]}
        {[
          <button key="item:one/✓" type="button">
            Punctuated keyed sibling
          </button>,
          <button data-testid="punctuated-key-target" key="item:two/✓" type="button">
            Punctuated keyed target
          </button>,
        ]}
        <div>
          {[
            <button key="nested-first" type="button">
              Nested keyed sibling
            </button>,
            <button data-testid="nested-key-target" key="nested-second" type="button">
              Nested keyed target
            </button>,
          ]}
        </div>
      </section>
      <ReorderFixture />
      <HydrationCounter />
      <PassedChild>
        <button data-testid="passed-child-target" type="button">
          Passed child target
        </button>
      </PassedChild>
      <CloneElementFixture />
      <PortalFixture />
      <ClientSuspenseFixture />
      <KeyedRemountFixture />
      <SelectorFixture />
      <ErrorBoundaryFixture />
      <NestedRscFixture />
      <Suspense fallback={<p data-testid="streamed-server-fallback">Streaming server target…</p>}>
        <StreamedServerTarget />
      </Suspense>
      <Link data-testid="detail-route-link" href="/detail">
        Open detail route
      </Link>
      <SlowFetcher />
      <ReactGrabClient />
    </main>
  );
};

export default Page;
