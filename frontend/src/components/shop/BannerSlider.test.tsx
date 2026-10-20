// @vitest-environment happy-dom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BannerSlider } from "./BannerSlider.tsx";

describe("BannerSlider", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("pauses autoplay while the pointer is over the banner", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <BannerSlider />
      </MemoryRouter>,
    );

    const region = screen.getByRole("region", { name: "Khuyến mãi" });
    fireEvent.mouseEnter(region);
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByRole("heading", { name: "Đèn LED Panel Rạng Đông" })).toBeTruthy();
  });

  it("pauses autoplay while a control inside the banner has focus", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <BannerSlider />
      </MemoryRouter>,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Ảnh sau" }));
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(screen.getByRole("heading", { name: "Đèn LED Panel Rạng Đông" })).toBeTruthy();
  });

  it("advances when nothing is hovering or focused", () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <BannerSlider />
      </MemoryRouter>,
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByRole("heading", { name: "Thiết bị đóng cắt" })).toBeTruthy();
  });
});
