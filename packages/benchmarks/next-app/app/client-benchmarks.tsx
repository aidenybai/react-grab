"use client";
import React, { useState } from "react";

import { StyledCard } from "@/components/styled/styled-card";
import { StyledButton } from "@/components/styled/styled-button";
import { StyledBadge } from "@/components/styled/styled-badge";
import { StyledSection, StyledGrid } from "@/components/styled/styled-layout";
import { StyledAvatar } from "@/components/styled/styled-avatar";
import { StyledDataCell } from "@/components/styled/styled-data-cell";

import { RadixDialog } from "@/components/radix/radix-dialog";
import { RadixDropdown } from "@/components/radix/radix-dropdown";
import { RadixTabs } from "@/components/radix/radix-tabs";
import { RadixPopover } from "@/components/radix/radix-popover";
import { RadixAccordion } from "@/components/radix/radix-accordion";

import { AnimatedCard } from "@/components/motion/animated-card";
import { AnimatedList } from "@/components/motion/animated-list";
import { AnimatedModal } from "@/components/motion/animated-modal";
import { AnimatedTabs } from "@/components/motion/animated-tabs";
import { StaggerGrid } from "@/components/motion/stagger-grid";

import { RecursiveTree } from "@/components/recursive/recursive-tree";
import { RecursiveMenu } from "@/components/recursive/recursive-menu";
import { FractalLayout } from "@/components/recursive/fractal-layout";

import { MemoWrapper } from "@/components/wrappers/memo-wrapper";
import { ForwardRefWrapper } from "@/components/wrappers/forward-ref-wrapper";
import { FragmentTree } from "@/components/wrappers/fragment-tree";
import { SuspenseLazyLoader } from "@/components/wrappers/suspense-lazy-loader";

import { DynamicRenderer } from "@/components/computed/dynamic-renderer";
import { ConditionalTree } from "@/components/computed/conditional-tree";

import { withTracking } from "@/components/hoc/with-tracking";
import { withTooltip } from "@/components/hoc/with-tooltip";

import { TwCard } from "@/components/tailwind/tw-card";
import { TwButton } from "@/components/tailwind/tw-button";
import { TwBadge } from "@/components/tailwind/tw-badge";
import { TwDashboard } from "@/components/tailwind/tw-dashboard";
import { TwNav } from "@/components/tailwind/tw-nav";

import { ModuleCard } from "@/components/modules/module-card";
import { ModuleNav } from "@/components/modules/module-nav";
import { ModuleTable } from "@/components/modules/module-table";
import { ModuleAccordion } from "@/components/modules/module-accordion";

import { InlineCard } from "@/components/mixed/inline-card";
import { InlineList } from "@/components/mixed/inline-list";
import { StyleClash } from "@/components/mixed/style-clash";
import { TwStyledHybrid } from "@/components/mixed/tw-styled-hybrid";
import { ModuleTwHybrid } from "@/components/mixed/module-tw-hybrid";
import { InlineMotionHybrid } from "@/components/mixed/inline-motion-hybrid";

import { ShadcnProfileCard } from "@/components/shadcn/shadcn-profile-card";
import { ShadcnForm } from "@/components/shadcn/shadcn-form";
import { ShadcnDataDisplay } from "@/components/shadcn/shadcn-data-display";

import { TheGauntlet } from "@/components/challenge/the-gauntlet";
import { RussianDoll } from "@/components/challenge/russian-doll";
import { PortalInception } from "@/components/challenge/portal-inception";
import { AnimationMaze } from "@/components/challenge/animation-maze";
import { IdentityCrisis } from "@/components/challenge/identity-crisis";
import { Shapeshifter } from "@/components/challenge/shapeshifter";

import { createWidget } from "@/lib/create-widget";
import { ConfirmDialogContent } from "@/hooks/use-confirm-dialog";
import { NotificationStatusBadge } from "@/components/providers/notification-provider";
import { PrimaryAction } from "@/components/core/interactive/primary-action";
import { ConfirmBookingButton } from "@/components/features/booking/actions/confirm-booking-button";
import { DisplayNameField } from "@/components/features/settings/profile/fields/display-name-field";
import { MetricChart } from "@/components/features/analytics/charts/metric-chart";
import { RichTextBlock } from "@/components/features/editor/blocks/rich-text-block";
import { SystemBanner } from "@/components/features/notifications/banners/system-banner";
import { StatusIndicator } from "@/lib/render-utils";
import { FormattedCurrency } from "@/lib/data-formatters";
import { IntegrationCard } from "@/components/generated/integration-registry";

