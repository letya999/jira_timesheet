import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SyncIndicator } from "./sync-indicator"

describe("SyncIndicator", () => {
  it("renders 'Not synced' when no lastSync", () => {
    render(<SyncIndicator />)
    expect(screen.getByText("Not synced")).toBeInTheDocument()
  })

  it("renders 'Syncing...' when isSyncing is true", () => {
    render(<SyncIndicator isSyncing />)
    expect(screen.getByText("Syncing...")).toBeInTheDocument()
  })

  it("renders formatted date when lastSync is provided", () => {
    const date = new Date("2024-01-01T12:00:00Z")
    render(<SyncIndicator lastSync={date} />)
    expect(screen.getByText(/Last sync:/)).toBeInTheDocument()
    expect(screen.getByText(new RegExp(date.toLocaleString()))).toBeInTheDocument()
  })

  it("applies animation class when isSyncing is true", () => {
    const { container } = render(<SyncIndicator isSyncing />)
    const icon = container.querySelector("svg")
    expect(icon).toHaveClass("animate-spin")
  })
})
