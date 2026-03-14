import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Calendar } from "./calendar"

describe("Calendar", () => {
  it("renders correctly", () => {
    const testDate = new Date(2024, 0, 1)
    render(<Calendar mode="single" selected={testDate} month={testDate} />)
    expect(screen.getByText("January 2024")).toBeInTheDocument()
  })

  it("calls onSelect when a day is clicked", () => {
    const onSelect = vi.fn()
    // Using a fixed date to ensure the test is predictable
    const testDate = new Date(2024, 0, 1) // Jan 1st 2024
    render(<Calendar mode="single" onSelect={onSelect} month={testDate} />)

    // Find the button for Jan 15th
    const day15 = screen.getByText("15")
    fireEvent.click(day15)

    expect(onSelect).toHaveBeenCalled()
  })
})
