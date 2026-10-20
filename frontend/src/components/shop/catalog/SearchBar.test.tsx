// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar.tsx";

describe("SearchBar", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("debounces 300ms and fires once for a burst of typing", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByLabelText("Tìm trong danh sách");
    for (const v of ["d", "de", "den"]) {
      fireEvent.change(input, { target: { value: v } });
      act(() => vi.advanceTimersByTime(100));
    }
    expect(onSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith("den");
    // cùng giá trị (chỉ thêm khoảng trắng) → không gửi lại
    fireEvent.change(input, { target: { value: "den " } });
    act(() => vi.advanceTimersByTime(400));
    expect(onSearch).toHaveBeenCalledTimes(1);
  });
});
