import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

describe("Tabs", () => {
  it("renders correctly", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>
    )

    expect(screen.getByText("Tab 1")).toBeDefined()
    expect(screen.getByText("Tab 2")).toBeDefined()
    expect(screen.getByText("Content 1")).toBeDefined()
  })
})
