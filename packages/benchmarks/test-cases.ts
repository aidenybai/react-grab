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

<span class="relative flex shrink-0 ove...">
  (2 elements)
</span>

  at span in components/nav-user.tsx:57:17
  at button in components/ui/sidebar.tsx:515:5
  at SidebarMenuButton in components/ui/sidebar.tsx:498:10
  at NavUser in components/nav-user.tsx:32:10

</selected_element>`,
  },
  {
    name: "Forgot Password Link",
    prompt: "Find the forgot password link in the login form",
    expectedFile: "components/login-form.tsx",
    reactGrabOutput: `<selected_element>

<a class="ml-auto inline-block text-..." href="#">
  Forgot your password?
</a>

  at a in components/login-form.tsx:46:19
  at div in components/login-form.tsx:44:17
  at Field in components/ui/field.tsx:87:5
  at FieldGroup in components/ui/field.tsx:46:5
  at form in components/login-form.tsx:32:11
  at div in components/ui/card.tsx:66:5
  at CardContent in components/ui/card.tsx:64:10
  at LoginForm in components/login-form.tsx:18:10

</selected_element>`,
  },
  {
    name: "Time Range Toggle",
    prompt:
      "Find the time range toggle group showing Last 3 months, Last 30 days, Last 7 days",
    expectedFile: "components/chart-area-interactive.tsx",
    reactGrabOutput: `<selected_element>

<div role="group" dir="ltr" class="flex items-center justify-c..." tabindex="0" style="outline: none;">
  (3 elements)
</div>

  at div in components/chart-area-interactive.tsx:178:11
  at CardAction in components/ui/card.tsx:52:5
  at div in components/ui/card.tsx:20:5
  at CardHeader in components/ui/card.tsx:18:10
  at ChartAreaInteractive in components/chart-area-interactive.tsx:143:10

