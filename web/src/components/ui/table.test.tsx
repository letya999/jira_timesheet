import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

describe("Table", () => {
  it("renders correctly with all parts", () => {
    render(
      <Table>
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Footer</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    )

    expect(screen.getByText("Caption")).toBeDefined()
    expect(screen.getByText("Head")).toBeDefined()
    expect(screen.getByText("Cell")).toBeDefined()
    expect(screen.getByText("Footer")).toBeDefined()
  })

  it("renders custom classes", () => {
    const { container } = render(<Table className="custom-table" />)
    const tableElement = container.querySelector("table")
    expect(tableElement).toHaveClass("custom-table")
  })
})
