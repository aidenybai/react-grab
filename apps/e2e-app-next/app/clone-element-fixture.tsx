"use client";

import { cloneElement, useState } from "react";

const CloneableTarget = (props: CloneableTargetProps) => (
  <button
    data-cloned={props["data-cloned"]}
    data-testid={props["data-testid"]}
    onClick={props.onClick}
    type="button"
  >
    {props.children}
  </button>
);

export const CloneElementFixture = () => {
  const [activationCount, setActivationCount] = useState(0);
  const sourceElement = <CloneableTarget>Clone element target</CloneableTarget>;

  return cloneElement(sourceElement, {
    "data-cloned": "true",
    "data-testid": "cloned-target",
    onClick: () => setActivationCount((currentCount) => currentCount + 1),
    children: `Clone element target ${activationCount}`,
  });
};
