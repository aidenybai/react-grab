"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
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
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bell,
  Bold,
  ChevronDown,
  Info,
  Italic,
  Moon,
  Sun,
  Terminal,
  Underline,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-4">
    <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
    <div className="space-y-4">{children}</div>
  </section>
);

const ComponentRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border p-4">
    <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      {label}
    </p>
    <div className="flex flex-wrap items-center gap-3">{children}</div>
  </div>
);

export default function ShadcnPage() {
  const [sliderValue, setSliderValue] = useState([33]);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());
  const [collapsibleOpen, setCollapsibleOpen] = useState(false);
  const { setTheme } = useTheme();

  return (
    <main className="mx-auto max-w-4xl space-y-10 p-8 pb-20">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">shadcn/ui Components</h1>
          <p className="mt-1 text-muted-foreground">
            All installed components laid out for preview.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Separator />

      <Section title="Button">
        <ComponentRow label="Variants">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
        </ComponentRow>
        <ComponentRow label="Sizes">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
          <Button size="icon">
            <Bell />
          </Button>
        </ComponentRow>
        <ComponentRow label="States">
          <Button disabled>Disabled</Button>
          <Button>
            <Spinner /> Loading
          </Button>
        </ComponentRow>
      </Section>

      <Section title="Badge">
        <ComponentRow label="Variants">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </ComponentRow>
      </Section>

      <Section title="Alert">
        <Alert>
          <Terminal className="size-4" />
          <AlertTitle>Default Alert</AlertTitle>
          <AlertDescription>
            This is a default alert with some helpful information.
          </AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <Info className="size-4" />
          <AlertTitle>Destructive Alert</AlertTitle>
          <AlertDescription>Something went wrong. Please try again.</AlertDescription>
        </Alert>
      </Section>

      <Section title="Avatar">
        <ComponentRow label="Sizes">
          <Avatar size="sm">
            <AvatarFallback>SM</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarImage src="https://github.com/shadcn.png" alt="User" />
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </ComponentRow>
        <ComponentRow label="Group">
          <AvatarGroup>
            <Avatar>
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>B</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>C</AvatarFallback>
            </Avatar>
          </AvatarGroup>
        </ComponentRow>
      </Section>

      <Section title="Card">
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card description goes here with supporting text.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card content with any elements inside.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="mr-2">
              Cancel
            </Button>
            <Button>Save</Button>
          </CardFooter>
        </Card>
      </Section>

      <Section title="Input & Textarea">
        <ComponentRow label="Input">
          <Input placeholder="Default input" className="max-w-xs" />
          <Input placeholder="Disabled" disabled className="max-w-xs" />
        </ComponentRow>
        <ComponentRow label="Textarea">
          <Textarea placeholder="Type your message here..." className="max-w-sm" />
        </ComponentRow>
      </Section>

      <Section title="Label & Checkbox & Radio & Switch">
        <ComponentRow label="Checkbox">
          <div className="flex items-center gap-2">
            <Checkbox id="checkbox-1" />
            <Label htmlFor="checkbox-1">Accept terms</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="checkbox-2" defaultChecked />
            <Label htmlFor="checkbox-2">Checked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="checkbox-3" disabled />
            <Label htmlFor="checkbox-3">Disabled</Label>
          </div>
        </ComponentRow>
        <ComponentRow label="Radio Group">
          <RadioGroup defaultValue="option-1" className="flex gap-4">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="option-1" id="radio-1" />
              <Label htmlFor="radio-1">Option 1</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="option-2" id="radio-2" />
              <Label htmlFor="radio-2">Option 2</Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="option-3" id="radio-3" />
              <Label htmlFor="radio-3">Option 3</Label>
            </div>
          </RadioGroup>
        </ComponentRow>
        <ComponentRow label="Switch">
          <div className="flex items-center gap-2">
            <Switch id="switch-sm" size="sm" />
            <Label htmlFor="switch-sm">Small</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="switch-default" defaultChecked />
            <Label htmlFor="switch-default">Default</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="switch-disabled" disabled />
            <Label htmlFor="switch-disabled">Disabled</Label>
          </div>
        </ComponentRow>
      </Section>

      <Section title="Select">
        <ComponentRow label="Default">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
              <SelectItem value="banana">Banana</SelectItem>
              <SelectItem value="cherry">Cherry</SelectItem>
              <SelectItem value="grape">Grape</SelectItem>
            </SelectContent>
          </Select>
        </ComponentRow>
      </Section>

      <Section title="Slider & Progress">
        <ComponentRow label="Slider">
          <Slider
            value={sliderValue}
            onValueChange={setSliderValue}
            max={100}
            step={1}
            className="w-60"
          />
          <span className="text-sm text-muted-foreground">{sliderValue[0]}</span>
        </ComponentRow>
        <ComponentRow label="Progress">
          <Progress value={66} className="w-60" />
        </ComponentRow>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="tab-1">
          <TabsList>
            <TabsTrigger value="tab-1">Account</TabsTrigger>
            <TabsTrigger value="tab-2">Password</TabsTrigger>
            <TabsTrigger value="tab-3">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="tab-1" className="rounded-lg border p-4">
            Make changes to your account here.
          </TabsContent>
          <TabsContent value="tab-2" className="rounded-lg border p-4">
            Change your password here.
          </TabsContent>
          <TabsContent value="tab-3" className="rounded-lg border p-4">
            Manage your settings here.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Accordion">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that match your theme.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>Yes. It uses CSS animations for smooth transitions.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>INV001</TableCell>
              <TableCell>
                <Badge variant="outline">Paid</Badge>
              </TableCell>
              <TableCell>Credit Card</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>INV002</TableCell>
              <TableCell>
                <Badge variant="secondary">Pending</Badge>
              </TableCell>
              <TableCell>PayPal</TableCell>
              <TableCell className="text-right">$150.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>INV003</TableCell>
              <TableCell>
                <Badge variant="destructive">Overdue</Badge>
              </TableCell>
              <TableCell>Bank Transfer</TableCell>
              <TableCell className="text-right">$350.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Section>

      <Section title="Dialog">
        <ComponentRow label="Default">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a dialog description. It provides context.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input placeholder="Enter something..." />
              </div>
              <DialogFooter>
                <Button>Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ComponentRow>
      </Section>

      <Section title="Alert Dialog">
        <ComponentRow label="Destructive confirmation">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete Account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </ComponentRow>
      </Section>

      <Section title="Sheet">
        <ComponentRow label="Slide-out panel">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open Sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Sheet Title</SheetTitle>
                <SheetDescription>This is a sheet that slides in from the side.</SheetDescription>
              </SheetHeader>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">Sheet content goes here.</p>
              </div>
            </SheetContent>
          </Sheet>
        </ComponentRow>
      </Section>

      <Section title="Popover">
        <ComponentRow label="Default">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Open Popover</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none">Dimensions</h4>
                  <p className="text-sm text-muted-foreground">Set the dimensions for the layer.</p>
                </div>
                <div className="grid gap-2">
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Width</Label>
                    <Input defaultValue="100%" className="col-span-2 h-8" />
                  </div>
                  <div className="grid grid-cols-3 items-center gap-4">
                    <Label>Height</Label>
                    <Input defaultValue="25px" className="col-span-2 h-8" />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </ComponentRow>
      </Section>

      <Section title="Hover Card">
        <ComponentRow label="Default">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="link">@shadcn</Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="flex gap-4">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold">@shadcn</h4>
                  <p className="text-sm text-muted-foreground">
                    Creator of shadcn/ui and taxonomy.
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </ComponentRow>
      </Section>

      <Section title="Dropdown Menu">
        <ComponentRow label="Default">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                Options <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ComponentRow>
      </Section>

      <Section title="Menubar">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New Tab</MenubarItem>
              <MenubarItem>New Window</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Print</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarItem>Redo</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Cut</MenubarItem>
              <MenubarItem>Copy</MenubarItem>
              <MenubarItem>Paste</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Zoom In</MenubarItem>
              <MenubarItem>Zoom Out</MenubarItem>
              <MenubarSeparator />
              <MenubarItem>Full Screen</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </Section>

      <Section title="Navigation Menu">
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[400px] gap-3 p-4">
                  <NavigationMenuLink className="block rounded-md p-3 hover:bg-muted">
                    <div className="text-sm font-medium">Introduction</div>
                    <p className="text-sm text-muted-foreground">
                      A quick overview of the project.
                    </p>
                  </NavigationMenuLink>
                  <NavigationMenuLink className="block rounded-md p-3 hover:bg-muted">
                    <div className="text-sm font-medium">Installation</div>
                    <p className="text-sm text-muted-foreground">
                      How to install and set up the project.
                    </p>
                  </NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Components</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[400px] gap-3 p-4">
                  <NavigationMenuLink className="block rounded-md p-3 hover:bg-muted">
                    <div className="text-sm font-medium">Button</div>
                    <p className="text-sm text-muted-foreground">
                      Displays a button or a component that looks like a button.
                    </p>
                  </NavigationMenuLink>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </Section>

      <Section title="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Components</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Section>

      <Section title="Pagination">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">2</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="#">3</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Section>

      <Section title="Toggle & Toggle Group">
        <ComponentRow label="Toggle">
          <Toggle aria-label="Toggle bold">
            <Bold />
          </Toggle>
          <Toggle variant="outline" aria-label="Toggle italic">
            <Italic />
          </Toggle>
        </ComponentRow>
        <ComponentRow label="Toggle Group">
          <ToggleGroup type="multiple" variant="outline">
            <ToggleGroupItem value="bold" aria-label="Toggle bold">
              <Bold />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Toggle italic">
              <Italic />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Toggle underline">
              <Underline />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" variant="outline">
            <ToggleGroupItem value="left" aria-label="Align left">
              <AlignLeft />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <AlignCenter />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <AlignRight />
            </ToggleGroupItem>
          </ToggleGroup>
        </ComponentRow>
      </Section>

      <Section title="Tooltip">
        <ComponentRow label="Default">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>This is a tooltip</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon">
                <Info />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>More info</p>
            </TooltipContent>
          </Tooltip>
        </ComponentRow>
      </Section>

      <Section title="Collapsible">
        <Collapsible
          open={collapsibleOpen}
          onOpenChange={setCollapsibleOpen}
          className="w-full space-y-2"
        >
          <div className="flex items-center justify-between rounded-lg border px-4 py-2">
            <h4 className="text-sm font-semibold">3 items starred</h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                <ChevronDown
                  className={`size-4 transition-transform ${collapsibleOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="space-y-2">
            <div className="rounded-md border px-4 py-2 text-sm">Item 1</div>
            <div className="rounded-md border px-4 py-2 text-sm">Item 2</div>
            <div className="rounded-md border px-4 py-2 text-sm">Item 3</div>
          </CollapsibleContent>
        </Collapsible>
      </Section>

      <Section title="Calendar">
        <div className="flex justify-center">
          <Calendar
            mode="single"
            selected={calendarDate}
            onSelect={setCalendarDate}
            className="rounded-md border"
          />
        </div>
      </Section>

      <Section title="Scroll Area">
        <ScrollArea className="h-48 w-full rounded-md border p-4">
          <div className="space-y-4">
            {Array.from({ length: 20 }, (_, index) => (
              <div key={index} className="text-sm">
                Item {index + 1} — Scroll to see more content below.
              </div>
            ))}
          </div>
        </ScrollArea>
      </Section>

      <Section title="Resizable">
        <ResizablePanelGroup orientation="horizontal" className="min-h-[120px] rounded-lg border">
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4">
              <span className="text-sm font-semibold">Panel A</span>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <div className="flex h-full items-center justify-center p-4">
              <span className="text-sm font-semibold">Panel B</span>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Section>

      <Section title="Aspect Ratio">
        <ComponentRow label="16:9">
          <div className="w-60">
            <AspectRatio ratio={16 / 9} className="rounded-md bg-muted">
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                16:9
              </div>
            </AspectRatio>
          </div>
        </ComponentRow>
      </Section>

      <Section title="Skeleton">
        <ComponentRow label="Loading states">
          <div className="flex items-center gap-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </ComponentRow>
      </Section>

      <Section title="Spinner">
        <ComponentRow label="Sizes">
          <Spinner className="size-4" />
          <Spinner className="size-6" />
          <Spinner className="size-8" />
        </ComponentRow>
      </Section>

      <Section title="Separator">
        <div className="space-y-4 rounded-lg border p-4">
          <div>
            <h4 className="text-sm font-medium">Title</h4>
            <p className="text-sm text-muted-foreground">Description text</p>
          </div>
          <Separator />
          <div className="flex h-5 items-center gap-4 text-sm">
            <span>Blog</span>
            <Separator orientation="vertical" />
            <span>Docs</span>
            <Separator orientation="vertical" />
            <span>Source</span>
          </div>
        </div>
      </Section>

      <Section title="Kbd">
        <ComponentRow label="Keyboard shortcuts">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <span className="text-sm text-muted-foreground">or</span>
          <Kbd>Ctrl</Kbd>
          <span className="text-sm text-muted-foreground">+</span>
          <Kbd>Shift</Kbd>
          <span className="text-sm text-muted-foreground">+</span>
          <Kbd>P</Kbd>
        </ComponentRow>
      </Section>
    </main>
  );
}
