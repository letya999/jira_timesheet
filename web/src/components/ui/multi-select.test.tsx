import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MultiSelect } from "./multi-select"

const options = [
  { label: "Option 1", value: "opt1" },
  { label: "Option 2", value: "opt2" },
]

describe("MultiSelect", () => {
  it("renders with placeholder", () => {
    render(<MultiSelect options={options} selected={[]} onChange={() => {}} placeholder="Select..." />)
    expect(screen.getByText("Select...")).toBeInTheDocument()
  })

  it("shows selected items as badges", () => {
    render(<MultiSelect options={options} selected={["opt1"]} onChange={() => {}} />)
    expect(screen.getByText("Option 1")).toBeInTheDocument()
  })

  it("calls onChange when an item is selected", () => {
    const onChange = vi.fn()
    render(<MultiSelect options={options} selected={[]} onChange={onChange} />)
    
    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const option1 = screen.getByText("Option 1")
    fireEvent.click(option1)

    expect(onChange).toHaveBeenCalledWith(["opt1"])
  })
})
