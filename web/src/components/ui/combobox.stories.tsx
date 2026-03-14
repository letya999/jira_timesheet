import type { Meta, StoryObj } from "@storybook/react"
import { Combobox } from "./combobox"
import * as React from "react"

const meta: Meta<typeof Combobox> = {
  title: "UI/Combobox",
  component: Combobox,
}

export default meta
type Story = StoryObj<typeof Combobox>

const options = [
  { label: "Option 1", value: "opt1" },
  { label: "Option 2", value: "opt2" },
  { label: "Option 3", value: "opt3" },
]

export const Default: Story = {
  render: () => {
    const [value, setValue] = React.useState("")
    return <Combobox options={options} value={value} onChange={setValue} />
  },
}

export const Preselected: Story = {
  render: () => {
    const [value, setValue] = React.useState("opt2")
    return <Combobox options={options} value={value} onChange={setValue} />
  },
}

export const Disabled: Story = {
  render: () => {
    return <Combobox options={options} disabled />
  },
}
