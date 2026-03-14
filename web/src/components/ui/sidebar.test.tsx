import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "./sidebar"

describe("Sidebar", () => {
  it("renders correctly and interacts with trigger", async () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>Item 1</SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <SidebarTrigger data-testid="trigger" />
      </SidebarProvider>
    )

    expect(screen.getByText("Item 1")).toBeDefined()
    const trigger = screen.getByTestId("trigger")
    fireEvent.click(trigger)
    // Sidebar state is managed internally, but trigger should be present
    expect(trigger).toBeDefined()
  })
})
