import type { Meta, StoryObj } from "@storybook/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from "./sidebar"
import { Home, Settings, Users, Calendar, Clock, BarChart } from "lucide-react"

import { TooltipProvider } from "./tooltip"

const meta: Meta<typeof Sidebar> = {
  title: "UI/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof Sidebar>

const items = [
  { title: "Dashboard", icon: Home, url: "#" },
  { title: "Timesheet", icon: Clock, url: "#" },
  { title: "Calendar", icon: Calendar, url: "#" },
  { title: "Analytics", icon: BarChart, url: "#" },
  { title: "Employees", icon: Users, url: "#" },
  { title: "Settings", icon: Settings, url: "#" },
]

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2 px-4 py-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  JT
                </div>
                <span className="font-semibold">Jira Timesheet</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Application</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <a href={item.url}>
                            <item.icon />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="px-4 py-2 text-xs text-muted-foreground">
                v1.0.0
              </div>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          <main className="flex-1 p-4">
            <SidebarTrigger />
            <div className="mt-4">
              <h1 className="text-2xl font-bold">Main Content Area</h1>
              <p className="text-muted-foreground">The sidebar is now interactive.</p>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  ),
}
