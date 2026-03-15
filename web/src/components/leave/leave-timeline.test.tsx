import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { LeaveTimeline } from "./leave-timeline"

describe("LeaveTimeline", () => {
  const mockUsers = [{ id: "1", name: "Alice Johnson" }]
  const mockEntries = [
    {
      id: "e1",
      userId: "1",
      userName: "Alice Johnson",
      type: "VACATION" as const,
      startDate: new Date("2024-03-12"),
      endDate: new Date("2024-03-12"),
    },
  ]

  it("renders list in day view", () => {
    render(
      <LeaveTimeline
        view="day"
        startDate={new Date("2024-03-12")}
        users={mockUsers}
        entries={mockEntries}
      />
    )
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument()
    expect(screen.getByText(/Vacation/i)).toBeInTheDocument()
  })

  it("renders grid in week view", () => {
    render(
      <LeaveTimeline
        view="week"
        startDate={new Date("2024-03-11")}
        users={mockUsers}
        entries={mockEntries}
      />
    )
    expect(screen.getByText("Team Member")).toBeInTheDocument()
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument()
    // Days of the week headers
    expect(screen.getByText("Mon")).toBeInTheDocument()
    expect(screen.getByText("Tue")).toBeInTheDocument()
  })

  it("highlights weekends in grid", () => {
    const { container } = render(
      <LeaveTimeline
        view="week"
        startDate={new Date("2024-03-11")}
        users={mockUsers}
        entries={[]}
      />
    )
    // New CSS Grid layout uses data-weekend attribute on role="columnheader" divs
    const weekendHeaders = container.querySelectorAll('[role="columnheader"][data-weekend="true"]')
    // Sat and Sun
    expect(weekendHeaders.length).toBe(2)
  })
})
