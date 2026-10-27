// @vitest-environment happy-dom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../../app/Toast.tsx";
import { useToast } from "../../app/useToast.ts";
import { Badge, OrderStatusBadge, PaymentStatusBadge, ReviewStatusBadge } from "./Badge.tsx";
import { EmptyState, ErrorState, SkeletonBlock } from "./feedback.tsx";
import { Drawer } from "./overlay/Drawer.tsx";
import { ConfirmProvider, Modal, useConfirm } from "./overlay/Modal.tsx";

afterEach(() => vi.useRealTimers());

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Mở</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tiêu đề" footer={<button type="button">Lưu</button>}><input aria-label="Tên" /></Modal>
    </>
  );
}

describe("Modal", () => {
  it("traps focus, closes on ESC, locks scroll and returns focus", () => {
    render(<ModalHarness />);
    const opener = screen.getByRole("button", { name: "Mở" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Tiêu đề" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    const close = within(dialog).getByRole("button", { name: "Đóng" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Lưu" }));
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener);
  });
});

function ConfirmHarness({ onResult }: { onResult: (v: boolean) => void }) {
  const confirm = useConfirm();
  return <button type="button" onClick={async () => onResult(await confirm({ title: "Xóa mục?", message: "Không hoàn tác được.", confirmLabel: "Xóa", danger: true }))}>Xóa ngay</button>;
}

describe("ConfirmModal", () => {
  it("resolves true on confirm, false on cancel/ESC, focuses cancel for danger", async () => {
    const onResult = vi.fn();
    render(<ConfirmProvider><ConfirmHarness onResult={onResult} /></ConfirmProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Xóa ngay" }));
    let dialog = await screen.findByRole("alertdialog", { name: "Xóa mục?" });
    expect(document.activeElement?.textContent).toBe("Hủy bỏ");
    expect(within(dialog).getByRole("button", { name: "Xóa" }).className).toContain("bg-admin-danger");
    await act(async () => { fireEvent.click(within(dialog).getByRole("button", { name: "Xóa" })); });
    expect(onResult).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Xóa ngay" }));
    dialog = await screen.findByRole("alertdialog");
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    expect(onResult).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});

describe("Drawer", () => {
  it("is a labelled modal dialog that closes on ESC", () => {
    const onClose = vi.fn();
    render(<Drawer open onClose={onClose} title="Bộ lọc"><button type="button">Áp dụng</button></Drawer>);
    expect(screen.getByRole("dialog", { name: "Bộ lọc" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

function ToastHarness() {
  const t = useToast();
  return (
    <>
      <button type="button" onClick={() => t.showSuccess("Đã lưu.")}>ok</button>
      <button type="button" onClick={() => t.showInfo("Có đơn mới.")}>info</button>
      <button type="button" onClick={() => t.showError(new Error("x"))}>err</button>
    </>
  );
}

describe("Toast", () => {
  it("announces success/info politely, errors assertively, and auto-dismisses", () => {
    vi.useFakeTimers();
    render(<ToastProvider><ToastHarness /></ToastProvider>);
    fireEvent.click(screen.getByText("ok"));
    fireEvent.click(screen.getByText("info"));
    fireEvent.click(screen.getByText("err"));
    const statuses = screen.getAllByRole("status");
    expect(statuses.map((s) => s.getAttribute("data-kind"))).toEqual(["success", "info"]);
    expect(statuses[0].closest("[aria-live]")?.getAttribute("aria-live")).toBe("polite");
    expect(screen.getByRole("alert").closest("[aria-live]")?.getAttribute("aria-live")).toBe("assertive");
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByText("Đã lưu.")).toBeNull();
    expect(screen.getByRole("alert")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("feedback & badges", () => {
  it("ErrorState retries via callback", () => {
    const retry = vi.fn();
    render(<ErrorState error={new Error("x")} onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders skeleton status and empty state", () => {
    render(<><SkeletonBlock label="Đang tải đơn..." /><EmptyState title="Chưa có dữ liệu." description="Thêm mới để bắt đầu." /></>);
    expect(screen.getByRole("status").textContent).toContain("Đang tải đơn...");
    expect(screen.getByText("Chưa có dữ liệu.")).toBeTruthy();
  });

  it("maps statuses to tokens and Vietnamese labels", () => {
    render(<><OrderStatusBadge status="cancelled" /><PaymentStatusBadge status="paid" /><ReviewStatusBadge approved={false} /><Badge tone="pending">Chờ</Badge></>);
    expect(screen.getByText("Đã thanh toán").getAttribute("data-tone")).toBe("success");
    expect(screen.getByText("Đang ẩn").getAttribute("data-tone")).toBe("neutral");
    expect(screen.getByText("Chờ").className).toContain("bg-admin-status-pending-bg");
    expect(document.querySelector('[data-tone="danger"]')?.className).toContain("text-admin-status-danger-fg");
  });
});
