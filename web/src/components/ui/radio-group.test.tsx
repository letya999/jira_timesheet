import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { RadioGroup, RadioGroupItem } from "./radio-group"

describe("RadioGroup", () => {
  it("renders correctly", () => {
    render(
      <RadioGroup defaultValue="1">
        <RadioGroupItem value="1" id="r1" />
        <label htmlFor="r1">Option 1</label>
        <RadioGroupItem value="2" id="r2" />
        <label htmlFor="r2">Option 2</label>
      </RadioGroup>
    )
    expect(screen.getByRole("radiogroup")).toBeInTheDocument()
    expect(screen.getByLabelText("Option 1")).toBeChecked()
    expect(screen.getByLabelText("Option 2")).not.toBeChecked()
  })

  it("changes value when clicked", () => {
    const onValueChange = vi.fn()
    render(
      <RadioGroup onValueChange={onValueChange}>
        <RadioGroupItem value="1" id="r1" />
        <label htmlFor="r1">Option 1</label>
        <RadioGroupItem value="2" id="r2" />
        <label htmlFor="r2">Option 2</label>
      </RadioGroup>
    )

    fireEvent.click(screen.getByLabelText("Option 2"))
    expect(onValueChange).toHaveBeenCalledWith("2")
    expect(screen.getByLabelText("Option 2")).toBeChecked()
    expect(screen.getByLabelText("Option 1")).not.toBeChecked()
  })

  it("is disabled when disabled prop is true", () => {
    render(
      <RadioGroup disabled defaultValue="1">
        <RadioGroupItem value="1" id="r1" />
        <label htmlFor="r1">Option 1</label>
        <RadioGroupItem value="2" id="r2" />
        <label htmlFor="r2">Option 2</label>
      </RadioGroup>
    )
    expect(screen.getByLabelText("Option 1")).toBeDisabled()
    expect(screen.getByLabelText("Option 2")).toBeDisabled()
  })
})
