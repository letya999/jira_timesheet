import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Separator } from "./separator"

describe("Separator", () => {
  it("renders correctly with default orientation and role", () => {
    const { container } = render(<Separator />)
    const separator = container.querySelector('[data-slot="separator"]')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute("data-orientation", "horizontal")
    // default decorative is true, role should be none
    expect(separator).toHaveAttribute("role", "none")
  })

  it("applies vertical orientation", () => {
    const { container } = render(<Separator orientation="vertical" />)
    const separator = container.querySelector('[data-slot="separator"]')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute("data-orientation", "vertical")
  })

  it("applies role='separator' when not decorative", () => {
    const { container } = render(<Separator decorative={false} />)
    const separator = container.querySelector('[data-slot="separator"]')
    expect(separator).toHaveAttribute("role", "separator")
  })

  it("applies custom className", () => {
    const { container } = render(<Separator className="my-custom-class" />)
    const separator = container.querySelector('[data-slot="separator"]')
    expect(separator).toHaveClass("my-custom-class")
  })
})
