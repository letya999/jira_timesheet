import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Alert, AlertTitle, AlertDescription } from "./alert"

describe("Alert", () => {
  it("renders correctly", () => {
    render(
      <Alert>
        <AlertTitle>Title</AlertTitle>
        <AlertDescription>Description</AlertDescription>
      </Alert>
    )

    expect(screen.getByText("Title")).toBeDefined()
    expect(screen.getByText("Description")).toBeDefined()
  })

  it("applies variant classes", () => {
    const { container } = render(<Alert variant="destructive">Error</Alert>)
    expect(container.firstChild).toHaveClass("text-destructive")
  })
})
