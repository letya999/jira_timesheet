import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Separator } from "./separator"

describe("Separator", () => {
  it("renders correctly with default orientation", () => {
    const { container } = render(<Separator />)
    const separator = container.querySelector('[data-slot="separator"]')
    expect(separator).toBeInTheDocument()
    // By default it is horizontal
  })

  it("applies custom orientation", () => {
    const { container } = render(<Separator orientation="vertical" />)
    const separator = container.querySelector('[data-slot="separator"]')
    expect(separator).toBeInTheDocument()
    // Radix applies specific data attributes
  })
})
