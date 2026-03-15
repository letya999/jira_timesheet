import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { Button } from '@/components/ui/button'
import { fn } from '@storybook/test'

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Molecules/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
  decorators: [
    (Story) => {
      const [open, setOpen] = useState(false)
      return (
        <div className="flex flex-col items-center gap-4">
          <Button onClick={() => setOpen(true)}>Show Dialog</Button>
          <Story args={{ open, onOpenChange: setOpen }} />
        </div>
      )
    },
  ],
} satisfies Meta<typeof ConfirmDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Are you sure?',
    description: 'This action cannot be undone.',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
  },
}

export const Destructive: Story = {
  args: {
    title: 'Delete Worklog',
    description: 'Are you sure you want to delete this worklog? This action is permanent.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep it',
    variant: 'destructive',
  },
}
