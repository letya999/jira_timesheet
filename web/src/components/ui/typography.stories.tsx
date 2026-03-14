import type { Meta, StoryObj } from "@storybook/react"
import { Typography } from "./typography"

const meta: Meta<typeof Typography> = {
  title: "Atoms/Typography",
  component: Typography,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "h1",
        "h2",
        "h3",
        "h4",
        "p",
        "blockquote",
        "ul",
        "inlineCode",
        "lead",
        "large",
        "small",
        "muted",
        "mono",
      ],
    },
  },
}

export default meta
type Story = StoryObj<typeof Typography>

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Typography variant="h1">Heading 1</Typography>
      <Typography variant="h2">Heading 2</Typography>
      <Typography variant="h3">Heading 3</Typography>
      <Typography variant="h4">Heading 4</Typography>
      <Typography variant="p">
        Paragraph: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </Typography>
      <Typography variant="lead">Lead: A great starting point.</Typography>
      <Typography variant="large">Large text</Typography>
      <Typography variant="small">Small text</Typography>
      <Typography variant="muted">Muted text</Typography>
      <div>
        Standard text with <Typography variant="inlineCode">inline code</Typography>
      </div>
      <Typography variant="mono">Monospace text</Typography>
      <Typography variant="blockquote">
        "This is a blockquote."
      </Typography>
    </div>
  ),
}

export const H1: Story = {
  args: {
    variant: "h1",
    children: "Heading 1",
  },
}

export const P: Story = {
  args: {
    variant: "p",
    children: "This is a paragraph.",
  },
}
