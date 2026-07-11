import { cloneElement, Component, Fragment, lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SUSPENSE_REVEAL_DELAY_MS } from "../constants";

const SuspenseRevealedTarget = () => (
  <p data-testid="suspense-revealed-target">Suspense content revealed</p>
);

const LazySuspenseTarget = lazy(async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, SUSPENSE_REVEAL_DELAY_MS);
  });

  return { default: SuspenseRevealedTarget };
});

const PassedChildWrapper = (props: PassedChildWrapperProps) => props.children;

const CloningWrapper = (props: CloningWrapperProps) => {
  const [cloneClickCount, setCloneClickCount] = useState(0);

  return cloneElement(props.child, {
    "data-cloned": String(cloneClickCount),
    "data-testid": "cloned-target",
    onClick: () => setCloneClickCount((currentCount) => currentCount + 1),
  });
};

const PortalFixture = () => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const portalRoot = isHydrated ? document.getElementById("fixture-portal-root") : null;

  return portalRoot
    ? createPortal(
        <button data-testid="portal-target" type="button">
          Portal target
        </button>,
        portalRoot,
      )
    : null;
};

const SuspenseFixture = () => {
  const [isSuspenseVisible, setIsSuspenseVisible] = useState(false);

  return (
    <section>
      <button
        data-testid="suspense-trigger"
        onClick={() => setIsSuspenseVisible(true)}
        type="button"
      >
        Reveal suspense target
      </button>
      {isSuspenseVisible ? (
        <Suspense fallback={<p data-testid="suspense-fallback">Loading suspense target</p>}>
          <LazySuspenseTarget />
        </Suspense>
      ) : null}
    </section>
  );
};

const KeyedRemountChild = () => {
  const [localCount, setLocalCount] = useState(0);

  return (
    <button
      data-testid="keyed-remount-target"
      onClick={() => setLocalCount((currentCount) => currentCount + 1)}
      type="button"
    >
      Keyed child count: {localCount}
    </button>
  );
};

const KeyedRemountFixture = () => {
  const [remountKey, setRemountKey] = useState(0);

  return (
    <section>
      <KeyedRemountChild key={remountKey} />
      <button
        data-testid="keyed-remount-trigger"
        onClick={() => setRemountKey((currentKey) => currentKey + 1)}
        type="button"
      >
        Remount keyed target
      </button>
    </section>
  );
};

const RecoverableErrorTarget = (props: RecoverableErrorTargetProps) => {
  if (props.shouldThrow) {
    throw new Error("Recoverable fixture error");
  }

  return <p>Client error boundary ready</p>;
};

class ClientErrorBoundary extends Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  state: ClientErrorBoundaryState = { error: null };

  static getDerivedStateFromError = (error: Error) => ({ error });

  handleReset = () => {
    this.props.onReset();
    this.setState({ error: null });
  };

  render = () =>
    this.state.error ? (
      <div data-testid="error-fallback">
        <p>Recovered by the client error boundary</p>
        <button data-testid="error-reset" onClick={this.handleReset} type="button">
          Reset error boundary
        </button>
      </div>
    ) : (
      this.props.children
    );
}

const ClientErrorFixture = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  return (
    <section>
      <button data-testid="error-trigger" onClick={() => setShouldThrow(true)} type="button">
        Trigger recoverable error
      </button>
      <ClientErrorBoundary onReset={() => setShouldThrow(false)}>
        <RecoverableErrorTarget shouldThrow={shouldThrow} />
      </ClientErrorBoundary>
    </section>
  );
};

const KeyFixtures = () => {
  const [isReversed, setIsReversed] = useState(false);
  const reorderItems = isReversed
    ? [
        { id: "third", label: "Third reorder item" },
        { id: "first", label: "First reorder item" },
        { id: "target", label: "Reorder target" },
      ]
    : [
        { id: "target", label: "Reorder target" },
        { id: "first", label: "First reorder item" },
        { id: "third", label: "Third reorder item" },
      ];

  return (
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
        <button key="numeric-sibling" type="button">
          Numeric key sibling
        </button>,
        <button data-testid="numeric-key-target" key={42} type="button">
          Numeric keyed target
        </button>,
      ]}
      {[
        <button key="item:one/✓" type="button">
          Punctuated key sibling
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
      {[
        <Fragment key="fragment-first">
          <button type="button">First fragment keyed target</button>
        </Fragment>,
        <Fragment key="fragment-second">
          <button data-testid="fragment-key-target" type="button">
            Second fragment keyed target
          </button>
        </Fragment>,
      ]}
      <div>
        {reorderItems.map((item) => (
          <button
            data-testid={item.id === "target" ? "reorder-key-target" : undefined}
            key={item.id}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <button
        data-testid="reorder-list-button"
        onClick={() => setIsReversed((currentValue) => !currentValue)}
        type="button"
      >
        Reorder keyed list
      </button>
    </section>
  );
};

export const HomeFixtures = () => {
  const [hydrationCount, setHydrationCount] = useState(0);

  return (
    <>
      <KeyFixtures />
      <section>
        <p data-testid="hydration-counter">Hydration count: {hydrationCount}</p>
        <button
          data-testid="hydration-counter-button"
          onClick={() => setHydrationCount((currentCount) => currentCount + 1)}
          type="button"
        >
          Increment hydration counter
        </button>
      </section>
      <PassedChildWrapper>
        <button data-testid="passed-child-target" type="button">
          Passed child target
        </button>
      </PassedChildWrapper>
      <CloningWrapper child={<button type="button">Cloned element target</button>} />
      <PortalFixture />
      <SuspenseFixture />
      <KeyedRemountFixture />
      <section>
        <button
          data-selector-value={'quotes" brackets[] colon: slash/ check✓'}
          data-testid="selector-special-target"
          type="button"
        >
          Selector special target
        </button>
        <a href="/detail">Duplicate semantic link</a>
        <a href="/detail">Duplicate semantic link</a>
      </section>
      <ClientErrorFixture />
    </>
  );
};
