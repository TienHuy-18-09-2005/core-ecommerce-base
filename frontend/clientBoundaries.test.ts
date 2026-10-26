import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

function sourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules" || entry === "dist") {
      continue;
    }

    const fullPath = path.join(directory, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...sourceFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

// Trong container ecom_frontend chỉ mount ./frontend nên không thấy docker-compose.yml ở thư mục gốc → bỏ qua test đó.
const composePath = path.resolve(frontendRoot, "../docker-compose.yml");
const hasCompose = existsSync(composePath);

describe("frontend client boundaries", () => {
  it("does not store auth or the cart in the browser, or send a session header", () => {
    // Ngoại lệ duy nhất: utils/theme.ts lưu lựa chọn giao diện (sáng/tối), không phải dữ liệu nhạy cảm.
    const themeFile = path.join(frontendRoot, "src/utils/theme.ts");
    const source = sourceFiles(path.join(frontendRoot, "src"))
      .filter((file) => file !== themeFile)
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    expect(source).not.toMatch(/localStorage/);
    const theme = readFileSync(themeFile, "utf8");
    expect([...theme.matchAll(/localStorage\.(\w+)\(([^,)]*)/g)].map((m) => `${m[1]}(${m[2]})`).sort()).toEqual(
      ["getItem(THEME_KEY)", "removeItem(THEME_KEY)", "setItem(THEME_KEY)"],
    );
    expect(source).not.toMatch(/sessionStorage/);
    expect(source).not.toMatch(/X-Session-ID/);
  });

  it("index.html applies the saved theme before CSS/React (no flash)", () => {
    const html = readFileSync(path.join(frontendRoot, "index.html"), "utf8");
    const head = html.slice(0, html.indexOf("</head>"));
    const inline = head.indexOf('localStorage.getItem("theme")');
    expect(inline).toBeGreaterThan(-1);
    expect(inline).toBeLessThan(head.indexOf("stylesheet"));
    expect(head).toContain("prefers-color-scheme: dark");
  });

  it("does not put secrets in VITE_ variables", () => {
    const files = [
      ...sourceFiles(path.join(frontendRoot, "src")),
      path.join(frontendRoot, "vite.config.ts"),
      path.join(frontendRoot, ".env.example"),
    ];
    const source = files.map((file) => readFileSync(file, "utf8")).join("\n");

    expect(source).not.toMatch(/VITE_[A-Z0-9_]*(PASSWORD|SECRET|TOKEN|KEY)/);
  });

  it.skipIf(!hasCompose)("installs dependencies with npm ci and proxies through nginx by default", () => {
    const compose = readFileSync(composePath, "utf8");

    expect(compose).toContain("image: node:22-alpine");
    expect(compose).toContain('command: sh -c "npm ci && npm run dev -- --host"');
    expect(compose).toContain("DEV_PROXY_TARGET: ${DEV_PROXY_TARGET:-http://nginx:80}");
    expect(compose).toContain("NODE_OPTIONS: --dns-result-order=ipv4first");
    expect(compose).toContain("frontend_node_modules:/var/www/frontend/node_modules");
    expect(compose).not.toContain("npm install");

    const vite = readFileSync(path.join(frontendRoot, "vite.config.ts"), "utf8");
    expect(vite).toContain('cookieDomainRewrite: ""');
    expect(vite).toContain("changeOrigin: false");
  });
});
