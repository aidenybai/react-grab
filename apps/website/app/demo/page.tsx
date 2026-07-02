import { Plus, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { createPageMetadata } from "@/lib/metadata";
import { PageHeader } from "@/components/page-header";
import { PageShell } from "@/components/page-shell";
import { ReactGrabLoader } from "@/components/react-grab-loader";
import { SiteFooter } from "@/components/site-footer";
import { LiveClock } from "@/components/demo/live-clock";
import { LoadingStates } from "@/components/demo/loading-states";
import { MarqueeTicker } from "@/components/demo/marquee-ticker";
import { MotionGallery } from "@/components/demo/motion-gallery";
import { MusicPlayerCard } from "@/components/demo/music-player-card";
import { OverlayControls } from "@/components/demo/overlay-controls";
import { StatCounters } from "@/components/demo/stat-counters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const metadata = createPageMetadata({
  title: "Demo",
  description: "Grab live UI elements and watch an agent act on them.",
  path: "/demo",
});

const INVOICES = [
  { id: "INV-0042", customer: "Acme Corp", status: "Paid", amount: "$1,250.00" },
  { id: "INV-0043", customer: "Monsters Inc", status: "Pending", amount: "$864.00" },
  { id: "INV-0044", customer: "Stark Industries", status: "Paid", amount: "$3,120.00" },
  { id: "INV-0045", customer: "Wayne Enterprises", status: "Overdue", amount: "$540.00" },
];

interface KbdProps {
  children: ReactNode;
}

const Kbd = ({ children }: KbdProps) => (
  <kbd className="rounded bg-code px-1.5 py-0.5 font-mono text-xs text-code-ink">{children}</kbd>
);

Kbd.displayName = "Kbd";

interface DemoSectionProps {
  label: string;
  children: ReactNode;
}

const DemoSection = ({ label, children }: DemoSectionProps) => (
  <section className="flex flex-col gap-4">
    <h2 className="font-mono text-xs uppercase tracking-widest text-faint">{label}</h2>
    {children}
  </section>
);

DemoSection.displayName = "DemoSection";

const DemoPage = () => {
  return (
    <PageShell>
      <ReactGrabLoader />

      <div className="pt-20">
        <PageHeader title="Demo" subtitle="React Grab is live on this page." />
      </div>

      <p>
        Everything below is grabbable: buttons, animations, form controls, tables, even elements
        mid-flight. Grab one and paste it into your agent.
      </p>

      <hr className="border-line" />

      <DemoSection label="How you use it">
        <ol className="flex list-decimal flex-col gap-1.5 pl-5">
          <li>Hover any element on this page to see it highlighted.</li>
          <li>
            Press <Kbd>⌘C</Kbd> (or <Kbd>Ctrl+C</Kbd>) to copy it. Drag instead to grab a whole
            region.
          </li>
          <li>Paste into Claude Code, Codex, or Cursor.</li>
        </ol>
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="What agents get">
        <p>A grab gives your agent the source behind what you see:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>The element&rsquo;s markup</li>
          <li>The component stack from the React tree</li>
          <li>
            Source locations, like{" "}
            <code className="rounded bg-code px-1 py-0.5 font-mono text-xs text-code-ink">
              components/login-form.tsx:46:19
            </code>
          </li>
        </ul>
        <p>
          Describing UI in prose (&ldquo;the orange link near the footer&rdquo;) makes your agent
          search for it. A grab names the file and line, so it starts editing instead.
        </p>
      </DemoSection>

      <hr className="border-line" />

      <p>
        Try it on the playground below. Moving targets are fair game: a grab mid-animation resolves
        to the same source as a still one.
      </p>

      <MarqueeTicker />

      <DemoSection label="Live data">
        <StatCounters />
        <LiveClock />
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Motion">
        <MotionGallery />
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Now playing">
        <MusicPlayerCard />
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Loading states">
        <LoadingStates />
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Buttons and badges">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button size="icon" variant="outline" aria-label="Settings">
            <Settings />
          </Button>
          <Button variant="outline">
            <Plus />
            New project
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="secondary">
            <span className="size-1.5 animate-pulse rounded-full bg-brand" />
            Live
          </Badge>
        </div>
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Form controls">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-email">Email</Label>
            <Input id="demo-email" type="email" placeholder="ada@lovelace.dev" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="demo-role">Role</Label>
            <Select>
              <SelectTrigger id="demo-role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="engineer">Engineer</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="demo-feedback">Feedback</Label>
            <Textarea id="demo-feedback" placeholder="Tell us what you think…" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="flex items-center gap-2">
            <Checkbox id="demo-terms" defaultChecked />
            <Label htmlFor="demo-terms">Accept terms</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="demo-notifications" defaultChecked />
            <Label htmlFor="demo-notifications">Notifications</Label>
          </div>
          <div className="flex w-full max-w-56 items-center gap-3">
            <Label htmlFor="demo-volume" className="shrink-0">
              Volume
            </Label>
            <Slider id="demo-volume" defaultValue={[65]} max={100} step={1} />
          </div>
        </div>
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Tabs">
        <Tabs defaultValue="account">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
          <TabsContent value="account" className="pt-3 text-prose">
            Manage your profile, email address, and password from one place.
          </TabsContent>
          <TabsContent value="billing" className="pt-3 text-prose">
            View invoices, update your payment method, and change your plan.
          </TabsContent>
          <TabsContent value="team" className="pt-3 text-prose">
            Invite teammates and manage roles across your workspace.
          </TabsContent>
        </Tabs>
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INVOICES.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-mono text-xs">{invoice.id}</TableCell>
                <TableCell>{invoice.customer}</TableCell>
                <TableCell>
                  <Badge variant={invoice.status === "Overdue" ? "destructive" : "secondary"}>
                    {invoice.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-xs">{invoice.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Overlays">
        <OverlayControls />
      </DemoSection>

      <hr className="border-line" />

      <DemoSection label="Tips">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            Grab the exact element rather than its container; the label shows which component you
            have.
          </li>
          <li>Drag across a cluster of elements to grab all of them at once.</li>
          <li>One grab per change keeps the agent focused on a single edit.</li>
        </ul>
      </DemoSection>

      <SiteFooter />
    </PageShell>
  );
};

DemoPage.displayName = "DemoPage";

export default DemoPage;
