import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { ChatMessage } from "./chat-message"

describe("ChatMessage", () => {
  it("renders assistant message correctly", () => {
    render(<ChatMessage role="assistant" content="Hello" />)
    expect(screen.getByText("Hello")).toBeInTheDocument()
    // Default fallback for assistant is 'A'
    expect(screen.getByText("A")).toBeInTheDocument()
  })

  it("renders user message correctly", () => {
    render(<ChatMessage role="user" content="Hi" username="John" />)
    expect(screen.getByText("Hi")).toBeInTheDocument()
    expect(screen.getByText("JO")).toBeInTheDocument()
  })

  it("renders markdown content", () => {
    render(<ChatMessage role="assistant" content="**Bold** [Link](https://x.com)" />)
    expect(screen.getByText("Bold")).toBeInTheDocument()
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://x.com")
  })

  it("renders JiraKeyLink for matching links", () => {
    render(<ChatMessage role="assistant" content="[TASK-123](https://jira.com/browse/TASK-123)" />)
    expect(screen.getByText("TASK-123")).toBeInTheDocument()
    const link = screen.getByRole("link")
    // JiraKeyLink has the Ticket icon
    expect(link.querySelector("svg")).toBeInTheDocument()
  })
})
