import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select"

describe("Select", () => {
  it("renders correctly with placeholder", () => {
    render(
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText("Select fruit")).toBeInTheDocument()
  })

  it("opens the dropdown when clicked", async () => {
    render(
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.getByText("Banana")).toBeInTheDocument()
  })

  it("selects an item and updates the trigger value", async () => {
    const onValueChange = vi.fn()
    render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    )

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const appleItem = screen.getByText("Apple")
    fireEvent.click(appleItem)

    expect(onValueChange).toHaveBeenCalledWith("apple")
  })
})
