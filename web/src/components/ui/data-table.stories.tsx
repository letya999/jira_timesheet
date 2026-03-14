import type { Meta, StoryObj } from "@storybook/react"
import { DataTable } from "./data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "./badge"
import { Checkbox } from "./checkbox"

type Payment = {
  id: string
  amount: number
  status: "pending" | "processing" | "success" | "failed"
  email: string
}

const columns: ColumnDef<Payment>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string
      return (
        <Badge variant={status === "success" ? "default" : "secondary"}>
          {status}
        </Badge>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "amount",
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount)
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
]

const data: Payment[] = [
  { id: "1", amount: 100, status: "pending", email: "m@example.com" },
  { id: "2", amount: 242, status: "success", email: "p@example.com" },
  { id: "3", amount: 450, status: "processing", email: "a@example.com" },
  { id: "4", amount: 120, status: "failed", email: "e@example.com" },
  { id: "5", amount: 80, status: "success", email: "i@example.com" },
]

const meta: Meta<typeof DataTable> = {
  title: "UI/DataTable",
  component: DataTable,
  tags: ["autodocs"],
}

export default meta
type Story = StoryObj<typeof DataTable>

export const Default: Story = {
  args: {
    columns: columns as any,
    data: data as any,
    filterColumn: "email",
    filterPlaceholder: "Filter emails...",
  },
}
