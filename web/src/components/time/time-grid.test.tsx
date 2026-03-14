import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { TimeGrid } from "./time-grid"

describe("TimeGrid", () => {
  const startDate = new Date("2024-03-11") // Monday
  const entries = [
    {
      taskId: "TASK-123",
      taskName: "Task 1",
      values: { "2024-03-11": 4 }
    }
  ]

  it("renders correctly", () => {
    render(<TimeGrid startDate={startDate} entries={entries} />)
    expect(screen.getByText("Task 1")).toBeInTheDocument()
    expect(screen.getByText("TASK-123")).toBeInTheDocument()
    expect(screen.getByText("Mon")).toBeInTheDocument()
  })

  it("calculates total correctly", () => {
    render(<TimeGrid startDate={startDate} entries={entries} />)
    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("calls onValueChange when input changes", () => {
    const handleChange = vi.fn()
    render(<TimeGrid startDate={startDate} entries={entries} onValueChange={handleChange} />)
    
    // Find input for the first day
    const inputs = screen.getAllByRole("spinbutton")
    if (inputs[0]) {
      fireEvent.change(inputs[0], { target: { value: "6" } })
    }
    
    expect(handleChange).toHaveBeenCalledWith("TASK-123", "2024-03-11", 6)
  })
})
