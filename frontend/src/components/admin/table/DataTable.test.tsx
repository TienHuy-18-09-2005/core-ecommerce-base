// @vitest-environment happy-dom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable, type Column } from "./DataTable.tsx";
import { useSelection } from "./useSelection.ts";
import { SearchBox } from "./FilterBar.tsx";
import { seriousViolations } from "../axeTestUtils.ts";

type Row = { id: number; name: string; note: string };
const rows: Row[] = [1, 2, 3, 4].map((id) => ({ id, name: `SP ${id}`, note: `Ghi chú ${id}` }));
const columns: Column<Row>[] = [
  { id: "name", header: "Tên", cell: (r) => r.name, hideable: false },
  { id: "note", header: "Ghi chú", cell: (r) => r.note, secondary: true },
];

function Harness() {
  const selection = useSelection(rows.map((r) => r.id), "k");
  return <DataTable tableId="t" columns={columns} rows={rows} rowKey={(r) => r.id} selection={selection} rowLabel={(r) => r.name}
    bulkActions={<button type="button">Làm gì đó</button>} />;
}

beforeEach(() => localStorage.clear());
afterEach(() => vi.useRealTimers());

describe("DataTable v2", () => {
  it("selects with shift-click range, select-all and clears", () => {
    render(<Harness />);
    const all = screen.getByLabelText("Chọn tất cả hàng trên trang") as HTMLInputElement;
    fireEvent.click(screen.getByLabelText("Chọn SP 1"));
    expect(all.indeterminate).toBe(true);
    fireEvent.click(screen.getByLabelText("Chọn SP 3"), { shiftKey: true });
    expect(screen.getByText("Đã chọn 3")).toBeTruthy();
    expect((screen.getByLabelText("Chọn SP 4") as HTMLInputElement).checked).toBe(false);
    fireEvent.click(all);
    expect(screen.getByText("Đã chọn 4")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn" }));
    expect(screen.queryByRole("region", { name: "Thao tác hàng loạt" })).toBeNull();
  });

  it("hides columns and saves density per user", async () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Cột" }));
    const panel = screen.getByRole("dialog");
    expect(await seriousViolations()).toEqual([]);
    fireEvent.click(within(panel).getByLabelText("Ghi chú"));
    expect(screen.queryByRole("columnheader", { name: "Ghi chú" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Vừa" }));
    fireEvent.click(screen.getByLabelText("Gọn"));
    expect(document.querySelector("tbody tr")?.className).toContain("h-9");
    unmount();
    render(<Harness />);
    expect(screen.queryByRole("columnheader", { name: "Ghi chú" })).toBeNull();
    expect(document.querySelector("tbody tr")?.className).toContain("h-9");
  });

  it("expands secondary columns into a detail row", () => {
    render(<Harness />);
    const btn = screen.getAllByRole("button", { name: "Xem thêm SP 1" })[0];
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(within(document.querySelector("dl")!).getByText("Ghi chú 1")).toBeTruthy();
  });

  it("debounces search input", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    function S() { const [v, setV] = useState(""); return <SearchBox label="Tìm" value={v} onChange={(x) => { setV(x); onChange(x); }} />; }
    render(<S />);
    fireEvent.change(screen.getByLabelText("Tìm"), { target: { value: "đèn" } });
    expect(onChange).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(450); });
    expect(onChange).toHaveBeenCalledWith("đèn");
  });
});
