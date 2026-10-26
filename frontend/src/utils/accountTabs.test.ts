import { describe, expect, it } from "vitest";
import { ACCOUNT_TABS, accountTabPath } from "./accountTabs.ts";

describe("accountTabs", () => {
  it("builds links that match the tab ids the account page reads", () => {
    expect(accountTabPath("don-hang")).toBe("/tai-khoan?tab=don-hang");
    const tab = new URLSearchParams(accountTabPath("don-hang").split("?")[1]).get("tab");
    expect(ACCOUNT_TABS.map((t) => t.id)).toContain(tab);
  });
});