const RevenueWidget = createWidget({
  title: "Revenue",
  icon: "$",
  testId: "factory-revenue-widget",
});
const UsersWidget = createWidget({
  title: "Active Users",
  icon: "U",
  testId: "factory-users-widget",
});

const TrackedCard = withTracking(StyledCard, "tracked-card");
const MemoForwardRefButton = withTooltip(
  StyledButton,
  "Memo + ForwardRef Button",
);

export function ClientBenchmarks() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
        React Grab Benchmark
      </h1>
      <p style={{ color: "var(--muted-foreground)", marginBottom: 32 }}>
        Deeply nested Next.js app with styled-components, Tailwind, CSS Modules,
        shadcn/ui, inline styles, motion, Radix UI, recursive components, HOCs,
        portals, fragments, and suspense.
      </p>

      <StyledSection title="Easy: Baselines">
        <StyledGrid columns={3}>
          <StyledCard title="Simple Card" data-testid="plain-styled-card">
            A plain styled card with no wrapping complexity.
          </StyledCard>

          <div>
            <StyledButton data-testid="plain-styled-button">
              Simple Button
            </StyledButton>
          </div>

          <div>
            <StyledBadge data-testid="plain-styled-badge">New</StyledBadge>
          </div>

          <RadixTabs
            data-testid="plain-radix-tabs"
            tabs={[
              {
                value: "tab1",
                label: "Tab 1",
                content: <div>Tab 1 content</div>,
                testId: "radix-tabs-trigger",
              },
              {
                value: "tab2",
                label: "Tab 2",
                content: <div>Tab 2 content</div>,
              },
            ]}
          />

          <AnimatedCard data-testid="plain-animated-card">
            Simple animated card
          </AnimatedCard>

          <div data-testid="provider-child">
            Content rendered inside 6 providers
          </div>

          <TwCard title="Tailwind Card" data-testid="plain-tw-card">
            Pure Tailwind utility classes, no other styling.
          </TwCard>

          <div>
            <TwButton data-testid="plain-tw-button">Tailwind Button</TwButton>
          </div>

          <div>
            <TwBadge data-testid="plain-tw-badge" color="blue">
              Tailwind
            </TwBadge>
          </div>

          <ModuleCard title="Module Card" data-testid="plain-module-card">
            CSS Modules scoped styles.
          </ModuleCard>

          <InlineCard title="Inline Card" data-testid="plain-inline-card">
            Pure inline React styles, zero class names.
          </InlineCard>

          <ShadcnProfileCard data-testid="shadcn-profile-card" />
        </StyledGrid>
      </StyledSection>

      <StyledSection title="Medium: Moderate Nesting">
        <StyledGrid columns={2}>
          <TrackedCard title="Tracked Card" data-testid="tracked-styled-card">
            Card wrapped in withTracking HOC
          </TrackedCard>

          <div>
            <MemoForwardRefButton
              data-testid="memo-forwardref-button"
              variant="secondary"
            >
              Memo+Ref Button
            </MemoForwardRefButton>
          </div>

          <RadixDialog
            triggerLabel="Open Dialog"
            title="Benchmark Dialog"
            description="This dialog renders via a portal"
            data-testid="radix-dialog-trigger"
          >
            <p>Dialog content here</p>
          </RadixDialog>

          <RadixDropdown
            triggerLabel="Actions"
            data-testid="radix-dropdown-trigger"
            items={[
              { label: "Edit", testId: "radix-dropdown-item" },
              { label: "Delete" },
              { label: "Share" },
            ]}
          />

          <RadixAccordion
            data-testid="radix-accordion"
            items={[
              {
                value: "item1",
                title: "Section 1",
                content: (
                  <div data-testid="radix-accordion-content">
                    Accordion content panel
                  </div>
                ),
                testId: "radix-accordion-trigger",
              },
              {
                value: "item2",
                title: "Section 2",
                content: <div>More content</div>,
              },
            ]}
          />

          <AnimatedList
            data-testid="animated-list"
            items={[
              { id: "1", content: "First item" },
              {
                id: "2",
                content: "Second item",
                testId: "animated-list-item",
              },
              { id: "3", content: "Third item" },
            ]}
          />

          <RadixPopover
            triggerLabel="Open Popover"
            data-testid="radix-popover-trigger"
          >
            <div data-testid="radix-popover-content">Popover content here</div>
          </RadixPopover>

          <FragmentTree>
            <StyledAvatar initials="AB" data-testid="fragment-tree-avatar" />
          </FragmentTree>

          <SuspenseLazyLoader data-testid="suspense-lazy-content" />

          <StaggerGrid
            data-testid="stagger-grid"
            columns={3}
            items={[
              { id: "g1", content: "Grid 1" },
              { id: "g2", content: "Grid 2", testId: "stagger-grid-child" },
              { id: "g3", content: "Grid 3" },
              { id: "g4", content: "Grid 4" },
              { id: "g5", content: "Grid 5" },
              { id: "g6", content: "Grid 6" },
            ]}
          />

          <RadixTabs
            tabs={[
              {
                value: "panel1",
                label: "Panel A",
                content: (
                  <div data-testid="radix-tabs-panel-content">
                    Tab panel content
                  </div>
                ),
              },
              {
                value: "panel2",
                label: "Panel B",
                content: <div>Panel B content</div>,
              },
            ]}
          />

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <StyledDataCell
                  label="Revenue"
                  sub="Q4 2025"
                  data-testid="styled-data-cell"
                />
                <StyledDataCell label="$1.2M" sub="+12%" />
              </tr>
            </tbody>
          </table>

          <TwDashboard data-testid="tw-dashboard" />
          <TwNav data-testid="tw-nav" />

          <ModuleTable data-testid="module-table" />
          <ModuleNav data-testid="module-nav" />
          <ModuleAccordion
            data-testid="module-accordion"
            items={[
              {
                id: "ma1",
                title: "What is CSS Modules?",
                content: "CSS Modules scope styles locally by default.",
              },
              {
                id: "ma2",
                title: "How does it work?",
                content: "Class names are transformed at build time.",
              },
              {
                id: "ma3",
                title: "Why use it?",
                content: "Prevents style collisions in large apps.",
              },
            ]}
          />

          <InlineList
            data-testid="inline-list"
            items={[
              {
                id: "1",
                label: "Feature A",
                description: "Core functionality",
                tag: "New",
              },
              {
                id: "2",
                label: "Feature B",
                description: "Enhancement",
                tag: "Beta",
              },
              { id: "3", label: "Feature C", description: "Experimental" },
            ]}
          />

          <ShadcnForm data-testid="shadcn-form" />
          <ShadcnDataDisplay data-testid="shadcn-data-display" />
        </StyledGrid>
      </StyledSection>

      <StyledSection title="Hard: Deep Nesting">
        <StyledGrid columns={2}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Recursive Tree (depth=8, 256 leaves)
            </h3>
            <RecursiveTree depth={8} data-testid="recursive-tree" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Recursive Menu (10 levels)
            </h3>
            <RecursiveMenu depth={10} data-testid="recursive-menu" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Fractal Layout
            </h3>
            <FractalLayout depth={4} data-testid="fractal-layout" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              HOC + Motion + Styled
            </h3>
            <MemoWrapper>
              <ForwardRefWrapper>
                <AnimatedCard data-testid="hoc-motion-styled-card">
                  HOC-wrapped motion card inside styled layout
                </AnimatedCard>
              </ForwardRefWrapper>
            </MemoWrapper>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Tooltip + HOC + Styled
            </h3>
            <MemoForwardRefButton
              data-testid="tooltip-hoc-styled-button"
              variant="ghost"
            >
              Hover for tooltip
            </MemoForwardRefButton>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Portal + Motion Modal
            </h3>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                padding: "8px 16px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--background)",
                cursor: "pointer",
              }}
            >
              Open Motion Modal
            </button>
            <AnimatedModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              data-testid="portal-motion-modal"
            >
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
                Motion Modal
              </h3>
              <p style={{ color: "var(--muted-foreground)", marginTop: 8 }}>
                This modal animates in via a portal
              </p>
            </AnimatedModal>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Dynamic Renderer
            </h3>
            <DynamicRenderer type="success" data-testid="dynamic-renderer" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Conditional Tree
            </h3>
            <ConditionalTree
              seed="benchmark"
              depth={6}
              data-testid="conditional-tree"
            />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Animated Tabs
            </h3>
            <AnimatedTabs
              data-testid="animated-tabs"
              tabs={[
                {
                  id: "at1",
                  label: "Overview",
                  content: <div>Overview content</div>,
                },
                {
                  id: "at2",
                  label: "Details",
                  content: <div>Details content</div>,
                },
                {
                  id: "at3",
                  label: "Settings",
                  content: <div>Settings content</div>,
                },
              ]}
            />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Button in Dialog in Motion
            </h3>
            <RadixDialog
              triggerLabel="Open Nested"
              title="Nested Dialog"
              data-testid="nested-dialog-trigger"
            >
              <AnimatedCard>
                <StyledButton data-testid="button-in-dialog-in-motion">
                  Deep Button
                </StyledButton>
              </AnimatedCard>
            </RadixDialog>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Style Clash (4 methods on 1 element)
            </h3>
            <StyleClash data-testid="style-clash" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Tailwind + styled-components Hybrid
            </h3>
            <TwStyledHybrid data-testid="tw-styled-hybrid" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              CSS Modules + Tailwind Hybrid
            </h3>
            <ModuleTwHybrid data-testid="module-tw-hybrid" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Inline + Motion Hybrid
            </h3>
            <InlineMotionHybrid data-testid="inline-motion-hybrid" />
          </div>
        </StyledGrid>
      </StyledSection>

      <StyledSection title="Nightmare: Maximum Difficulty">
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              The Gauntlet (~25 Fiber layers)
            </h3>
            <TheGauntlet />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Russian Doll (15+ HOC layers)
            </h3>
            <RussianDoll />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Portal Inception (3 nested portals)
            </h3>
            <PortalInception />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Animation Maze
            </h3>
            <AnimationMaze data-testid="animation-maze-content" />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Identity Crisis (same component, 6 depths)
            </h3>
            <IdentityCrisis />
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
              Shapeshifter (changes tree on render)
            </h3>
            <Shapeshifter data-testid="shapeshifter" />
          </div>
        </div>
      </StyledSection>

      <StyledSection title="Adversarial: Hidden Sources">
        <StyledGrid columns={2}>
          <RevenueWidget value="$1.2M" trend="+12.5%" />
          <UsersWidget value="8,421" trend="+3.2%" />

          <ConfirmDialogContent
            title="Delete Account"
            message="Are you sure? This action cannot be undone."
            onConfirm={() => {}}
            onCancel={() => {}}
          />

          <NotificationStatusBadge count={5} status="error" />

          <PrimaryAction variant="default" size="md">
            Primary Action
          </PrimaryAction>

          <ConfirmBookingButton
            bookingId="bk_abc123"
            onConfirm={() => Promise.resolve()}
          />

          <DisplayNameField initialValue="Aiden Bai" onChange={() => {}} />

          <MetricChart
            data={[
              { label: "Jan", value: 120 },
              { label: "Feb", value: 180 },
              { label: "Mar", value: 150 },
              { label: "Apr", value: 220 },
              { label: "May", value: 190 },
            ]}
            title="Monthly Revenue"
          />

          <RichTextBlock initialContent="Hello world" readOnly={true} />

          <SystemBanner
            message="System maintenance scheduled for March 20th, 2026."
            variant="warning"
            dismissible={true}
          />

          <StatusIndicator status="online" label="All systems operational" />

          <FormattedCurrency amount={1234.56} currency="USD" />

          <IntegrationCard slug="slack" connected={true} />
        </StyledGrid>
      </StyledSection>
    </div>
  );
}
