import { describe, expect, it } from "vitest";
import { apiClient } from "./apiClient.ts";

describe("apiClient", () => {
  it("sends the session cookie and the XSRF header", () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.withXSRFToken).toBe(true);
    expect(apiClient.defaults.xsrfCookieName).toBe("XSRF-TOKEN");
    expect(apiClient.defaults.xsrfHeaderName).toBe("X-XSRF-TOKEN");
    expect(apiClient.defaults.baseURL).toBe("/api");
    expect(apiClient.defaults.headers.common["X-Session-ID"]).toBeUndefined();
  });
});
