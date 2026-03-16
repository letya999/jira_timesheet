import type { Meta, StoryObj } from '@storybook/react'
import { Settings } from 'lucide-react'
import { CollapsibleBlock } from '@/components/shared/collapsible-block'

const meta: Meta<typeof CollapsibleBlock> = {
  title: 'Molecules/CollapsibleBlock',
  component: CollapsibleBlock,
  tags: ['autodocs'],
  args: {
    title: 'Panel title',
    defaultOpen: true,
    icon: <Settings className="size-4 text-primary" />,
    children: (
      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span>Reusable collapsible container for arbitrary content.</span>
        <span>Can be used for filters, settings, hints, or details.</span>
      </div>
    ),
  },
} satisfies Meta<typeof CollapsibleBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Open: Story = {}

export const ClosedByDefault: Story = {
  args: {
    defaultOpen: false,
  },
}
