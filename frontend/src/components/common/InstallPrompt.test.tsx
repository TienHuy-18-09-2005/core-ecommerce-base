// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InstallPrompt } from "./InstallPrompt.tsx";

describe("InstallPrompt", () => {
  it("hiện banner khi có beforeinstallprompt và gọi prompt()", async () => {
    render(<InstallPrompt />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const e = new Event("beforeinstallprompt") as Event & Record<string, unknown>;
    const prompt = vi.fn(() => Promise.resolve());
    e.prompt = prompt;
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    act(() => void window.dispatchEvent(e));
    expect(screen.getByRole("dialog", { name: "Cài đặt ứng dụng" })).toBeTruthy();
    await act(async () => void fireEvent.click(screen.getByRole("button", { name: "Cài đặt" })));
    expect(prompt).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
