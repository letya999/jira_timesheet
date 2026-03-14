import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"

describe("Avatar", () => {
  it("renders correctly with image (initial state is fallback)", () => {
    render(
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    )
    // In JSDOM, image won't load, so it should show fallback
    expect(screen.getByText("CN")).toBeInTheDocument()
  })

  it("renders fallback when image is missing", () => {
    render(
      <Avatar>
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    )
    expect(screen.getByText("CN")).toBeInTheDocument()
  })

  it("applies correct size classes", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
    )
    const avatar = container.querySelector('[data-slot="avatar"]')
    expect(avatar).toHaveAttribute("data-size", "lg")
  })
})
