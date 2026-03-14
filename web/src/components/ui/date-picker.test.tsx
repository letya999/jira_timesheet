import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { DatePicker } from "./date-picker"

describe("DatePicker", () => {
  it("renders with placeholder", () => {
    render(<DatePicker placeholder="Pick a date" />)
    expect(screen.getByText("Pick a date")).toBeInTheDocument()
  })

  it("renders selected date", () => {
    const date = new Date(2024, 0, 1)
    render(<DatePicker date={date} />)
    expect(screen.getByText("January 1st, 2024")).toBeInTheDocument()
  })

  it("is disabled when prop is passed", () => {
    render(<DatePicker disabled />)
    expect(screen.getByRole("button")).toBeDisabled()
  })
})
