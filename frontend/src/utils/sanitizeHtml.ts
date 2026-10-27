const BLOCKED = "script,style,iframe,object,embed,form,input,button,textarea,select,link,meta,base,svg,math";

/**
 * Lớp phòng thủ thứ hai khi hiển thị mô tả HTML trong trang quản trị (máy chủ đã lọc khi lưu):
 * bỏ thẻ nguy hiểm, thuộc tính on*, style và đường dẫn javascript:/data:.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.body.querySelectorAll(BLOCKED).forEach((el) => el.remove());
  doc.body.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase().replace(/\s+/g, "");
      if (name.startsWith("on") || name === "style" || name === "srcdoc") el.removeAttribute(attr.name);
      else if (["href", "src", "xlink:href", "action", "formaction"].includes(name) && /^(javascript|vbscript|data):/.test(value)) el.removeAttribute(attr.name);
    }
    if (el.tagName === "IMG" && !el.hasAttribute("alt")) el.setAttribute("alt", "");
    if (el.tagName === "A") { el.setAttribute("rel", "noopener noreferrer nofollow"); el.setAttribute("target", "_blank"); }
  });
  return doc.body.innerHTML;
}
