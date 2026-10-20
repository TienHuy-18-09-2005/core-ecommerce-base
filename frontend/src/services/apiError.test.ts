import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import {
  API_MESSAGES,
  ApiError,
  mapApiError,
  resolveApiBaseUrl,
  shouldAttachCsrf,
} from "./apiError.ts";

function httpError(
  status: number,
  data: unknown,
  headers: Record<string, string> = {},
): AxiosError {
  const error = new AxiosError("request failed");
  error.response = {
    status,
    data,
    statusText: "Error",
    headers,
    config: { headers: new AxiosHeaders() },
  };
  return error;
}

describe("shouldAttachCsrf", () => {
  it("runs before mutating requests only", () => {
    expect(shouldAttachCsrf("post")).toBe(true);
    expect(shouldAttachCsrf("PUT")).toBe(true);
    expect(shouldAttachCsrf("patch")).toBe(true);
    expect(shouldAttachCsrf("delete")).toBe(true);
    expect(shouldAttachCsrf("get")).toBe(false);
    expect(shouldAttachCsrf(undefined)).toBe(false);
  });
});

describe("resolveApiBaseUrl", () => {
  it("keeps the public API path and ignores blank values", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("/api");
    expect(resolveApiBaseUrl("  ")).toBe("/api");
    expect(resolveApiBaseUrl("/api")).toBe("/api");
  });
});

describe("mapApiError", () => {
  it("maps 401 to a Vietnamese session message", () => {
    const error = mapApiError(httpError(401, { message: "Unauthenticated." }));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
    expect(error.code).toBe("UNAUTHENTICATED");
    expect(error.message).toBe(API_MESSAGES.unauthenticated);
    expect(error.message).not.toContain("Unauthenticated");
  });

  it("maps 419 to a CSRF message", () => {
    const error = mapApiError(httpError(419, { message: "CSRF token mismatch." }));

    expect(error.status).toBe(419);
    expect(error.code).toBe("CSRF_MISMATCH");
    expect(error.message).toBe(API_MESSAGES.csrf);
  });

  it("maps 422 and keeps field errors", () => {
    const error = mapApiError(
      httpError(422, {
        message: "The quantity field must be at least 1.",
        errors: { quantity: ["The quantity field must be at least 1."] },
      }),
    );

    expect(error.status).toBe(422);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.message).toBe(API_MESSAGES.validation);
    expect(error.fieldErrors).toEqual({
      quantity: ["The quantity field must be at least 1."],
    });
  });

  it("maps 429 and reads Retry-After", () => {
    const headers = new AxiosHeaders({ "Retry-After": "12" });
    const error = mapApiError(httpError(429, { message: "Too Many Attempts." }, headers));

    expect(error.status).toBe(429);
    expect(error.code).toBe("TOO_MANY_REQUESTS");
    expect(error.retryAfter).toBe(12);
    expect(error.message).toBe("Bạn thao tác quá nhanh. Vui lòng thử lại sau 12 giây.");
  });

  it("hides SQL and stack traces on 5xx", () => {
    const error = mapApiError(
      httpError(500, {
        message: "SQLSTATE[HY000]: select password from users",
        trace: [{ file: "/var/www/backend/vendor/laravel/framework" }],
      }),
    );

    expect(error.status).toBe(500);
    expect(error.code).toBe("SERVER_ERROR");
    expect(error.message).toBe(API_MESSAGES.server);
    expect(error.message).not.toContain("SQLSTATE");
    expect(error.message).not.toContain("password");
  });

  it("keeps a curated domain message", () => {
    const error = mapApiError(
      httpError(400, {
        success: false,
        code: "STOCK_UNAVAILABLE",
        message: "Số lượng sản phẩm trong kho không đủ.",
      }),
    );

    expect(error.status).toBe(400);
    expect(error.code).toBe("STOCK_UNAVAILABLE");
    expect(error.message).toBe("Số lượng sản phẩm trong kho không đủ.");
  });

  it("returns the same ApiError instance", () => {
    const original = new ApiError("Giữ nguyên", { status: 400, code: "KEEP" });
    expect(mapApiError(original)).toBe(original);
  });

  it("maps a network failure", () => {
    const error = mapApiError(new AxiosError("Network Error"));

    expect(error.status).toBe(0);
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.message).toBe(API_MESSAGES.network);
  });
});
