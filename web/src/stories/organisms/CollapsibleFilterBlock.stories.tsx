import type { Meta, StoryObj } from '@storybook/react'
import { CollapsibleFilterBlock } from '@/components/shared/collapsible-filter-block'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const meta: Meta<typeof CollapsibleFilterBlock> = {
  title: 'Organisms/CollapsibleFilterBlock',
  component: CollapsibleFilterBlock,
  tags: ['autodocs'],
  args: {
    title: 'Фильтры и Поиск',
    defaultOpen: true,
    children: (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="story-start-date">Дата начала</Label>
          <Input id="story-start-date" type="date" value="2025-12-15" readOnly />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="story-end-date">Дата окончания</Label>
          <Input id="story-end-date" type="date" value="2026-03-15" readOnly />
        </div>
      </div>
    ),
  },
} satisfies Meta<typeof CollapsibleFilterBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const ClosedByDefault: Story = {
  args: {
    defaultOpen: false,
  },
}
