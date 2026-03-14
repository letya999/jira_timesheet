import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { PasswordInput } from "./password-input"

describe("PasswordInput", () => {
  it("renders correctly", () => {
    render(<PasswordInput placeholder="Enter password" />)
    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute("type", "password")
  })

  it("toggles password visibility", () => {
    render(<PasswordInput placeholder="Enter password" />)
    const input = screen.getByPlaceholderText("Enter password")
    const toggleButton = screen.getByRole("button", { name: /show password/i })

    expect(input).toHaveAttribute("type", "password")

    fireEvent.click(toggleButton)
    expect(input).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /hide password/i }))
    expect(input).toHaveAttribute("type", "password")
  })

  it("is disabled when disabled prop is true", () => {
    render(<PasswordInput disabled placeholder="Disabled" />)
    expect(screen.getByPlaceholderText("Disabled")).toBeDisabled()
    expect(screen.getByRole("button", { name: /show password/i })).toBeDisabled()
  })
})
