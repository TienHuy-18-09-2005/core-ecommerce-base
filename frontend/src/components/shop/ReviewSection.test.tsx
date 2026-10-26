// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextValue } from "../../app/useAuth.ts";
import { ToastProvider } from "../../app/Toast.tsx";
import { ApiError } from "../../services/apiError.ts";
import { reviewService } from "../../services/reviewService.ts";
import type { Review, ReviewListResponse } from "../../types/review.ts";
import type { User } from "../../types/auth.ts";
import { ReviewSection } from "./ReviewSection.tsx";

vi.mock("../../services/reviewService.ts", async (orig) => ({
  ...(await orig<typeof import("../../services/reviewService.ts")>()),
  reviewService: { list: vi.fn(), eligibility: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const review = (over: Partial<Review> = {}): Review => ({
  id: 1, rating: 5, comment: "<img src=x onerror=alert(1)> Rất sáng", images: ["/storage/reviews/2026/10/abc.jpg", "javascript:alert(1)"],
  author_name: "N. V. An", verified_purchase: true, created_at: "2026-10-20T03:00:00+00:00", updated_at: null, ...over,
});

const listing = (reviews: Review[] = [review()]): ReviewListResponse => ({
  summary: { average: 4.5, count: 2, distribution: { "5": 1, "4": 1, "3": 0, "2": 0, "1": 0 } },
  reviews: { data: reviews, current_page: 1, last_page: 1, total: reviews.length },
});

const user: User = { id: 7, name: "Khách", email: "k@example.com", phone: null, role: "customer", avatar_url: null, email_verified: true };

function setup(currentUser: User | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const auth = { user: currentUser, isLoading: false } as AuthContextValue;
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={["/san-pham/den"]}><ReviewSection slug="den" /></MemoryRouter>
        </AuthContext.Provider>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

describe("ReviewSection", () => {
  beforeEach(() => {
    vi.mocked(reviewService.list).mockReset().mockResolvedValue(listing());
    vi.mocked(reviewService.eligibility).mockReset();
    vi.mocked(reviewService.create).mockReset();
  });

  it("shows the distribution, renders comments as plain text and drops unsafe image urls", async () => {
    setup();
    expect(await screen.findByText(/<img src=x onerror=alert\(1\)> Rất sáng/)).toBeTruthy();
    expect(document.querySelector("img[src='x']")).toBeNull();
    const dist = screen.getByRole("list", { name: "Phân bổ số sao" });
    expect(within(dist).getByRole("button", { name: "5 sao: 1 đánh giá" })).toBeTruthy();
    expect(within(dist).getByRole("button", { name: "3 sao: 0 đánh giá" }).hasAttribute("disabled")).toBe(true);
    const imgs = screen.getAllByRole("img", { name: /Ảnh đánh giá/ });
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute("src")).toBe("/storage/reviews/2026/10/abc.jpg");
    expect(screen.getByText("Đã mua hàng")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Đăng nhập" }).getAttribute("href")).toBe("/dang-nhap?redirect=%2Fsan-pham%2Fden");
  });

  it("filters by star when a distribution row is clicked", async () => {
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "4 sao: 1 đánh giá" }));
    await waitFor(() => expect(reviewService.list).toHaveBeenLastCalledWith("den", { page: 1, rating: 4 }, expect.any(AbortSignal)));
  });

  it("tells logged-in non-buyers they cannot review", async () => {
    vi.mocked(reviewService.eligibility).mockResolvedValue({ can_review: false, reason: "REVIEW_NOT_PURCHASED", review: null });
    setup(user);
    expect(await screen.findByText("Chỉ khách đã mua và nhận sản phẩm này mới có thể đánh giá.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Viết đánh giá" })).toBeNull();
  });

  it("lets a buyer submit; requires a star and shows server field errors in Vietnamese", async () => {
    vi.mocked(reviewService.eligibility).mockResolvedValue({ can_review: true, reason: null, review: null });
    vi.mocked(reviewService.create).mockRejectedValueOnce(
      new ApiError("Dữ liệu không hợp lệ.", { status: 422, code: "VALIDATION_ERROR", fieldErrors: { "images.0": ["Ảnh phải là tệp loại: jpg, jpeg, png, webp."] } }),
    );
    setup(user);
    fireEvent.click(await screen.findByRole("button", { name: "Viết đánh giá" }));
    const form = screen.getByRole("form", { name: "Viết đánh giá" });

    fireEvent.click(within(form).getByRole("button", { name: "Gửi đánh giá" }));
    expect(await within(form).findByText("Vui lòng chọn số sao.")).toBeTruthy();
    expect(reviewService.create).not.toHaveBeenCalled();

    // SVG bị chặn ngay phía client
    const input = within(form).getByLabelText(/Ảnh thực tế/) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["<svg/>"], "x.svg", { type: "image/svg+xml" })] } });
    expect(await within(form).findByText(/Chỉ nhận JPEG, PNG hoặc WebP/)).toBeTruthy();

    fireEvent.click(within(form).getByRole("radio", { name: /4 sao/ }));
    fireEvent.change(within(form).getByLabelText(/Nhận xét/), { target: { value: "  Tốt  " } });
    fireEvent.click(within(form).getByRole("button", { name: "Gửi đánh giá" }));
    expect(await within(form).findByText("Ảnh phải là tệp loại: jpg, jpeg, png, webp.")).toBeTruthy();

    vi.mocked(reviewService.create).mockResolvedValueOnce(review({ id: 9, rating: 4, comment: "Tốt" }));
    fireEvent.click(within(form).getByRole("button", { name: "Gửi đánh giá" }));
    await waitFor(() => expect(reviewService.create).toHaveBeenLastCalledWith("den", { rating: 4, comment: "Tốt", images: [], keepImages: [] }));
    expect(await screen.findByText("Cảm ơn bạn đã đánh giá sản phẩm.")).toBeTruthy();
  });

  it("shows the user's own review with edit and delete", async () => {
    vi.mocked(reviewService.eligibility).mockResolvedValue({ can_review: false, reason: "REVIEW_ALREADY_EXISTS", review: review({ id: 3, comment: "Của tôi", images: [] }) });
    setup(user);
    expect(await screen.findByText("Đánh giá của bạn")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
    expect(screen.getByRole("form", { name: "Sửa đánh giá" })).toBeTruthy();
    expect((screen.getByLabelText(/Nhận xét/) as HTMLTextAreaElement).value).toBe("Của tôi");
  });
});
