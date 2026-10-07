import { cloneElement, useState } from "react";
import { createPortal } from "react-dom";

const PassedChildWrapper = (props: PassedChildProps) => (
  <div className="target-row">{props.children}</div>
);

const CloningWrapper = (props: CloningWrapperProps) => {
  const [wasClicked, setWasClicked] = useState(false);

  return (
    <div className="target-row">
      {cloneElement(props.children, {
        onClick: () => setWasClicked(true),
        title: "Cloned with an added title and click handler",
      })}
      <output>{wasClicked ? "Clone handler ran" : "Clone handler ready"}</output>
    </div>
  );
};

const PortalTarget = () => {
  const portalRoot = document.getElementById("portal-root");

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <button data-testid="portal-target" type="button">
      Portaled target
    </button>,
    portalRoot,
  );
};

export const OwnerCases = () => (
  <section>
    <h2>Ownership</h2>
    <PassedChildWrapper>
      <button data-testid="passed-child-target" type="button">
        Passed child target
      </button>
    </PassedChildWrapper>
    <CloningWrapper>
      <button data-testid="cloned-target" type="button">
        Cloned target
      </button>
    </CloningWrapper>
    <PortalTarget />
  </section>
);
