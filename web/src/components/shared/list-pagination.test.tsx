import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListPagination } from "./list-pagination";

describe("ListPagination", () => {
  it("renders showing range", () => {
    render(
      <ListPagination page={2} pageSize={10} total={39} itemLabel="projects" onPageChange={vi.fn()} />
    );

    expect(screen.getByText("Showing 11-20 of 39 projects")).toBeDefined();
  });

  it("calls page change on navigation", () => {
    const onPageChange = vi.fn();
    render(
      <ListPagination page={2} pageSize={10} total={39} itemLabel="projects" onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: /go to first page/i }));
    fireEvent.click(screen.getByRole("button", { name: /go to previous page/i }));
    fireEvent.click(screen.getByRole("button", { name: /go to next page/i }));
    fireEvent.click(screen.getByRole("button", { name: /go to last page/i }));

    expect(onPageChange).toHaveBeenCalledWith(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(onPageChange).toHaveBeenCalledWith(4);
  });
});
