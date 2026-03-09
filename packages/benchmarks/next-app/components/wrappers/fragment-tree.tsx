"use client";
import React, { Fragment } from "react";

function Layer1({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer2({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer3({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer4({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer5({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer6({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer7({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer8({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer9({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function Layer10({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

export function FragmentTree({ children }: { children: React.ReactNode }) {
  return (
    <Layer1>
      <Layer2>
        <Layer3>
          <Layer4>
            <Layer5>
              <Layer6>
                <Layer7>
                  <Layer8>
                    <Layer9>
                      <Layer10>{children}</Layer10>
                    </Layer9>
                  </Layer8>
                </Layer7>
              </Layer6>
            </Layer5>
          </Layer4>
        </Layer3>
      </Layer2>
    </Layer1>
  );
}
