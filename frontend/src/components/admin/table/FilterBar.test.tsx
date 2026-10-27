// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FilterChips, type FilterDef } from "./FilterBar.tsx";
import { seriousViolations } from "../axeTestUtils.ts";

const FILTERS: FilterDef[] = [{ key: "range", label: "Khoảng ngày", type: "daterange", fromKey: "from", toKey: "to" }];
function Harness({ init = {} }: { init?: Record<string, string> }) {
  const [v, setV] = useState<Record<string, string>>(init);
  return <FilterChips filters={FILTERS} values={v} onChange={(k, x) => setV((s) => ({ ...s, [k]: x }))} onClear={() => setV({})} />;
}
afterEach(cleanup);

describe("Khoảng ngày", () => {
  it("một nhóm, hai ô ngày; đặt giá trị thì hiện Xóa bộ lọc", async () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Khoảng ngày" })).toBeTruthy();
    expect(screen.queryByText("Xóa bộ lọc")).toBeNull();
    fireEvent.change(screen.getByLabelText("Khoảng ngày: từ ngày"), { target: { value: "2026-10-01" } });
    expect(screen.getByText("Xóa bộ lọc")).toBeTruthy();
    expect(await seriousViolations()).toEqual([]);
  });
  it("báo lỗi khi từ > đến", async () => {
    render(<Harness init={{ from: "2026-10-27", to: "2026-10-01" }} />);
    expect(screen.getByRole("alert").textContent).toContain("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc");
    expect(screen.getByLabelText("Khoảng ngày: đến ngày").getAttribute("aria-invalid")).toBe("true");
    expect(await seriousViolations()).toEqual([]);
  });
});
