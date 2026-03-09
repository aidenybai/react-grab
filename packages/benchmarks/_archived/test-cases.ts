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
    reactGrabOutput: `<span class="relative flex shrink-0 ove...">(2 elements)</span> in NavUser at components/nav-user.tsx:57:17`,
  },
  {
    name: "Forgot Password Link",
    prompt: "Find the forgot password link in the login form",
    expectedFile: "components/login-form.tsx",
    reactGrabOutput: `<a class="ml-auto inline-block text-..." href="#">Forgot your password?</a> in LoginForm at components/login-form.tsx:46:19`,
  },
  {
    name: "Time Range Toggle",
    prompt:
      "Find the time range toggle group showing Last 3 months, Last 30 days, Last 7 days",
    expectedFile: "components/chart-area-interactive.tsx",
    reactGrabOutput: `<div role="group" dir="ltr" class="flex items-center justify-c..." tabindex="0" style="outline: none;">(3 elements)</div> in ChartAreaInteractive at components/chart-area-interactive.tsx:178:11`,
  },
  {
    name: "Drag Handle",
    prompt: "Find the drag handle with grip vertical icon in the table rows",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<button class="inline-flex items-center ju..." aria-describedby="DndDe..." aria-disabled="false" role="button" tabindex="0">(2 elements)</button> in DragHandle at components/data-table.tsx:126:5`,
  },
  {
    name: "Editable Target Input",
    prompt:
      "Find the inline editable target input field with transparent background in the data table",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<input class="flex rounded-md border border-..." id="1-target" value="2,500" /> in DraggableRow at components/data-table.tsx:221:9`,
  },
  {
    name: "OTP Input",
    prompt:
      "Find the OTP input with separator showing 6-digit verification code split into two groups",
    expectedFile: "components/otp-form.tsx",
    reactGrabOutput: `<div class="flex items-center gap-4 dis..." data-input-otp-co... style="position: relative; cursor: text; user-select: none; pointer-events: none;">(3 elements)</div> in OTPForm at components/otp-form.tsx:42:13`,
  },
  {
    name: "Quick Create Button",
    prompt:
      "Find the Quick Create button with primary background color in the sidebar",
    expectedFile: "components/nav-main.tsx",
    reactGrabOutput: `<button data-sidebar="menu-button" data-size="default" data-active="false" class="peer/menu-button flex w-full ..." data-tooltip="Quick Create">(2 elements)</button> in NavMain at components/nav-main.tsx:27:11`,
  },
  {
    name: "Dropdown Actions",
    prompt:
      "Find the show-on-hover dropdown menu button with three dots in the documents section",
    expectedFile: "components/nav-documents.tsx",
    reactGrabOutput: `<button data-sidebar="menu-action" class="absolute right-1 top-1.5 fl..." id="radix-:R2dcmcq:" aria-haspopup="menu" aria-expanded="false" data-state="closed">(2 elements)</button> in NavDocuments at components/nav-documents.tsx:44:11`,
  },
  {
    name: "Status Badge",
    prompt:
      "Find the status badge with green checkmark icon showing Done status",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<div class="inline-flex items-centers ro...">(1 element)</div> in DraggableRow at components/data-table.tsx:194:7`,
  },
  {
    name: "Tabs with Badges",
    prompt:
      "Find the tab button showing Past Performance with a badge counter showing 3",
    expectedFile: "components/data-table.tsx",
    reactGrabOutput: `<button type="button" role="tab" aria-selected="true" aria-controls="radix-:R1ld9..." data-state="active" id="radix-:R1ld9..." class="inline-flex items-center ju..." tabindex="0" data-orientation="horizontal" data-radix-collectio...>(1 element) Past Performance</button> in DataTable at components/data-table.tsx:430:11`,
  },
  {
    name: "Team Switcher Dropdown",
    prompt:
      "Find the team switcher dropdown button with chevron icon in the sidebar",
    expectedFile: "components/team-switcher.tsx",
    reactGrabOutput: `<button data-sidebar="menu-button" data-size="lg" class="peer/menu-button flex w-full ..." data-state="closed" aria-haspopup="menu" aria-expanded="false">(3 elements)</button> in TeamSwitcher at components/team-switcher.tsx:40:9`,
  },
  {
    name: "Keyboard Shortcut Badge",
    prompt:
      "Find the keyboard shortcut indicator showing ⌘1 in the team dropdown menu",
    expectedFile: "components/team-switcher.tsx",
    reactGrabOutput: `<span class="ml-auto text-xs tracking-w...">⌘1</span> in TeamSwitcher at components/team-switcher.tsx:67:13`,
  },
  {
    name: "GitHub Link Button",
    prompt: "Find the GitHub link button in the header toolbar",
    expectedFile: "components/site-header.tsx",
    reactGrabOutput: `<button class="inline-flex items-centers ju..." asChild size="sm">(1 element) GitHub</button> in SiteHeader at components/site-header.tsx:15:9`,
  },
  {
    name: "Sidebar Trigger Toggle",
    prompt: "Find the sidebar toggle trigger button at the top of the header",
    expectedFile: "components/site-header.tsx",
    reactGrabOutput: `<button data-sidebar="trigger" class="inline-flex items-centers ju..." aria-label="Toggle Sidebar">(1 element)</button> in SiteHeader at components/site-header.tsx:8:7`,
  },
  {
    name: "Full Name Input Field",
    prompt:
      "Find the full name input field with placeholder John Doe in the signup form",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<input id="name" type="text" placeholder="John Doe" required class="flex h-9 w-full rounded-md ..." /> in SignupForm at components/signup-form.tsx:31:15`,
  },
  {
    name: "Field Description Text",
    prompt:
      "Find the helper text saying We'll use this to contact you below the email input",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<p class="text-[0.8rem] text-muted-fo...">We'll use this to contact you. We will not share your email with anyone else.</p> in SignupForm at components/signup-form.tsx:39:17`,
  },
  {
    name: "Sign Up With Google Button",
    prompt:
      "Find the Sign up with Google button with outline variant in the signup form",
    expectedFile: "components/signup-form.tsx",
    reactGrabOutput: `<button class="inline-flex items-centers ju..." variant="outline" type="button">Sign up with Google</button> in SignupForm at components/signup-form.tsx:63:17`,
  },
  {
    name: "Revenue Card Badge",
    prompt:
      "Find the trending up badge showing +12.5% in the Total Revenue card",
    expectedFile: "components/section-cards.tsx",
    reactGrabOutput: `<div class="inline-flex items-centers ro..." variant="outline">(1 element) +12.5%</div> in SectionCards at components/section-cards.tsx:23:13`,
  },
  {
    name: "Calendar Date Cell",
    prompt:
      "Find the selected date cell in the calendar component showing June 12",
    expectedFile: "components/calendar-01.tsx",
    reactGrabOutput: `<button name="day" class="inline-flex items-centers ju..." role="gridcell" tabindex="0" aria-selected="true">12</button> in Calendar01 at components/calendar-01.tsx:7:19`,
  },
  {
    name: "Projects More Button",
    prompt:
      "Find the More button with horizontal dots icon at the bottom of the projects list",
    expectedFile: "components/nav-projects.tsx",
    reactGrabOutput: `<button data-sidebar="menu-button" class="peer/menu-button flex w-full ..." data-size="default" data-active="false">(1 element) More</button> in NavProjects at components/nav-projects.tsx:80:9`,
  },
];
