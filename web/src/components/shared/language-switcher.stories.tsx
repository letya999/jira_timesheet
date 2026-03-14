import type { Meta, StoryObj } from "@storybook/react"
import { LanguageSwitcher } from "./language-switcher"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"

const meta: Meta<typeof LanguageSwitcher> = {
  title: "Shared/LanguageSwitcher",
  component: LanguageSwitcher,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <I18nextProvider i18n={i18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof LanguageSwitcher>

export const Full: Story = {
  args: {
    variant: "full",
  },
}

export const Compact: Story = {
  args: {
    variant: "compact",
  },
}
