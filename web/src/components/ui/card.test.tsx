import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./card"

describe("Card", () => {
  it("renders correctly with all sub-components", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    )

    expect(screen.getByText("Test Title")).toBeDefined()
    expect(screen.getByText("Test Description")).toBeDefined()
    expect(screen.getByText("Test Content")).toBeDefined()
    expect(screen.getByText("Test Footer")).toBeDefined()
  })

  it("applies correct size variant", () => {
    const { container } = render(<Card size="sm">Small Card</Card>)
    expect(container.firstChild).toHaveAttribute("data-size", "sm")
  })

  it("renders custom classes", () => {
    const { container } = render(<Card className="custom-class">Content</Card>)
    expect(container.firstChild).toHaveClass("custom-class")
  })
})
