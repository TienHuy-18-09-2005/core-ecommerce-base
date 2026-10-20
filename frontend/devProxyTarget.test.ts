import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEV_PROXY_TARGET,
  resolveDevProxyTarget,
} from "./devProxyTarget.ts";

describe("resolveDevProxyTarget", () => {
  it("targets the nginx service inside Docker", () => {
    expect(resolveDevProxyTarget({})).toBe(DEFAULT_DEV_PROXY_TARGET);
    expect(DEFAULT_DEV_PROXY_TARGET).toBe("http://nginx:80");
  });

  it("lets a host env override the Docker default", () => {
    expect(
      resolveDevProxyTarget({ processEnv: "http://localhost:8000" }),
    ).toBe("http://localhost:8000");
  });

  it("prefers the process env over the env file", () => {
    expect(
      resolveDevProxyTarget({
        processEnv: "http://nginx:80",
        fileEnv: "http://localhost:8000",
      }),
    ).toBe("http://nginx:80");
  });

  it("uses the env file when the process env is empty", () => {
    expect(
      resolveDevProxyTarget({
        processEnv: "  ",
        fileEnv: "http://127.0.0.1:8000",
      }),
    ).toBe("http://127.0.0.1:8000");
  });
});
