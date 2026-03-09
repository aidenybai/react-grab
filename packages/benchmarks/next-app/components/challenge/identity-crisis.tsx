"use client";
import React, { Fragment, memo, forwardRef } from "react";
import styled from "styled-components";
import { withTracking } from "@/components/hoc/with-tracking";
import { withErrorBoundary } from "@/components/hoc/with-error-boundary";

const IdentityButtonStyled = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--background);
  cursor: pointer;
  font-size: 13px;
  color: var(--foreground);
`;

function IdentityButton({ "data-testid": testId }: { "data-testid"?: string }) {
  return (
    <IdentityButtonStyled className="identity-btn" data-testid={testId}>
      Click
    </IdentityButtonStyled>
  );
}

function Depth1() {
  return <IdentityButton data-testid="identity-depth-1" />;
}

function Depth3() {
  return (
    <Fragment>
      <Fragment>
        <IdentityButton data-testid="identity-depth-3" />
      </Fragment>
    </Fragment>
  );
}

const Depth5Inner = memo(function Depth5Inner() {
  return (
    <Fragment>
      <Fragment>
        <Fragment>
          <IdentityButton data-testid="identity-depth-5" />
        </Fragment>
      </Fragment>
    </Fragment>
  );
});
function Depth5() {
  return <Depth5Inner />;
}

const Depth7Core = memo(function Depth7Core() {
  return (
    <Fragment>
      <IdentityButton data-testid="identity-depth-7" />
    </Fragment>
  );
});
function Depth7Inner() {
  return (
    <Fragment>
      <Fragment>
        <Fragment>
          <Depth7Core />
        </Fragment>
      </Fragment>
    </Fragment>
  );
}
const Depth7 = withTracking(Depth7Inner, "identity-7");

const Depth9Core = memo(function Depth9Core() {
  return (
    <Fragment>
      <IdentityButton data-testid="identity-depth-9" />
    </Fragment>
  );
});
function Depth9Inner() {
  return (
    <Fragment>
      <Fragment>
        <Fragment>
          <Fragment>
            <Depth9Core />
          </Fragment>
        </Fragment>
      </Fragment>
    </Fragment>
  );
}
const Depth9 = withErrorBoundary(withTracking(Depth9Inner, "identity-9"));

const Depth11Core = memo(function Depth11Core() {
  return (
    <Fragment>
      <IdentityButton data-testid="identity-depth-11" />
    </Fragment>
  );
});
function Depth11Inner() {
  return (
    <Fragment>
      <Fragment>
        <Fragment>
          <Fragment>
            <Fragment>
              <Depth11Core />
            </Fragment>
          </Fragment>
        </Fragment>
      </Fragment>
    </Fragment>
  );
}
const Depth11 = withErrorBoundary(
  withTracking(withErrorBoundary(Depth11Inner), "identity-11"),
);

export function IdentityCrisis() {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        d1:
      </span>
      <Depth1 />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        d3:
      </span>
      <Depth3 />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        d5:
      </span>
      <Depth5 />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        d7:
      </span>
      <Depth7 />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        d9:
      </span>
      <Depth9 />
      <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>
        d11:
      </span>
      <Depth11 />
    </div>
  );
}
