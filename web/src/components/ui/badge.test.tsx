import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Badge } from "./badge"

describe("Badge", () => {
  it("renders correctly", () => {
    render(<Badge>Badge text</Badge>)
    expect(screen.getByText("Badge text")).toBeInTheDocument()
  })

  it("applies variant classes", () => {
    const { rerender } = render(<Badge variant="destructive">Destructive</Badge>)
    expect(screen.getByText("Destructive")).toHaveAttribute("data-variant", "destructive")

    rerender(<Badge variant="outline">Outline</Badge>)
    expect(screen.getByText("Outline")).toHaveAttribute("data-variant", "outline")
  })
})
