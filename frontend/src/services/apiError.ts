import axios from "axios";

export const API_MESSAGES = {
  unauthenticated: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
  csrf: "Phiên làm việc đã hết hạn. Vui lòng thử lại.",
  validation: "Dữ liệu không hợp lệ.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Không tìm thấy dữ liệu.",
  rateLimit: "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
  server: "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
  network: "Không thể kết nối máy chủ. Vui lòng thử lại.",
} as const;

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

export function shouldAttachCsrf(method: string | undefined): boolean {
  return MUTATING_METHODS.has((method ?? "get").toLowerCase());
}

export function resolveApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "/api";
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfter: number | null;

  constructor(
    message: string,
    options: {
      status: number;
      code: string;
      fieldErrors?: Record<string, string[]>;
      retryAfter?: number | null;
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = options.fieldErrors;
    this.retryAfter = options.retryAfter ?? null;
  }
}

export function mapApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return new ApiError(API_MESSAGES.network, {
      status: 0,
      code: "NETWORK_ERROR",
    });
  }

  const status = error.response?.status ?? 0;
  const body = readBody(error.response?.data);
  const fieldErrors = readFieldErrors(body.errors);
  const retryAfter = readRetryAfter(error.response?.headers);

  if (status === 401) {
    return new ApiError(API_MESSAGES.unauthenticated, {
      status,
      code: "UNAUTHENTICATED",
    });
  }

  if (status === 419) {
    return new ApiError(API_MESSAGES.csrf, {
      status,
      code: "CSRF_MISMATCH",
    });
  }

  if (status === 422) {
    // Lỗi nghiệp vụ 422 (vd. COUPON_INVALID, STOCK_UNAVAILABLE) giữ code + message an toàn của server
    const domainCode = readCode(body.code);
    const domainMessage = safeServerMessage(body.message);
    if (domainCode && domainCode !== "VALIDATION_ERROR" && domainMessage) {
      return new ApiError(domainMessage, { status, code: domainCode, fieldErrors });
    }

    return new ApiError(API_MESSAGES.validation, {
      status,
      code: "VALIDATION_ERROR",
      fieldErrors,
    });
  }

  if (status === 429) {
    return new ApiError(rateLimitMessage(retryAfter), {
      status,
      code: "TOO_MANY_REQUESTS",
      retryAfter,
    });
  }

  if (status >= 500) {
    return new ApiError(API_MESSAGES.server, {
      status,
      code: "SERVER_ERROR",
    });
  }

  if (status === 403) {
    return new ApiError(API_MESSAGES.forbidden, {
      status,
      code: readCode(body.code) ?? "FORBIDDEN",
    });
  }

  if (status === 404) {
    return new ApiError(safeServerMessage(body.message) ?? API_MESSAGES.notFound, {
      status,
      code: readCode(body.code) ?? "NOT_FOUND",
    });
  }

  const safeMessage = safeServerMessage(body.message);
  if (status >= 400 && safeMessage) {
    return new ApiError(safeMessage, {
      status,
      code: readCode(body.code) ?? "REQUEST_FAILED",
      fieldErrors,
    });
  }

  return new ApiError(API_MESSAGES.network, {
    status,
    code: "NETWORK_ERROR",
  });
}

function rateLimitMessage(retryAfter: number | null): string {
  if (retryAfter !== null && retryAfter > 0) {
    return `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.`;
  }

  return API_MESSAGES.rateLimit;
}

function readBody(data: unknown): {
  message?: unknown;
  code?: unknown;
  errors?: unknown;
} {
  if (data && typeof data === "object") {
    return data;
  }

  return {};
}

function readCode(code: unknown): string | undefined {
  return typeof code === "string" && code.trim() !== "" ? code : undefined;
}

function readFieldErrors(errors: unknown): Record<string, string[]> | undefined {
  if (!errors || typeof errors !== "object") {
    return undefined;
  }

  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (typeof value === "string" && value.trim() !== "") {
      result[key] = [value];
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    const messages = value.filter(
      (item): item is string => typeof item === "string" && item.trim() !== "",
    );
    if (messages.length > 0) {
      result[key] = messages;
    }
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function readRetryAfter(headers: unknown): number | null {
  if (!headers || typeof headers !== "object") {
    return null;
  }

  const raw =
    "get" in headers && typeof headers.get === "function"
      ? headers.get("retry-after")
      : (headers as Record<string, unknown>)["retry-after"];

  const value = Array.isArray(raw) ? raw[0] : raw;
  const seconds = typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return Math.ceil(seconds);
}

function safeServerMessage(message: unknown): string | undefined {
  if (typeof message !== "string") {
    return undefined;
  }

  const trimmed = message.trim();
  if (trimmed === "" || containsSensitiveDetail(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function containsSensitiveDetail(message: string): boolean {
  return /SQLSTATE|SQL syntax|stack trace|vendor\/|\/var\/www|Base table or view not found/i.test(
    message,
  );
}
