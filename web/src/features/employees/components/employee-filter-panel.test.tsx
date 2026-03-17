import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeeFilterPanel } from "./employee-filter-panel";

describe("EmployeeFilterPanel", () => {
  it("toggles filters content when clicking show filters", () => {
    render(<EmployeeFilterPanel orgUnits={[]} onFilterChange={vi.fn()} />);

    expect(screen.queryByText("User Type")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show filters/i }));
    expect(screen.getByText("User Type")).toBeDefined();
  });
});
