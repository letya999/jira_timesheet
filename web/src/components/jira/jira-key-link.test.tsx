import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { JiraKeyLink } from "./jira-key-link"

describe("JiraKeyLink", () => {
  it("renders correctly with key", () => {
    render(<JiraKeyLink issueKey="TASK-123" />)
    expect(screen.getByText("TASK-123")).toBeInTheDocument()
  })

  it("renders as a link when baseUrl is provided", () => {
    render(<JiraKeyLink issueKey="TASK-123" baseUrl="https://jira.com" />)
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "https://jira.com/browse/TASK-123")
    expect(link).toHaveAttribute("target", "_blank")
  })

  it("renders as a span when baseUrl is NOT provided", () => {
    render(<JiraKeyLink issueKey="TASK-123" />)
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByText("TASK-123")).toBeInTheDocument()
  })

  it("shows icon by default", () => {
    const { container } = render(<JiraKeyLink issueKey="TASK-123" />)
    // The Ticket icon from lucide-react
    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("hides icon when showIcon is false", () => {
    const { container } = render(<JiraKeyLink issueKey="TASK-123" showIcon={false} />)
    // Should only have external link icon if baseUrl provided, but here we don't provide it
    expect(container.querySelector("svg")).toBeNull()
  })
})
