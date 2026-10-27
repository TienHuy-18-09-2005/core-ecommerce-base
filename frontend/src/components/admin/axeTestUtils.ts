import axe from "axe-core";

/** Chạy axe trên toàn document; chỉ trả về lỗi mức serious/critical. color-contrast cần layout thật nên tắt trong happy-dom. */
export async function seriousViolations() {
  const res = await axe.run(document.body, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return res.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}
