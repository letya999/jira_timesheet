import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Switch } from "./switch"

describe("Switch", () => {
  it("renders correctly", () => {
    render(<Switch aria-label="Toggle me" />)
    expect(screen.getByRole("switch")).toBeInTheDocument()
  })

  it("handles value changes", () => {
    const onCheckedChange = vi.fn()
    render(<Switch aria-label="Toggle me" onCheckedChange={onCheckedChange} />)
    const switchElement = screen.getByRole("switch")
    
    fireEvent.click(switchElement)
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(switchElement).toHaveAttribute("data-state", "checked")

    fireEvent.click(switchElement)
    expect(onCheckedChange).toHaveBeenCalledWith(false)
    expect(switchElement).toHaveAttribute("data-state", "unchecked")
  })

  it("is disabled when disabled prop is true", () => {
    render(<Switch disabled aria-label="Disabled" />)
    expect(screen.getByRole("switch")).toBeDisabled()
  })

  it("works with a label using an id", () => {
    render(
      <div className="flex items-center space-x-2">
        <Switch id="airplane-mode" />
        <label htmlFor="airplane-mode">Airplane Mode</label>
      </div>
    )
    const label = screen.getByText("Airplane Mode")
    fireEvent.click(label)
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked")
  })

  it("applies size attribute", () => {
    const { rerender } = render(<Switch size="sm" aria-label="Small" />)
    expect(screen.getByRole("switch")).toHaveAttribute("data-size", "sm")

    rerender(<Switch size="default" aria-label="Default" />)
    expect(screen.getByRole("switch")).toHaveAttribute("data-size", "default")
  })
})
