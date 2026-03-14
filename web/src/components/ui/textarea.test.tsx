import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Textarea } from "./textarea"

describe("Textarea", () => {
  it("renders correctly with placeholder", () => {
    render(<Textarea placeholder="Type something" />)
    expect(screen.getByPlaceholderText("Type something")).toBeInTheDocument()
  })

  it("updates value when typed into", () => {
    const onChange = vi.fn()
    render(<Textarea onChange={onChange} />)
    const textarea = screen.getByRole("textbox")
    fireEvent.change(textarea, { target: { value: "Hello world" } })
    expect(onChange).toHaveBeenCalled()
    expect(textarea).toHaveValue("Hello world")
  })

  it("is disabled when the prop is passed", () => {
    render(<Textarea disabled />)
    expect(screen.getByRole("textbox")).toBeDisabled()
  })
})
