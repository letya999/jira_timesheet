import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Slider } from "./slider"

describe("Slider", () => {
  it("renders correctly", () => {
    render(<Slider defaultValue={[50]} max={100} step={1} />)
    expect(screen.getByRole("slider")).toBeInTheDocument()
  })

  it("renders multiple thumbs for range slider", () => {
    render(<Slider defaultValue={[25, 75]} max={100} step={1} />)
    const sliders = screen.getAllByRole("slider")
    expect(sliders).toHaveLength(2)
  })

  it("is disabled when prop is passed", () => {
    render(<Slider disabled defaultValue={[50]} />)
    const slider = screen.getByRole("slider").closest('[data-slot="slider"]')
    expect(slider).toHaveAttribute("data-disabled")
  })
})
