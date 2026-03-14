import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { StatusBadge } from "./status-badge"

describe("StatusBadge", () => {
  it("renders correctly with default todo status", () => {
    render(<StatusBadge>To Do</StatusBadge>)
    const badge = screen.getByText("To Do")
    expect(badge).toBeInTheDocument()
    // It should have some specific classes from the variant
    expect(badge).toHaveClass("bg-slate-100")
  })

  it("renders with in_progress status", () => {
    render(<StatusBadge status="in_progress">In Progress</StatusBadge>)
    const badge = screen.getByText("In Progress")
    expect(badge).toHaveClass("bg-blue-100")
  })

  it("renders with done status", () => {
    render(<StatusBadge status="done">Done</StatusBadge>)
    const badge = screen.getByText("Done")
    expect(badge).toHaveClass("bg-green-100")
  })

  it("renders with blocked status", () => {
    render(<StatusBadge status="blocked">Blocked</StatusBadge>)
    const badge = screen.getByText("Blocked")
    expect(badge).toHaveClass("bg-red-100")
  })

  it("renders with review status", () => {
    render(<StatusBadge status="review">Review</StatusBadge>)
    const badge = screen.getByText("Review")
    expect(badge).toHaveClass("bg-yellow-100")
  })

  it("renders with backlog status", () => {
    render(<StatusBadge status="backlog">Backlog</StatusBadge>)
    const badge = screen.getByText("Backlog")
    expect(badge).toHaveClass("bg-gray-100")
  })
})
