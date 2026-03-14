import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Spinner } from "./spinner"

describe("Spinner", () => {
  it("renders correctly", () => {
    render(<Spinner />)
    const spinner = screen.getByRole("status")
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass("animate-spin")
  })

  it("applies custom classes", () => {
    render(<Spinner className="size-10 text-red-500" />)
    const spinner = screen.getByRole("status")
    expect(spinner).toHaveClass("size-10")
    expect(spinner).toHaveClass("text-red-500")
  })
})
