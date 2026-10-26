// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { RouteError } from "./RouteError.tsx";
import { isChunkLoadError } from "../utils/chunkError.ts";

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

  it("offers a reload when a lazy chunk failed to load", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Chunk(): never {
      throw new TypeError("Failed to fetch dynamically imported module: /assets/ProductList-abc.js");
    }
    render(<ErrorBoundary><Chunk /></ErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toContain("Đã có phiên bản mới");
    expect(screen.getByRole("button", { name: "Tải lại trang" })).toBeTruthy();
  });

  it("route errors render the Vietnamese route error screen instead of React Router's default", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Boom(): never {
      throw new Error("hỏng");
    }
    const router = createMemoryRouter([{ path: "/", element: <Boom />, errorElement: <RouteError /> }]);
    render(<RouterProvider router={router} />);
    expect((await screen.findByRole("alert")).textContent).toContain("Đã có lỗi xảy ra");
    expect(screen.getByRole("link", { name: "Về trang chủ" })).toBeTruthy();
  });

  it("detects chunk load errors across browsers", () => {
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("error loading dynamically imported module"))).toBe(true);
    expect(isChunkLoadError(new Error("x is undefined"))).toBe(false);
  });
});
