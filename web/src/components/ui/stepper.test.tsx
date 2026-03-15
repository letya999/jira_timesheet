import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Stepper } from "./stepper"

describe("Stepper", () => {
  it("renders with initial value", () => {
    render(<Stepper value={5} />)
    expect(screen.getByRole("spinbutton")).toHaveValue(5)
  })

  it("calls onValueChange when increment button is clicked", () => {
    const onValueChange = vi.fn()
    render(<Stepper value={5} onValueChange={onValueChange} />)
    
    const incrementBtn = screen.getAllByRole("button")[1] // Second button is Plus
    if (incrementBtn) {
      fireEvent.click(incrementBtn)
    }

    expect(onValueChange).toHaveBeenCalledWith(6)
  })

  it("calls onValueChange when decrement button is clicked", () => {
    const onValueChange = vi.fn()
    render(<Stepper value={5} onValueChange={onValueChange} />)
    
    const decrementBtn = screen.getAllByRole("button")[0] // First button is Minus
    if (decrementBtn) {
      fireEvent.click(decrementBtn)
    }

    expect(onValueChange).toHaveBeenCalledWith(4)
  })

  it("respects min limit", () => {
    const onValueChange = vi.fn()
    render(<Stepper value={0} min={0} onValueChange={onValueChange} />)
    
    const decrementBtn = screen.getAllByRole("button")[0]
    expect(decrementBtn).toBeDisabled()
  })

  it("respects max limit", () => {
    const onValueChange = vi.fn()
    render(<Stepper value={10} max={10} onValueChange={onValueChange} />)
    
    const incrementBtn = screen.getAllByRole("button")[1]
    expect(incrementBtn).toBeDisabled()
  })
})
