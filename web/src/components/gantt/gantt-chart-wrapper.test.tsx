import { render } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { GanttChartWrapper } from "./gantt-chart-wrapper"

// Basic mock for dhtmlx-gantt if it causes issues in jsdom
vi.mock("dhtmlx-gantt", () => ({
  gantt: {
    config: {},
    init: vi.fn(),
    parse: vi.fn(),
    attachEvent: vi.fn(() => "event-id"),
    detachEvent: vi.fn(),
    clearAll: vi.fn(),
  },
}))

describe("GanttChartWrapper", () => {
  it("renders container correctly", () => {
    const { container } = render(
      <GanttChartWrapper tasks={{ data: [] }} />
    )
    expect(container.firstChild).toHaveClass("w-full")
  })
})
