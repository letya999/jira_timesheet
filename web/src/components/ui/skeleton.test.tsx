import { render } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Skeleton } from "./skeleton"

describe("Skeleton", () => {
  it("renders correctly", () => {
    const { container } = render(<Skeleton className="h-4 w-[100px]" />)
    const skeleton = container.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toBeInTheDocument()
    expect(skeleton).toHaveClass("animate-pulse")
  })

  it("applies custom classes", () => {
    const { container } = render(<Skeleton className="rounded-full size-10" />)
    const skeleton = container.querySelector('[data-slot="skeleton"]')
    expect(skeleton).toHaveClass("rounded-full")
    expect(skeleton).toHaveClass("size-10")
  })
})
