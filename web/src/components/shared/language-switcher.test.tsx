import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import { LanguageSwitcher } from "./language-switcher"
import { I18nextProvider } from "react-i18next"
import i18n from "@/i18n"

describe("LanguageSwitcher", () => {
  beforeEach(() => {
    i18n.changeLanguage("en")
  })

  it("renders in full mode by default", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher />
      </I18nextProvider>
    )
    expect(screen.getByRole("button")).toBeInTheDocument()
    expect(screen.getByText(/EN/i)).toBeInTheDocument()
  })

  it("renders in compact mode when variant is compact", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher variant="compact" />
      </I18nextProvider>
    )
    expect(screen.getByRole("button")).toBeInTheDocument()
    expect(screen.getByText(/EN/i)).toBeInTheDocument()
  })

  it("changes language when clicked in compact mode", () => {
    render(
      <I18nextProvider i18n={i18n}>
        <LanguageSwitcher variant="compact" />
      </I18nextProvider>
    )
    const button = screen.getByRole("button")
    fireEvent.click(button)
    expect(i18n.language).toBe("ru")
    expect(screen.getByText(/RU/i)).toBeInTheDocument()

    fireEvent.click(button)
    expect(i18n.language).toBe("en")
    expect(screen.getByText(/EN/i)).toBeInTheDocument()
  })
})
