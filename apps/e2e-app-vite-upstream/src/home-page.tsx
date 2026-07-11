import { Link } from "react-router-dom";
import { RecoverableErrorSection } from "./error-boundary";
import { OwnerCases } from "./owner-cases";
import { ProductionIconLink } from "./production-icon-link";
import { SelectorCases } from "./selector-cases";
import { ClientStateCases, KeyCases, ReorderCase } from "./state-cases";
import { SuspenseSection } from "./suspense-section";

const RUNTIME_MODE = import.meta.env.PROD ? "production" : "development";

export const HomePage = () => (
  <main>
    <header>
      <p data-framework="Stock Vite" data-runtime={RUNTIME_MODE} data-testid="runtime-marker">
        Stock Vite · {RUNTIME_MODE}
      </p>
      <h1 data-testid="page-title">React Grab stock Vite fixture</h1>
      <nav className="target-row">
        <Link data-testid="detail-route-link" to="/detail">
          Open detail route
        </Link>
        <ProductionIconLink />
      </nav>
    </header>

    <section>
      <h2>Smoke target</h2>
      <button data-testid="grab-smoke-target" type="button">
        Grab smoke target
      </button>
    </section>

    <KeyCases />
    <ReorderCase />
    <ClientStateCases />
    <OwnerCases />
    <SuspenseSection />
    <SelectorCases />

    <section>
      <h2>Recoverable error boundary</h2>
      <RecoverableErrorSection />
    </section>
  </main>
);
