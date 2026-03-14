import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { DataTable } from "./data-table"
import { ColumnDef } from "@tanstack/react-table"

type TestData = {
  id: string
  name: string
}

const columns: ColumnDef<TestData>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
]

const data: TestData[] = [
  { id: "1", name: "John Doe" },
  { id: "2", name: "Jane Smith" },
]

describe("DataTable", () => {
  it("renders correctly with data", () => {
    render(<DataTable columns={columns} data={data} />)

    expect(screen.getByText("Name")).toBeDefined()
    expect(screen.getByText("John Doe")).toBeDefined()
    expect(screen.getByText("Jane Smith")).toBeDefined()
  })

  it("renders empty state when no data", () => {
    render(<DataTable columns={columns} data={[]} />)

    expect(screen.getByText("No results.")).toBeDefined()
  })
})
