// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

function BrokenChild({ fail }: { fail: boolean }) {
  if (fail) {
    throw new Error("Lỗi render thử nghiệm");
  }

  return <p>Nội dung đã hồi phục</p>;
}

function Page() {
  const [fail, setFail] = useState(true);

  return (
    <div>
      <p>Khung trang</p>
      <button type="button" onClick={() => setFail(false)}>
        Sửa lỗi
      </button>
      <ErrorBoundary>
        <BrokenChild fail={fail} />
      </ErrorBoundary>
    </div>
  );
}

describe("ErrorBoundary", () => {
  it("renders the fallback when a child throws and keeps the rest of the page", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(<Page />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Không thể hiển thị phần này");
    expect(alert.textContent).toContain("Đã có lỗi khi hiển thị nội dung. Các phần khác của trang vẫn dùng được.");
    expect(screen.getByText("Khung trang")).toBeTruthy();
    expect(screen.queryByText("Nội dung đã hồi phục")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sửa lỗi" }));
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Nội dung đã hồi phục")).toBeTruthy();
    expect(screen.getByText("Khung trang")).toBeTruthy();
  });
});
