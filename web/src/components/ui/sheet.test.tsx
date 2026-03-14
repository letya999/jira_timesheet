import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./sheet"

describe("Sheet", () => {
  it("opens when trigger is clicked", async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Sheet Title</SheetTitle>
          Content
        </SheetContent>
      </Sheet>
    )

    fireEvent.click(screen.getByText("Open"))
    expect(await screen.findByText("Sheet Title")).toBeDefined()
  })
})
