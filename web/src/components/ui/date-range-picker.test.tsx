import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { DateRangePicker } from "./date-range-picker"

describe("DateRangePicker", () => {
  it("renders with placeholder", () => {
    render(<DateRangePicker placeholder="Pick a range" />)
    expect(screen.getByText("Pick a range")).toBeInTheDocument()
  })

  it("renders selected date range", () => {
    const from = new Date(2024, 0, 1)
    const to = new Date(2024, 0, 10)
    render(<DateRangePicker date={{ from, to }} />)
    expect(screen.getByText("Jan 01, 2024 - Jan 10, 2024")).toBeInTheDocument()
  })

  it("is disabled when prop is passed", () => {
    render(<DateRangePicker disabled />)
    expect(screen.getByRole("button")).toBeDisabled()
  })
})
