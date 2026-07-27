import { cloneElement, Fragment, memo, Suspense } from "react";
import { createPortal } from "react-dom";
import { ProductionProvider } from "./components/ui/production-provider";

interface ChildrenProps {
  children: React.ReactNode;
}

interface ElementChildProps {
  children: React.ReactElement;
}

interface RenderPropProps {
  children: () => React.ReactNode;
}

const StructuralWrapper = ({ children }: ChildrenProps) => (
  <div data-testid="owner-structural-wrapper">
    <span data-testid="wrapper-owned-target">Wrapper-owned target</span>
    {children}
  </div>
);

const PassthroughOwner = () => (
  <StructuralWrapper>
    <button data-testid="passthrough-owner-target" type="button">
      Passthrough owner target
    </button>
  </StructuralWrapper>
);

const CloningWrapper = ({ children }: ElementChildProps) => cloneElement(children);

const CloneOwner = () => (
  <CloningWrapper>
    <button data-testid="clone-owner-target" type="button">
      Clone owner target
    </button>
  </CloningWrapper>
);

const RenderPropWrapper = ({ children }: RenderPropProps) => <div>{children()}</div>;

const RenderPropOwner = () => (
  <RenderPropWrapper>
    {() => (
      <button data-testid="render-prop-owner-target" type="button">
        Render prop owner target
      </button>
    )}
  </RenderPropWrapper>
);

const PortalOwner = () =>
  createPortal(
    <button data-testid="portal-owner-target" type="button">
      Portal owner target
    </button>,
    document.body,
  );

const MemoLeaf = memo(() => (
  <button data-testid="memo-owner-target" type="button">
    Memo owner target
  </button>
));

MemoLeaf.displayName = "MemoLeaf";

const DirectOwner = () => (
  <button data-testid="direct-owner-target" type="button">
    Direct owner target
  </button>
);

const FragmentOwner = () => (
  <>
    <button data-testid="fragment-owner-target" type="button">
      Fragment owner target
    </button>
  </>
);

const SuspenseOwner = () => (
  <Suspense fallback={<span>Loading owner target</span>}>
    <button data-testid="suspense-owner-target" type="button">
      Suspense owner target
    </button>
  </Suspense>
);

const DuplicateContextOwner = () => (
  <div>
    <button className="duplicate-context-target" type="button">
      <span>Repeated action</span>
    </button>
    <button className="duplicate-context-target" type="button">
      <span>Repeated action</span>
    </button>
  </div>
);

const GeneratedIdOwner = () => (
  <>
    <button className="generated-id-only-target" id=":r0:" type="button">
      Generated ID target
    </button>
    <button
      data-testid="generated-id-semantic-target"
      id="550e8400-e29b-41d4-a716-446655440000"
      type="button"
    >
      Generated ID with semantic attribute
    </button>
    <button data-testid="semantic-ancestor-target" type="button">
      <span id=":r2:">
        <span className="nested-generated-id-target">Nested generated ID target</span>
      </span>
    </button>
    <button aria-label="Unique semantic ancestor" type="button">
      <span data-testid="repeated-semantic-candidate">
        <span className="nested-repeated-semantic-target">Nested repeated semantic target</span>
      </span>
    </button>
    <button aria-label="Other semantic ancestor" type="button">
      <span data-testid="repeated-semantic-candidate">Other repeated semantic target</span>
    </button>
    <div data-testid="generic-control-semantic-ancestor">
      <button type="button">
        <span className="generic-control-nested-target">Nested generic control target</span>
      </button>
    </div>
  </>
);

const ProductionIconLink = () => (
  <a
    aria-label="Production GitHub link"
    data-testid="production-icon-link"
    href="https://github.com/aidenybai/react-grab"
  >
    <svg height="24" role="img" viewBox="0 0 24 24" width="24">
      <g>
        <path d="M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Z" />
      </g>
    </svg>
  </a>
);

export const OwnerStackCases = () => (
  <ProductionProvider>
    <section data-testid="owner-stack-cases">
      <DirectOwner />
      <PassthroughOwner />
      <CloneOwner />
      <RenderPropOwner />
      <PortalOwner />
      <MemoLeaf />
      <FragmentOwner />
      <SuspenseOwner />
      <DuplicateContextOwner />
      <GeneratedIdOwner />
      <ProductionIconLink />
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
        <button data-testid="escaped-key-target" key={'item:"two"\nnext'} type="button">
          Escaped key target
        </button>,
        <button key="escaped-key-sibling" type="button">
          Escaped key sibling
        </button>,
      ]}
      {[
        <Fragment key="fragment-first">
          <button className="structural-selector-target" type="button">
            First fragment keyed target
          </button>
        </Fragment>,
        <Fragment key="fragment-second">
          <button data-testid="fragment-key-target" type="button">
            Second fragment keyed target
          </button>
        </Fragment>,
      ]}
    </section>
  </ProductionProvider>
);

OwnerStackCases.displayName = "OwnerStackCases";
