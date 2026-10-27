// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { useToast } from "../../app/useToast.ts";
import { inputClass } from "../../utils/adminFormat.ts";
import { CheckboxField, FormField, useSaveShortcut, useUnsavedChanges } from "./form/FormField.tsx";
import { AdminLayout } from "./layout/AdminLayout.tsx";
import { Drawer } from "./overlay/Drawer.tsx";
import { ConfirmModal, Modal } from "./overlay/Modal.tsx";
import { DataTable } from "./ui.tsx";
import { seriousViolations } from "./axeTestUtils.ts";


function inRouter(el: React.ReactNode, path = "/admin") {
  const router = createMemoryRouter([{ path: "*", element: el }], { initialEntries: [path] });
  return render(<RouterProvider router={router} />);
}

describe("axe: admin UI không có lỗi serious/critical", () => {
  it("layout (sidebar, topbar, breadcrumb)", async () => {
    inRouter(<AdminLayout><h1>Đơn hàng</h1></AdminLayout>, "/admin/don-hang");
    expect(await seriousViolations()).toEqual([]);
  });

  it("layout với menu drawer đang mở", async () => {
    inRouter(<AdminLayout><h1>Tổng quan</h1></AdminLayout>);
    const open = screen.queryAllByRole("button", { name: /menu/i })[0];
    if (open) fireEvent.click(open);
    expect(await seriousViolations()).toEqual([]);
  });

  it("modal và confirm modal", async () => {
    render(<>
      <Modal open onClose={() => {}} title="Sửa thông tin" footer={<button type="button">Lưu</button>}><FormField label="Tên"><input className={inputClass} /></FormField></Modal>
    </>);
    expect(await seriousViolations()).toEqual([]);
  });

  it("confirm modal nguy hiểm", async () => {
    render(<ConfirmModal open danger title="Xóa?" message="Không thể hoàn tác." onConfirm={() => {}} onCancel={() => {}} />);
    expect(await seriousViolations()).toEqual([]);
  });

  it("drawer", async () => {
    render(<Drawer open onClose={() => {}} title="Bộ lọc" footer={<button type="button">Áp dụng</button>}><FormField label="Từ khóa"><input className={inputClass} /></FormField></Drawer>);
    expect(await seriousViolations()).toEqual([]);
  });

  it("biểu mẫu có gợi ý, lỗi, bắt buộc, ô chọn", async () => {
    render(<form aria-label="Mã giảm giá">
      <FormField label="Mã" required error="Mã đã tồn tại."><input className={inputClass} /></FormField>
      <FormField label="Loại" hint="Phần trăm hoặc số tiền."><select className={inputClass}><option>Phần trăm</option></select></FormField>
      <FormField label="Mô tả"><textarea className={inputClass} /></FormField>
      <CheckboxField label="Đang bật"><input type="checkbox" /></CheckboxField>
      <button type="submit">Lưu</button>
    </form>);
    const code = screen.getByLabelText("Mã");
    expect(code.getAttribute("aria-invalid")).toBe("true");
    expect(code.getAttribute("aria-required")).toBe("true");
    expect(code.getAttribute("aria-describedby")).toContain("error");
    expect(screen.getByLabelText("Loại").getAttribute("aria-describedby")).toContain("hint");
    expect(await seriousViolations()).toEqual([]);
  });

  it("bảng dữ liệu (có sắp xếp, đang tải, rỗng)", async () => {
    render(<>
      <DataTable columns={[{ header: "Mã", cell: (r: { id: number }) => r.id, sortKey: "id" }, { header: "Tên", cell: () => "A" }]} rows={[{ id: 1 }]} rowKey={(r) => r.id} sort={{ field: "id", direction: "asc" }} onSort={() => {}} />
      <DataTable columns={[{ header: "Mã", cell: () => 1 }]} rows={undefined} rowKey={() => 1} isLoading />
      <DataTable columns={[{ header: "Mã", cell: () => 1 }]} rows={[]} rowKey={() => 1} />
    </>);
    expect(await seriousViolations()).toEqual([]);
  });

  it("toast thành công, lỗi, thông tin", async () => {
    function Fire() {
      const t = useToast();
      useEffect(() => { t.showSuccess("Đã lưu."); t.showError(new Error("Lỗi máy chủ.")); t.showInfo("Đang đồng bộ."); }, []); // eslint-disable-line react-hooks/exhaustive-deps
      return null;
    }
    render(<ToastProvider><Fire /></ToastProvider>);
    await act(async () => {});
    expect(await seriousViolations()).toEqual([]);
  });
});

function DirtyForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  const unsaved = useUnsavedChanges(name);
  useSaveShortcut(ref);
  return (
    <form ref={ref} onSubmit={(e) => { e.preventDefault(); onSave(); unsaved.markClean(); }}>
      {unsaved.prompt}
      <FormField label="Tên"><input value={name} onChange={(e) => setName(e.target.value)} /></FormField>
    </form>
  );
}

describe("FormField v2: cảnh báo rời trang & Ctrl+S", () => {
  it("chặn điều hướng khi còn thay đổi chưa lưu, Ctrl+S lưu", async () => {
    let saved = 0;
    const router = createMemoryRouter([
      { path: "/a", element: <DirtyForm onSave={() => saved++} /> },
      { path: "/b", element: <p>Trang B</p> },
    ], { initialEntries: ["/a"] });
    render(<RouterProvider router={router} />);
    fireEvent.change(screen.getByLabelText("Tên"), { target: { value: "x" } });
    await act(() => router.navigate("/b"));
    expect(screen.getByRole("alertdialog", { name: "Rời trang khi chưa lưu?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ở lại" }));
    expect(screen.getByLabelText("Tên")).toBeTruthy();

    fireEvent.keyDown(document, { key: "s", ctrlKey: true });
    expect(saved).toBe(1);
    await act(() => router.navigate("/b"));
    expect(screen.getByText("Trang B")).toBeTruthy();
  });
});
