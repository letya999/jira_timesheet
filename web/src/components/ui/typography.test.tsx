import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Typography } from "./typography"

describe("Typography", () => {
  it("renders h1 correctly", () => {
    render(<Typography variant="h1">Heading 1</Typography>)
    const element = screen.getByRole("heading", { level: 1 })
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent("Heading 1")
    expect(element.tagName).toBe("H1")
  })

  it("renders p correctly by default", () => {
    render(<Typography>Paragraph</Typography>)
    const element = screen.getByText("Paragraph")
    expect(element.tagName).toBe("P")
  })

  it("renders inlineCode as code tag", () => {
    render(<Typography variant="inlineCode">code</Typography>)
    const element = screen.getByText("code")
    expect(element.tagName).toBe("CODE")
  })

  it("renders with custom 'as' prop", () => {
    render(<Typography as="section">Section</Typography>)
    const element = screen.getByText("Section")
    expect(element.tagName).toBe("SECTION")
  })

  it("applies variant classes", () => {
    const { rerender } = render(<Typography variant="lead">Lead text</Typography>)
    expect(screen.getByText("Lead text")).toHaveClass("text-xl text-muted-foreground")

    rerender(<Typography variant="muted">Muted text</Typography>)
    expect(screen.getByText("Muted text")).toHaveClass("text-sm text-muted-foreground")
  })
})
