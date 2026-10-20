const pages = {
  "gioi-thieu": {
    title: "Về chúng tôi",
    paragraphs: [
      "Core E-commerce bán thiết bị điện dân dụng và công trình.",
      "Giá, tồn kho và đơn hàng do máy chủ xác nhận.",
    ],
  },
  "chinh-sach-van-chuyen": {
    title: "Chính sách vận chuyển",
    paragraphs: [
      "Đơn nội thành được giao trong 1–3 ngày làm việc sau khi xác nhận.",
      "Phí vận chuyển hiển thị ở bước thanh toán, không tính tạm trên trang chủ.",
    ],
  },
  "chinh-sach-doi-tra": {
    title: "Chính sách đổi trả",
    paragraphs: [
      "Sản phẩm lỗi kỹ thuật được đổi trong 7 ngày nếu còn tem và hóa đơn.",
      "Hàng đã cắt theo mét hoặc đã lắp đặt không áp dụng đổi trả.",
    ],
  },
  "chinh-sach-bao-mat": {
    title: "Chính sách bảo mật",
    paragraphs: [
      "Phiên đăng nhập nằm trong cookie HttpOnly. Trình duyệt không lưu mật khẩu hay token giỏ hàng.",
      "Chúng tôi không đưa nội dung mô tả sản phẩm vào HTML không kiểm soát.",
    ],
  },
} as const;

export type InfoSlug = keyof typeof pages;

export function InfoPage({ slug }: { slug: InfoSlug }) {
  const page = pages[slug];

  return (
    <article className="mx-auto max-w-3xl rounded-2xl bg-white p-8">
      <h1 className="text-2xl font-bold text-slate-900">{page.title}</h1>
      {page.paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-3 text-slate-700">{paragraph}</p>
      ))}
    </article>
  );
}
