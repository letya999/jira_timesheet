import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Combobox } from "./combobox"

const options = [
  { label: "Option 1", value: "opt1" },
  { label: "Option 2", value: "opt2" },
]

describe("Combobox", () => {
  it("renders with placeholder", () => {
    render(<Combobox options={options} placeholder="Select..." />)
    expect(screen.getByText("Select...")).toBeInTheDocument()
  })

  it("opens options when clicked", () => {
    render(<Combobox options={options} />)
    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)
    expect(screen.getByText("Option 1")).toBeInTheDocument()
  })

  it("calls onChange when an option is selected", () => {
    const onChange = vi.fn()
    render(<Combobox options={options} onChange={onChange} />)
    
    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const option1 = screen.getByText("Option 1")
    fireEvent.click(option1)

    expect(onChange).toHaveBeenCalledWith("opt1")
  })
})
