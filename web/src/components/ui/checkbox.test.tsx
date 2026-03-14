import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Checkbox } from "./checkbox"

describe("Checkbox", () => {
  it("renders correctly", () => {
    render(<Checkbox aria-label="Check me" />)
    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("handles value changes", () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox aria-label="Check me" onCheckedChange={onCheckedChange} />)
    const checkbox = screen.getByRole("checkbox")
    
    fireEvent.click(checkbox)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(checkbox).toHaveAttribute("data-state", "checked")

    fireEvent.click(checkbox)
    expect(onCheckedChange).toHaveBeenCalledWith(false)
    expect(checkbox).toHaveAttribute("data-state", "unchecked")
  })

  it("is disabled when disabled prop is true", () => {
    render(<Checkbox disabled aria-label="Disabled" />)
    expect(screen.getByRole("checkbox")).toBeDisabled()
  })

  it("works with a label using an id", () => {
    render(
      <div className="flex items-center space-x-2">
        <Checkbox id="terms" />
        <label htmlFor="terms">Accept terms</label>
      </div>
    )
    const label = screen.getByText("Accept terms")
    fireEvent.click(label)
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked")
  })
})
