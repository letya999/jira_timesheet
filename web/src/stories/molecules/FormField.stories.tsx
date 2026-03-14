import type { Meta, StoryObj } from '@storybook/react'
import { FormField } from '@/components/shared/form-field'
import { Input } from '@/components/ui/input'

const meta: Meta<typeof FormField> = {
  title: 'Molecules/FormField',
  component: FormField,
  tags: ['autodocs'],
} satisfies Meta<typeof FormField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: 'Email Address',
    children: <Input placeholder="Enter your email" />,
  },
}

export const WithError: Story = {
  args: {
    label: 'Password',
    error: 'Password must be at least 8 characters',
    children: <Input type="password" defaultValue="short" />,
  },
}

export const Required: Story = {
  args: {
    label: 'Username',
    required: true,
    children: <Input placeholder="Choose a username" />,
  },
}

export const WithDescription: Story = {
  args: {
    label: 'Bio',
    description: 'A brief description of yourself',
    children: <Input placeholder="I am a software engineer" />,
  },
}
