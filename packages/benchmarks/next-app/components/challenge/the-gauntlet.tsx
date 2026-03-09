"use client";
import React, { Suspense, Fragment } from "react";
import { AnimatePresence, motion } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import styled from "styled-components";
import { ProviderStack } from "@/components/providers/provider-stack";
import { withTracking } from "@/components/hoc/with-tracking";
import { withErrorBoundary } from "@/components/hoc/with-error-boundary";
import { withPermissions } from "@/components/hoc/with-permissions";
import { withTooltip } from "@/components/hoc/with-tooltip";

const OuterWrap = styled.div`
  display: contents;
`;

const MiddleWrap = styled.div`
  display: contents;
`;

const InnerWrap = styled.div`
  display: contents;
`;

const GauntletButton = styled.button`
  padding: 10px 20px;
  border-radius: 8px;
  border: 2px solid #ef4444;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`;

function FragmentLayer1({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function FragmentLayer2({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function FragmentLayer3({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function FragmentLayer4({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
function FragmentLayer5({ children }: { children: React.ReactNode }) {
  return <Fragment>{children}</Fragment>;
}

function GauntletCore({ "data-testid": testId }: { "data-testid"?: string }) {
  return (
    <OuterWrap>
      <MiddleWrap>
        <InnerWrap>
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "contents" }}
            >
              <FragmentLayer1>
                <FragmentLayer2>
                  <FragmentLayer3>
                    <FragmentLayer4>
                      <FragmentLayer5>
                        <Suspense fallback={null}>
                          <Dialog.Root defaultOpen>
                            <Dialog.Portal>
                              <Dialog.Content
                                style={{
                                  position: "fixed",
                                  bottom: 20,
                                  right: 20,
                                  zIndex: 50,
                                }}
                              >
                                <GauntletButton data-testid={testId}>
                                  Click me
                                </GauntletButton>
                              </Dialog.Content>
                            </Dialog.Portal>
                          </Dialog.Root>
                        </Suspense>
                      </FragmentLayer5>
                    </FragmentLayer4>
                  </FragmentLayer3>
                </FragmentLayer2>
              </FragmentLayer1>
            </motion.div>
          </AnimatePresence>
        </InnerWrap>
      </MiddleWrap>
    </OuterWrap>
  );
}

const Wrapped = withTracking(
  withErrorBoundary(
    withPermissions(
      withTooltip(GauntletCore, "The ultimate gauntlet challenge"),
    ),
  ),
  "gauntlet",
);

export function TheGauntlet() {
  return (
    <ProviderStack>
      <Wrapped data-testid="gauntlet-button" />
    </ProviderStack>
  );
}
