import type { Meta, StoryObj } from "@storybook/react"
import { MultiSelect } from "./multi-select"
import * as React from "react"

const meta: Meta<typeof MultiSelect> = {
  title: "UI/MultiSelect",
  component: MultiSelect,
  argTypes: {},
}

export default meta
type Story = StoryObj<typeof MultiSelect>

const options = [
  { label: "React", value: "react" },
  { label: "Next.js", value: "nextjs" },
  { label: "Tailwind CSS", value: "tailwind" },
  { label: "TypeScript", value: "typescript" },
  { label: "Zustand", value: "zustand" },
]

export const Default: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<string[]>([])
    return (
      <div className="w-[300px]">
        <MultiSelect
          options={options}
          selected={selected}
          onChange={setSelected}
        />
      </div>
    )
  },
}

export const Preselected: Story = {
  render: () => {
    const [selected, setSelected] = React.useState<string[]>(["react", "typescript"])
    return (
      <div className="w-[300px]">
        <MultiSelect
          options={options}
          selected={selected}
          onChange={setSelected}
        />
      </div>
    )
  },
}
