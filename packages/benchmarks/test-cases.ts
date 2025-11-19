interface TestCase {
  name: string;
  prompt: string;
  expectedFile: string;
  reactGrabOutput: string;
}

export const TEST_CASES: TestCase[] = [
  {
    name: "Grayscale Avatar",
    prompt: "Find the grayscale avatar in the user menu",
    expectedFile: "components/nav-user.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > ul:nth-of-type(1) > li:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1) > span:nth-of-type(1)
- width: 32
- height: 32

HTML snippet:
\`\`\`html
<NavUser source="components/nav-user.tsx:32:16">
  <SidebarMenuButton source="components/ui/sidebar.tsx:640:25">
    <button
      data-sidebar="menu-button"
      data-size="lg"
      data-active="false"
      class="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      data-state="closed"
      id="radix-:R1mcqcq:"
      aria-haspopup="menu"
      aria-expanded="false"
      data-id="7">
        <!-- IMPORTANT: selected element -->
        <span class="relative flex shrink-0 ove...">
          ... (2 elements)
        </span>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate font-medium">shadcn</span>
          <span class="truncate text-xs">m@example.com</span>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-dots-vertical ml-auto size-4">
          <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
          <path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
          <path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"></path>
        </svg>
    </button>
  </SidebarMenuButton>
</NavUser>
\`\`\`
</selected_element>`,
  },
  {
    name: "Forgot Password Link",
    prompt: "Find the forgot password link in the login form",
    expectedFile: "components/login-form.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > form:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > a:nth-of-type(1)
- width: 138
- height: 20

HTML snippet:
\`\`\`html
<LoginForm source="components/login-form.tsx:18:16">
  <CardContent source="components/ui/card.tsx:63:20">
    <div class="p-6 pt-0">
      <form>
        <div class="space-y-4">
          <div class="space-y-2">
            <div class="flex items-center">
              <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" for="password">Password</label>
              <!-- IMPORTANT: selected element -->
              <a class="ml-auto inline-block text-..." href="#">
                Forgot your password?
              </a>
            </div>
            <input type="password" class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm" id="password" required="">
          </div>
        </div>
      </form>
    </div>
  </CardContent>
</LoginForm>
\`\`\`
</selected_element>`,
  },
  {
    name: "Time Range Toggle",
    prompt:
      "Find the time range toggle group showing Last 3 months, Last 30 days, Last 7 days",
    expectedFile: "components/chart-area-interactive.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1)
- width: 342
- height: 32

HTML snippet:
\`\`\`html
<ChartAreaInteractive source="components/chart-area-interactive.tsx:143:16">
  <CardHeader source="components/ui/card.tsx:40:19">
    <div class="flex flex-col space-y-1.5 p-6 pb-0">
      <div class="mb-2 flex items-center gap-2 space-y-0 border-b pb-2 sm:mb-0 sm:border-0 sm:pb-0">
        <h3 class="font-semibold leading-none tracking-tight">Total Visitors</h3>
        <p class="text-sm text-muted-foreground">
          <span class="hidden @[540px]/card:block">Total for the last 3 months</span>
          <span class="@[540px]/card:hidden">Last 3 months</span>
        </p>
      </div>
      <div class="flex-1"></div>
      <div class="flex items-center gap-2">
        <!-- IMPORTANT: selected element -->
        <div role="group" dir="ltr" class="flex items-center justify-c..." tabindex="0" style="outline: none;">
          ... (3 elements)
        </div>
      </div>
    </div>
  </CardHeader>
</ChartAreaInteractive>
\`\`\`
</selected_element>`,
  },
  {
    name: "Drag Handle",
    prompt: "Find the drag handle with grip vertical icon in the table rows",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(2) > tr:nth-of-type(1) > td:nth-of-type(1) > button:nth-of-type(1)
- width: 28
- height: 28

HTML snippet:
\`\`\`html
<DraggableRow source="components/data-table.tsx:314:16">
  <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80" data-state="false" data-dragging="false" style="transform: none; transition: undefined;">
    <td class="p-2 align-middle [&amp;:has([role=checkbox])]:pr-0 [&amp;>[role=checkbox]]:translate-y-[2px] w-8">
      <DragHandle source="components/data-table.tsx:120:16">
        <!-- IMPORTANT: selected element -->
        <button class="inline-flex items-center ju..." aria-describedby="DndDe..." aria-disabled="false" role="button" tabindex="0">
          ... (2 elements)
        </button>
      </DragHandle>
    </td>
  </tr>
</DraggableRow>
\`\`\`
</selected_element>`,
  },
  {
    name: "Editable Target Input",
    prompt:
      "Find the inline editable target input field with transparent background in the data table",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(2) > tr:nth-of-type(1) > td:nth-of-type(6) > form:nth-of-type(1) > input:nth-of-type(1)
- width: 64
- height: 32

HTML snippet:
\`\`\`html
<DraggableRow source="components/data-table.tsx:314:16">
  <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80" data-state="false" data-dragging="false" style="transform: none; transition: undefined;">
    <td class="p-2 align-middle [&amp;:has([role=checkbox])]:pr-0 [&amp;>[role=checkbox]]:translate-y-[2px]">
      <form>
        <label class="sr-only" for="1-target">Target</label>
        <!-- IMPORTANT: selected element -->
        <input class="flex rounded-md border border-..." id="1-target" value="2,500">
      </form>
    </td>
  </tr>
</DraggableRow>
\`\`\`
</selected_element>`,
  },
  {
    name: "OTP Input",
    prompt:
      "Find the OTP input with separator showing 6-digit verification code split into two groups",
    expectedFile: "components/otp-form.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > form:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2)
- width: 334
- height: 64

HTML snippet:
\`\`\`html
<OTPForm source="components/otp-form.tsx:18:16">
  <form>
    <div class="space-y-2">
      <div class="space-y-2">
        <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sr-only" for="otp">Verification code</label>
        <!-- IMPORTANT: selected element -->
        <div class="flex items-center gap-4 dis..." data-input-otp-co... style="position: relative; cursor: text; user-select: none; pointer-events: none;">
          ... (3 elements)
        </div>
      </div>
    </div>
  </form>
</OTPForm>
\`\`\`
</selected_element>`,
  },
  {
    name: "Quick Create Button",
    prompt:
      "Find the Quick Create button with primary background color in the sidebar",
    expectedFile: "components/nav-main.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > button:nth-of-type(1)
- width: 190
- height: 32

HTML snippet:
\`\`\`html
<NavMain source="components/nav-main.tsx:14:16">
  <div data-sidebar="group" class="relative flex w-full min-w-0 flex-col p-2">
    <div data-sidebar="group-content" class="w-full text-sm">
      <div class="flex flex-col gap-2">
        <ul data-sidebar="menu" class="flex w-full min-w-0 flex-col gap-1">
          <li data-sidebar="menu-item" class="group/menu-item relative flex items-center gap-2">
            <!-- IMPORTANT: selected element -->
            <button
              data-sidebar="menu-button"
              data-size="default"
              data-active="false"
              class="peer/menu-button flex w-full ..."
              data-tooltip="Quick Create">
              ... (2 elements)
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</NavMain>
\`\`\`
</selected_element>`,
  },
  {
    name: "Dropdown Actions",
    prompt:
      "Find the show-on-hover dropdown menu button with three dots in the documents section",
    expectedFile: "components/nav-documents.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > ul:nth-of-type(1) > li:nth-of-type(1) > button:nth-of-type(1)
- width: 20
- height: 20

HTML snippet:
\`\`\`html
<NavDocuments source="components/nav-documents.tsx:28:16">
  <div data-sidebar="group" class="relative flex w-full min-w-0 flex-col p-2 group-data-[collapsible=icon]:hidden">
    <div data-sidebar="group-label" class="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0">Documents</div>
    <div data-sidebar="group-content" class="w-full text-sm">
      <ul data-sidebar="menu" class="flex w-full min-w-0 flex-col gap-1">
        <li data-sidebar="menu-item" class="group/menu-item relative">
          <button data-sidebar="menu-button" data-size="default" data-active="false" class="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-database ">
              <path d="M12 6m-8 0a8 3 0 1 0 16 0a8 3 0 1 0 -16 0"></path>
              <path d="M4 6v6a8 3 0 0 0 16 0v-6"></path>
              <path d="M4 12v6a8 3 0 0 0 16 0v-6"></path>
            </svg>
            <span>Data Library</span>
          </button>
          <!-- IMPORTANT: selected element -->
          <button
            data-sidebar="menu-action"
            class="absolute right-1 top-1.5 fl..."
            id="radix-:R2dcmcq:"
            aria-haspopup="menu"
            aria-expanded="false"
            data-state="closed">
            ... (2 elements)
          </button>
        </li>
      </ul>
    </div>
  </div>
</NavDocuments>
\`\`\`
</selected_element>`,
  },
  {
    name: "Status Badge",
    prompt:
      "Find the status badge with green checkmark icon showing Done status",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(2) > tr:nth-of-type(1) > td:nth-of-type(5) > div:nth-of-type(1)
- width: 82
- height: 22

HTML snippet:
\`\`\`html
<DraggableRow source="components/data-table.tsx:314:16">
  <tr class="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80" data-state="false" data-dragging="false">
    <td class="p-2 align-middle [&amp;:has([role=checkbox])]:pr-0 [&amp;>[role=checkbox]]:translate-y-[2px]">
      <!-- IMPORTANT: selected element -->
      <div class="inline-flex items-center ro...">
        ... (1 element)
      </div>
    </td>
  </tr>
</DraggableRow>
\`\`\`
</selected_element>`,
  },
  {
    name: "Tabs with Badges",
    prompt:
      "Find the tab button showing Past Performance with a badge counter showing 3",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > button:nth-of-type(2)
- width: 156
- height: 32

HTML snippet:
\`\`\`html
<DataTable source="components/data-table.tsx:339:16">
  <div dir="ltr" data-orientation="horizontal" class="w-full flex-col justify-start gap-6">
    <div class="flex items-center justify-between px-4 lg:px-6">
      <div role="tablist" aria-orientation="horizontal" class="inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground **:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 @4xl/main:flex" tabindex="0" style="outline: none;">
        <button type="button" role="tab" aria-selected="false" aria-controls="radix-:R1ld9cq:-content-outline" data-state="inactive" id="radix-:R1ld9cq:-trigger-outline" class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item="">Outline</button>
        <!-- IMPORTANT: selected element -->
        <button type="button" role="tab" aria-selected="true" aria-controls="radix-:R1ld9..." data-state="active" id="radix-:R1ld9..." class="inline-flex items-center ju..." tabindex="0" data-orientation="horizontal" data-radix-collectio...>
          Past Performance ... (1 element)
        </button>
        <button type="button" role="tab" aria-selected="false" aria-controls="radix-:R1ld9cq:-content-key-personnel" data-state="inactive" id="radix-:R1ld9cq:-trigger-key-personnel" class="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow" tabindex="-1" data-orientation="horizontal" data-radix-collection-item="">
          Key Personnel
          <div class="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80" data-slot="badge">2</div>
        </button>
      </div>
    </div>
  </div>
</DataTable>
\`\`\`
</selected_element>`,
  },
  {
    name: "Team Switcher Dropdown",
    prompt: "Find the team switcher dropdown button with chevron icon in the sidebar",
    expectedFile: "components/team-switcher.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > button:nth-of-type(1)
- width: 206
- height: 48

HTML snippet:
\`\`\`html
<TeamSwitcher source="components/team-switcher.tsx:22:16">
  <SidebarMenu source="components/ui/sidebar.tsx:358:19">
    <SidebarMenuItem source="components/ui/sidebar.tsx:384:22">
      <li data-sidebar="menu-item" class="relative list-none">
        <DropdownMenuTrigger source="components/ui/dropdown-menu.tsx:50:26">
          <SidebarMenuButton source="components/ui/sidebar.tsx:640:25">
            <!-- IMPORTANT: selected element -->
            <button
              data-sidebar="menu-button"
              data-size="lg"
              class="peer/menu-button flex w-full ..."
              data-state="closed"
              aria-haspopup="menu"
              aria-expanded="false">
              ... (3 elements)
            </button>
          </SidebarMenuButton>
        </DropdownMenuTrigger>
      </li>
    </SidebarMenuItem>
  </SidebarMenu>
</TeamSwitcher>
\`\`\`
</selected_element>`,
  },
  {
    name: "Keyboard Shortcut Badge",
    prompt: "Find the keyboard shortcut indicator showing ⌘1 in the team dropdown menu",
    expectedFile: "components/team-switcher.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > span:nth-of-type(1)
- width: 18
- height: 14

HTML snippet:
\`\`\`html
<DropdownMenuContent source="components/ui/dropdown-menu.tsx:73:14">
  <div role="menu" class="z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" data-state="open" data-side="right">
    <DropdownMenuItem source="components/ui/dropdown-menu.tsx:89:14">
      <div role="menuitem" class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 gap-2 p-2" tabindex="-1">
        <div class="flex size-6 items-center justify-center rounded-md border">
          <svg class="size-3.5 shrink-0"></svg>
        </div>
        Acme Inc
        <DropdownMenuShortcut source="components/ui/dropdown-menu.tsx:155:16">
          <!-- IMPORTANT: selected element -->
          <span class="ml-auto text-xs tracking-w...">
            ⌘1
          </span>
        </DropdownMenuShortcut>
      </div>
    </DropdownMenuItem>
  </div>
</DropdownMenuContent>
\`\`\`
</selected_element>`,
  },
  {
    name: "GitHub Link Button",
    prompt: "Find the GitHub link button in the header toolbar",
    expectedFile: "components/site-header.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > header:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)
- width: 59
- height: 32

HTML snippet:
\`\`\`html
<SiteHeader source="components/site-header.tsx:5:16">
  <header class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
    <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
      <h1 class="text-base font-medium">Documents</h1>
      <div class="ml-auto flex items-center gap-2">
        <Button source="components/ui/button.tsx:65:7">
          <!-- IMPORTANT: selected element -->
          <button class="inline-flex items-center ju..." asChild size="sm">
            <a href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard" rel="noopener noreferrer" target="_blank" class="dark:text-foreground">
              GitHub
            </a>
          </button>
        </Button>
      </div>
    </div>
  </header>
</SiteHeader>
\`\`\`
</selected_element>`,
  },
  {
    name: "Sidebar Trigger Toggle",
    prompt: "Find the sidebar toggle trigger button at the top of the header",
    expectedFile: "components/site-header.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > header:nth-of-type(1) > div:nth-of-type(1) > button:nth-of-type(1)
- width: 32
- height: 32

HTML snippet:
\`\`\`html
<SiteHeader source="components/site-header.tsx:5:16">
  <header class="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
    <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
      <SidebarTrigger source="components/ui/sidebar.tsx:280:16">
        <!-- IMPORTANT: selected element -->
        <button data-sidebar="trigger" class="inline-flex items-center ju..." aria-label="Toggle Sidebar">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-panel-left">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M9 3v18"></path>
          </svg>
        </button>
      </SidebarTrigger>
    </div>
  </header>
</SiteHeader>
\`\`\`
</selected_element>`,
  },
  {
    name: "Full Name Input Field",
    prompt: "Find the full name input field with placeholder John Doe in the signup form",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > form:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > input:nth-of-type(1)
- width: 318
- height: 36

HTML snippet:
\`\`\`html
<SignupForm source="components/signup-form.tsx:17:16">
  <CardContent source="components/ui/card.tsx:63:20">
    <div class="p-6 pt-0">
      <form>
        <FieldGroup source="components/ui/field.tsx:23:17">
          <div class="space-y-4">
            <Field source="components/ui/field.tsx:7:14">
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" for="name">Full Name</label>
                <!-- IMPORTANT: selected element -->
                <input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  required
                  class="flex h-9 w-full rounded-md ...">
              </div>
            </Field>
          </div>
        </FieldGroup>
      </form>
    </div>
  </CardContent>
</SignupForm>
\`\`\`
</selected_element>`,
  },
  {
    name: "Field Description Text",
    prompt: "Find the helper text saying We'll use this to contact you below the email input",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > form:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > p:nth-of-type(1)
- width: 318
- height: 32

HTML snippet:
\`\`\`html
<SignupForm source="components/signup-form.tsx:17:16">
  <CardContent source="components/ui/card.tsx:63:20">
    <div class="p-6 pt-0">
      <form>
        <FieldGroup source="components/ui/field.tsx:23:17">
          <div class="space-y-4">
            <Field source="components/ui/field.tsx:7:14">
              <div class="space-y-2">
                <label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" for="email">Email</label>
                <input id="email" type="email" placeholder="m@example.com" required class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                <FieldDescription source="components/ui/field.tsx:17:14">
                  <!-- IMPORTANT: selected element -->
                  <p class="text-[0.8rem] text-muted-fo...">
                    We'll use this to contact you. We will not share your email with anyone else.
                  </p>
                </FieldDescription>
              </div>
            </Field>
          </div>
        </FieldGroup>
      </form>
    </div>
  </CardContent>
</SignupForm>
\`\`\`
</selected_element>`,
  },
  {
    name: "Sign Up With Google Button",
    prompt: "Find the Sign up with Google button with outline variant in the signup form",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > form:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > button:nth-of-type(2)
- width: 318
- height: 36

HTML snippet:
\`\`\`html
<SignupForm source="components/signup-form.tsx:17:16">
  <CardContent source="components/ui/card.tsx:63:20">
    <div class="p-6 pt-0">
      <form>
        <FieldGroup source="components/ui/field.tsx:23:17">
          <div class="space-y-4">
            <FieldGroup source="components/ui/field.tsx:23:17">
              <div class="space-y-4">
                <Field source="components/ui/field.tsx:7:14">
                  <div class="space-y-2">
                    <button class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2" type="submit">Create Account</button>
                    <!-- IMPORTANT: selected element -->
                    <button
                      class="inline-flex items-center ju..."
                      variant="outline"
                      type="button">
                      Sign up with Google
                    </button>
                    <FieldDescription source="components/ui/field.tsx:17:14">
                      <p class="text-[0.8rem] text-muted-foreground px-6 text-center">
                        Already have an account? <a href="#">Sign in</a>
                      </p>
                    </FieldDescription>
                  </div>
                </Field>
              </div>
            </FieldGroup>
          </div>
        </FieldGroup>
      </form>
    </div>
  </CardContent>
</SignupForm>
\`\`\`
</selected_element>`,
  },
  {
    name: "Revenue Card Badge",
    prompt: "Find the trending up badge showing +12.5% in the Total Revenue card",
    expectedFile: "components/section-cards.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1)
- width: 73
- height: 22

HTML snippet:
\`\`\`html
<SectionCards source="components/section-cards.tsx:13:16">
  <div class="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
    <Card source="components/ui/card.tsx:10:13">
      <div class="rounded-xl border bg-card text-card-foreground shadow @container/card" data-slot="card">
        <CardHeader source="components/ui/card.tsx:40:19">
          <div class="flex flex-col space-y-1.5 p-6 pb-0">
            <p class="text-sm text-muted-foreground">Total Revenue</p>
            <h3 class="font-semibold leading-none tracking-tight text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">$1,250.00</h3>
            <CardAction source="components/ui/card.tsx:50:19">
              <div class="ml-auto">
                <Badge source="components/ui/badge.tsx:35:14">
                  <!-- IMPORTANT: selected element -->
                  <div class="inline-flex items-center ro..." variant="outline">
                    <svg class="tabler-icon tabler-icon-trending-up"></svg>
                    +12.5%
                  </div>
                </Badge>
              </div>
            </CardAction>
          </div>
        </CardHeader>
      </div>
    </Card>
  </div>
</SectionCards>
\`\`\`
</selected_element>`,
  },
  {
    name: "Calendar Date Cell",
    prompt: "Find the selected date cell in the calendar component showing June 12",
    expectedFile: "components/calendar-01.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(1) > div:nth-of-type(1) > table:nth-of-type(1) > tbody:nth-of-type(1) > tr:nth-of-type(3) > td:nth-of-type(5) > button:nth-of-type(1)
- width: 36
- height: 36

HTML snippet:
\`\`\`html
<Calendar01 source="components/calendar-01.tsx:7:16">
  <Calendar source="components/ui/calendar.tsx:38:16">
    <div class="p-3 rounded-lg border shadow-sm">
      <div class="flex flex-col gap-1 sm:flex-row sm:gap-2">
        <table class="w-full border-collapse space-y-1">
          <tbody>
            <tr class="flex w-full mt-2">
              <td class="text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20">
                <!-- IMPORTANT: selected element -->
                <button
                  name="day"
                  class="inline-flex items-center ju..."
                  role="gridcell"
                  tabindex="0"
                  aria-selected="true">
                  12
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Calendar>
</Calendar01>
\`\`\`
</selected_element>`,
  },
  {
    name: "Projects More Button",
    prompt: "Find the More button with horizontal dots icon at the bottom of the projects list",
    expectedFile: "components/nav-projects.tsx",
    reactGrabOutput: `<selected_element>
- selector: html > body:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(3) > ul:nth-of-type(1) > li:nth-of-type(4) > button:nth-of-type(1)
- width: 190
- height: 32

HTML snippet:
\`\`\`html
<NavProjects source="components/nav-projects.tsx:28:16">
  <SidebarGroup source="components/ui/sidebar.tsx:314:13">
    <div data-sidebar="group" class="relative flex w-full min-w-0 flex-col p-2 group-data-[collapsible=icon]:hidden">
      <div data-sidebar="group-label" class="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0">Projects</div>
      <SidebarMenu source="components/ui/sidebar.tsx:358:19">
        <ul data-sidebar="menu" class="flex w-full min-w-0 flex-col gap-1">
          <SidebarMenuItem source="components/ui/sidebar.tsx:384:22">
            <li data-sidebar="menu-item" class="relative list-none">
              <SidebarMenuButton source="components/ui/sidebar.tsx:640:25">
                <!-- IMPORTANT: selected element -->
                <button
                  data-sidebar="menu-button"
                  class="peer/menu-button flex w-full ..."
                  data-size="default"
                  data-active="false">
                  <svg class="tabler-icon tabler-icon-dots text-sidebar-foreground/70"></svg>
                  <span>More</span>
                </button>
              </SidebarMenuButton>
            </li>
          </SidebarMenuItem>
        </ul>
      </SidebarMenu>
    </div>
  </SidebarGroup>
</NavProjects>
\`\`\`
</selected_element>`,
  },
];