</selected_element>`,
  },
  {
    name: "Drag Handle",
    prompt: "Find the drag handle with grip vertical icon in the table rows",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>

<button class="inline-flex items-center ju..." aria-describedby="DndDe..." aria-disabled="false" role="button" tabindex="0">
  (2 elements)
</button>

  at button in components/data-table.tsx:126:5
  at DragHandle in components/data-table.tsx:120:10
  at td in components/data-table.tsx:331:9
  at tr in components/data-table.tsx:320:5
  at DraggableRow in components/data-table.tsx:314:10

</selected_element>`,
  },
  {
    name: "Editable Target Input",
    prompt:
      "Find the inline editable target input field with transparent background in the data table",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>

<input class="flex rounded-md border border-..." id="1-target" value="2,500" />

  at input in components/data-table.tsx:221:9
  at form in components/data-table.tsx:208:7
  at td in components/data-table.tsx:331:9
  at tr in components/data-table.tsx:320:5
  at DraggableRow in components/data-table.tsx:314:10

</selected_element>`,
  },
  {
    name: "OTP Input",
    prompt:
      "Find the OTP input with separator showing 6-digit verification code split into two groups",
    expectedFile: "components/otp-form.tsx",
    reactGrabOutput: `<selected_element>

<div class="flex items-center gap-4 dis..." data-input-otp-co... style="position: relative; cursor: text; user-select: none; pointer-events: none;">
  (3 elements)
</div>

  at div in components/otp-form.tsx:42:13
  at Field in components/ui/field.tsx:87:5
  at FieldGroup in components/ui/field.tsx:46:5
  at form in components/otp-form.tsx:21:7
  at OTPForm in components/otp-form.tsx:18:10

</selected_element>`,
  },
  {
    name: "Quick Create Button",
    prompt:
      "Find the Quick Create button with primary background color in the sidebar",
    expectedFile: "components/nav-main.tsx",
    reactGrabOutput: `<selected_element>

<button data-sidebar="menu-button" data-size="default" data-active="false" class="peer/menu-button flex w-full ..." data-tooltip="Quick Create">
  (2 elements)
</button>

  at button in components/ui/sidebar.tsx:515:5
  at SidebarMenuButton in components/ui/sidebar.tsx:498:10
  at li in components/nav-main.tsx:27:11
  at ul in components/nav-main.tsx:26:9
  at SidebarMenu in components/ui/sidebar.tsx:456:5
  at div in components/nav-main.tsx:25:7
  at SidebarGroupContent in components/ui/sidebar.tsx:445:5
  at SidebarGroup in components/ui/sidebar.tsx:387:5
  at NavMain in components/nav-main.tsx:14:10

</selected_element>`,
  },
  {
    name: "Dropdown Actions",
    prompt:
      "Find the show-on-hover dropdown menu button with three dots in the documents section",
    expectedFile: "components/nav-documents.tsx",
    reactGrabOutput: `<selected_element>

<button data-sidebar="menu-action" class="absolute right-1 top-1.5 fl..." id="radix-:R2dcmcq:" aria-haspopup="menu" aria-expanded="false" data-state="closed">
  (2 elements)
</button>

  at button in components/ui/sidebar.tsx:560:5
  at SidebarMenuAction in components/ui/sidebar.tsx:548:10
  at li in components/nav-documents.tsx:44:11
  at ul in components/nav-documents.tsx:42:7
  at SidebarMenu in components/ui/sidebar.tsx:456:5
  at SidebarGroup in components/ui/sidebar.tsx:387:5
  at NavDocuments in components/nav-documents.tsx:28:10

</selected_element>`,
  },
  {
    name: "Status Badge",
    prompt:
      "Find the status badge with green checkmark icon showing Done status",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>

<div class="inline-flex items-centers ro...">
  (1 element)
</div>

  at div in components/data-table.tsx:194:7
  at td in components/data-table.tsx:331:9
  at tr in components/data-table.tsx:320:5
  at DraggableRow in components/data-table.tsx:314:10

</selected_element>`,
  },
  {
    name: "Tabs with Badges",
    prompt:
      "Find the tab button showing Past Performance with a badge counter showing 3",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<selected_element>

<button type="button" role="tab" aria-selected="true" aria-controls="radix-:R1ld9..." data-state="active" id="radix-:R1ld9..." class="inline-flex items-center ju..." tabindex="0" data-orientation="horizontal" data-radix-collectio...>
  (1 element)
  Past Performance
</button>

  at button in components/data-table.tsx:430:11
  at div in components/data-table.tsx:428:9
  at Tabs in components/data-table.tsx:405:5
  at DataTable in components/data-table.tsx:339:10

</selected_element>`,
  },
  {
    name: "Team Switcher Dropdown",
    prompt:
      "Find the team switcher dropdown button with chevron icon in the sidebar",
    expectedFile: "components/team-switcher.tsx",
    reactGrabOutput: `<selected_element>

<button data-sidebar="menu-button" data-size="lg" class="peer/menu-button flex w-full ..." data-state="closed" aria-haspopup="menu" aria-expanded="false">
  (3 elements)
</button>

  at button in components/ui/sidebar.tsx:515:5
  at SidebarMenuButton in components/ui/sidebar.tsx:498:10
  at DropdownMenuTrigger in components/ui/dropdown-menu.tsx:27:5
  at li in components/team-switcher.tsx:40:9
  at SidebarMenuItem in components/ui/sidebar.tsx:467:5
  at SidebarMenu in components/ui/sidebar.tsx:456:5
  at TeamSwitcher in components/team-switcher.tsx:22:10

</selected_element>`,
  },
  {
    name: "Keyboard Shortcut Badge",
    prompt:
      "Find the keyboard shortcut indicator showing ⌘1 in the team dropdown menu",
    expectedFile: "components/team-switcher.tsx",
    reactGrabOutput: `<selected_element>

<span class="ml-auto text-xs tracking-w...">
  ⌘1
</span>

  at span in components/ui/dropdown-menu.tsx:184:7
  at DropdownMenuShortcut in components/ui/dropdown-menu.tsx:179:10
  at div in components/team-switcher.tsx:67:13
  at DropdownMenuItem in components/ui/dropdown-menu.tsx:72:5
  at div in components/ui/dropdown-menu.tsx:41:7
  at DropdownMenuContent in components/ui/dropdown-menu.tsx:34:10

</selected_element>`,
  },
  {
    name: "GitHub Link Button",
    prompt: "Find the GitHub link button in the header toolbar",
    expectedFile: "components/site-header.tsx",
    reactGrabOutput: `<selected_element>

<button class="inline-flex items-centers ju..." asChild size="sm">
  (1 element)
  GitHub
</button>

  at button in components/ui/button.tsx:52:5
  at Button in components/ui/button.tsx:39:10
  at div in components/site-header.tsx:15:9
  at div in components/site-header.tsx:8:7
  at header in components/site-header.tsx:7:5
  at SiteHeader in components/site-header.tsx:5:10

</selected_element>`,
  },
  {
    name: "Sidebar Trigger Toggle",
    prompt: "Find the sidebar toggle trigger button at the top of the header",
    expectedFile: "components/site-header.tsx",
    reactGrabOutput: `<selected_element>

<button data-sidebar="trigger" class="inline-flex items-centers ju..." aria-label="Toggle Sidebar">
  (1 element)
</button>

  at button in components/ui/button.tsx:52:5
  at SidebarTrigger in components/ui/sidebar.tsx:256:10
  at div in components/site-header.tsx:8:7
  at header in components/site-header.tsx:7:5
  at SiteHeader in components/site-header.tsx:5:10

</selected_element>`,
  },
  {
    name: "Full Name Input Field",
    prompt:
      "Find the full name input field with placeholder John Doe in the signup form",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<selected_element>

<input id="name" type="text" placeholder="John Doe" required class="flex h-9 w-full rounded-md ..." />

  at input in components/signup-form.tsx:31:15
  at Field in components/ui/field.tsx:87:5
  at FieldGroup in components/ui/field.tsx:46:5
  at form in components/signup-form.tsx:27:11
  at div in components/ui/card.tsx:66:5
  at CardContent in components/ui/card.tsx:64:10
  at SignupForm in components/signup-form.tsx:17:10

</selected_element>`,
  },
  {
    name: "Field Description Text",
    prompt:
      "Find the helper text saying We'll use this to contact you below the email input",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<selected_element>

<p class="text-[0.8rem] text-muted-fo...">
  We'll use this to contact you. We will not share your email with anyone else.
</p>

  at p in components/ui/field.tsx:143:5
  at FieldDescription in components/ui/field.tsx:141:10
  at Field in components/ui/field.tsx:87:5
  at FieldGroup in components/ui/field.tsx:46:5
  at form in components/signup-form.tsx:27:11
  at div in components/ui/card.tsx:66:5
  at CardContent in components/ui/card.tsx:64:10
  at SignupForm in components/signup-form.tsx:17:10

</selected_element>`,
  },
  {
    name: "Sign Up With Google Button",
    prompt:
      "Find the Sign up with Google button with outline variant in the signup form",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<selected_element>

<button class="inline-flex items-center ju..." variant="outline" type="button">
  Sign up with Google
</button>

  at button in components/signup-form.tsx:63:17
  at Field in components/ui/field.tsx:87:5
  at FieldGroup in components/ui/field.tsx:46:5
  at FieldGroup in components/ui/field.tsx:46:5
  at form in components/signup-form.tsx:27:11
  at div in components/ui/card.tsx:66:5
  at CardContent in components/ui/card.tsx:64:10
  at SignupForm in components/signup-form.tsx:17:10

</selected_element>`,
  },
  {
    name: "Revenue Card Badge",
    prompt:
      "Find the trending up badge showing +12.5% in the Total Revenue card",
    expectedFile: "components/section-cards.tsx",
    reactGrabOutput: `<selected_element>

<div class="inline-flex items-centers ro..." variant="outline">
  (1 element)
  +12.5%
</div>

  at div in components/ui/badge.tsx:38:5
  at Badge in components/ui/badge.tsx:28:10
  at div in components/section-cards.tsx:23:13
  at CardAction in components/ui/card.tsx:52:5
  at div in components/ui/card.tsx:20:5
  at CardHeader in components/ui/card.tsx:18:10
  at div in components/ui/card.tsx:7:5
  at Card in components/ui/card.tsx:5:10
  at div in components/section-cards.tsx:15:7
  at SectionCards in components/section-cards.tsx:13:10

</selected_element>`,
  },
  {
    name: "Calendar Date Cell",
    prompt:
      "Find the selected date cell in the calendar component showing June 12",
    expectedFile: "components/calendar-01.tsx",
    reactGrabOutput: `<selected_element>

<button name="day" class="inline-flex items-centers ju..." role="gridcell" tabindex="0" aria-selected="true">
  12
</button>

  at button in components/ui/calendar.tsx:29:7
  at Calendar in components/ui/calendar.tsx:14:10
  at Calendar01 in components/calendar-01.tsx:7:19

</selected_element>`,
  },
  {
    name: "Projects More Button",
    prompt:
      "Find the More button with horizontal dots icon at the bottom of the projects list",
    expectedFile: "components/nav-projects.tsx",
    reactGrabOutput: `<selected_element>

<button data-sidebar="menu-button" class="peer/menu-button flex w-full ..." data-size="default" data-active="false">
  (1 element)
  More
</button>

  at button in components/ui/sidebar.tsx:515:5
  at SidebarMenuButton in components/ui/sidebar.tsx:498:10
  at li in components/nav-projects.tsx:80:9
  at SidebarMenuItem in components/ui/sidebar.tsx:467:5
  at ul in components/nav-projects.tsx:42:7
  at SidebarMenu in components/ui/sidebar.tsx:456:5
  at SidebarGroup in components/ui/sidebar.tsx:387:5
  at NavProjects in components/nav-projects.tsx:28:10

</selected_element>`,
  },
];
