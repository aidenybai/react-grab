import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const initializedClosedShadowHosts = new WeakSet<HTMLDivElement>();

const FiberOwnedSlot = () => <slot name="fiber-owned-content" />;

const SlottedLightDomOwner = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const hostElement = hostRef.current;
    if (!hostElement || hostElement.shadowRoot) return;
    setShadowRoot(hostElement.attachShadow({ mode: "open" }));
  }, []);

  return (
    <>
      <div
        ref={hostRef}
        data-testid="fiber-slot-host"
        dangerouslySetInnerHTML={{
          __html:
            '<button slot="fiber-owned-content" data-testid="fiber-slotted-light-target">Fiber slotted light target</button>',
        }}
      />
      {shadowRoot && createPortal(<FiberOwnedSlot />, shadowRoot)}
    </>
  );
};

export const ShadowDomEdgeFixture = () => {
  const slottedHostRef = useRef<HTMLDivElement>(null);
  const closedHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slottedHostElement = slottedHostRef.current;
    if (!slottedHostElement || slottedHostElement.shadowRoot) return;

    slottedHostElement.attachShadow({ mode: "open" }).innerHTML = `
      <style>:host { display: block; padding: 12px; border: 1px solid #94a3b8; }</style>
      <slot name="nested-content"></slot>
    `;
    const nestedShadowHost = slottedHostElement.querySelector<HTMLElement>(
      "[data-testid='slotted-shadow-host']",
    );
    if (!nestedShadowHost) return;
    const nestedShadowButton = document.createElement("button");
    nestedShadowButton.textContent = "Nested slotted shadow target";
    nestedShadowButton.dataset.testid = "slotted-shadow-target";
    nestedShadowHost.attachShadow({ mode: "open" }).append(nestedShadowButton);
  }, []);

  useEffect(() => {
    const closedHostElement = closedHostRef.current;
    if (!closedHostElement || initializedClosedShadowHosts.has(closedHostElement)) return;
    initializedClosedShadowHosts.add(closedHostElement);
    closedHostElement.attachShadow({ mode: "closed" }).innerHTML =
      '<button data-testid="closed-shadow-inner">Closed shadow target</button>';
  }, []);

  return (
    <section className="border rounded-lg p-4" data-testid="shadow-edge-section">
      <h2 className="text-lg font-bold mb-4">Shadow DOM Edge Cases</h2>
      <div ref={slottedHostRef} data-testid="slotted-shadow-outer-host">
        <span slot="nested-content" data-testid="slotted-shadow-host">
          Slotted fallback
        </span>
      </div>
      <div
        ref={closedHostRef}
        className="mt-4 p-3 border rounded"
        data-testid="closed-shadow-host"
      />
      <SlottedLightDomOwner />
    </section>
  );
};
