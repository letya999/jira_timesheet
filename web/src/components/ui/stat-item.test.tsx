import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { StatItem } from "./stat-item"

describe("StatItem", () => {
  it("renders correctly with basic props", () => {
    render(<StatItem label="Active Users" value="1200" description="More info" />)

    expect(screen.getByText("Active Users")).toBeDefined()
    expect(screen.getByText("1200")).toBeDefined()
    expect(screen.getByText("More info")).toBeDefined()
  })

  it("renders trend when provided", () => {
    render(
      <StatItem
        label="Growth"
        value="50%"
        trend={{ value: "+5%", label: "vs last week", variant: "positive" }}
      />
    )

    expect(screen.getByText("+5%")).toBeDefined()
    expect(screen.getByText("vs last week")).toBeDefined()
  })

  it("renders custom icon", () => {
    render(
      <StatItem
        label="Icon Test"
        value="Value"
        icon={<span data-testid="test-icon">Icon</span>}
      />
    )

    expect(screen.getByTestId("test-icon")).toBeDefined()
  })
})
