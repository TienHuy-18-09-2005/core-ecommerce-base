// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StarRating } from "./StarRating.tsx";

describe("StarRating", () => {
  it("read-only mode announces the value and has no inputs", () => {
    render(<StarRating value={4.3} />);
    expect(screen.getByRole("img", { name: "4,3 trên 5 sao" })).toBeTruthy();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("editable mode exposes 5 radios and reports the chosen star", () => {
    const onChange = vi.fn();
    render(<StarRating value={0} onChange={onChange} error="Vui lòng chọn số sao." />);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    fireEvent.click(screen.getByRole("radio", { name: /4 sao/ }));
    expect(onChange).toHaveBeenCalledWith(4);
    expect(screen.getByText("Vui lòng chọn số sao.")).toBeTruthy();
  });
});
