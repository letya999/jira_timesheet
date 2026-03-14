import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Input } from "./input"

describe("Input", () => {
  it("renders correctly", () => {
    render(<Input placeholder="Type here" />)
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument()
  })

  it("handles value changes", () => {
    const handleChange = vi.fn()
    render(<Input placeholder="Type here" onChange={handleChange} />)
    const input = screen.getByPlaceholderText("Type here")
    fireEvent.change(input, { target: { value: "Hello" } })
    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(input).toHaveValue("Hello")
  })

  it("is disabled when disabled prop is true", () => {
    render(<Input disabled placeholder="Disabled" />)
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled()
  })

  it("shows error state when aria-invalid is true", () => {
    render(<Input aria-invalid placeholder="Error" />)
    const input = screen.getByPlaceholderText("Error")
    expect(input).toHaveAttribute("aria-invalid", "true")
  })

  it("supports different types", () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />)
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("type", "email")

    rerender(<Input type="number" placeholder="Number" />)
    expect(screen.getByPlaceholderText("Number")).toHaveAttribute("type", "number")
  })
})
