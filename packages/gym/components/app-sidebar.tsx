import * as React from "react";

import { SearchForm } from "@/components/search-form";
import { VersionSwitcher } from "@/components/version-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const data = {
  versions: ["react-grab", "v0.1.0"],
  navMain: [
    {
      title: "React Grab",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
        },
        {
          title: "Agent Playground",
          url: "/playground",
        },
        {
          title: "Freeze Demo",
          url: "/freeze-demo",
        },
        {
          title: "Login",
          url: "/login",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      items: [
        {
          title: "Getting Started",
          url: "#",
        },
        {
          title: "Installation",
          url: "#",
        },
        {
          title: "Configuration",
          url: "#",
        },
      ],
    },
    {
      title: "Providers",
      url: "#",
      items: [
        {
          title: "Cursor",
          url: "#",
        },
        {
          title: "Claude Code",
          url: "#",
        },
        {
          title: "OpenCode",
          url: "#",
        },
        {
          title: "Codex",
          url: "#",
        },
        {
          title: "Gemini",
          url: "#",
        },
        {
          title: "AMP",
          url: "#",
        },
        {
          title: "AMI",
          url: "#",
        },
        {
          title: "Droid",
          url: "#",
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <VersionSwitcher
          versions={data.versions}
          defaultVersion={data.versions[0]}
        />
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        {/* We create a SidebarGroup for each parent. */}
        {data.navMain.map((item) => (
          <SidebarGroup key={item.title}>
            <SidebarGroupLabel>{item.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {item.items.map((navItem) => {
                  const isDisabled = navItem.url === "#";
                  return (
                    <SidebarMenuItem key={navItem.title}>
                      <SidebarMenuButton
                        asChild
                        className={
                          isDisabled ? "opacity-50 cursor-not-allowed" : ""
                        }
                      >
                        <a href={navItem.url}>{navItem.title}</a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
