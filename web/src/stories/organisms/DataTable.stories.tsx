import type { Meta, StoryObj } from '@storybook/react'
import { DataTableOrganism } from '@/components/shared/data-table-organism'
import { http, HttpResponse, delay } from 'msw'
import { ColumnDef } from '@tanstack/react-table'

interface TestData {
  id: string
  name: string
  status: string
}

const columns: ColumnDef<TestData>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'status', header: 'Status' },
]

const mockData: TestData[] = Array.from({ length: 100 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Item ${i + 1}`,
  status: i % 2 === 0 ? 'Active' : 'Inactive',
}))

const meta: Meta<typeof DataTableOrganism> = {
  title: 'Organisms/DataTable',
  component: DataTableOrganism,
  tags: ['autodocs'],
  args: {
    columns: columns as any,
    data: mockData as any,
    total: 100,
  },
} satisfies Meta<typeof DataTableOrganism>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  args: {
    data: mockData as any,
    total: 100,
  },
}

export const Empty: Story = {
  args: {
    data: [],
    total: 0,
  },
}

export const Loading: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/test-data', async () => {
          await delay('infinite')
          return HttpResponse.json([])
        }),
      ],
    },
  },
}

export const Error: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/test-data', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
