import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Copy, ImageOff, Pencil, Star, Trash2 } from "lucide-react";
import { PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { Badge, ProductStatusBadge, ReviewStatusBadge } from "../../components/admin/Badge.tsx";
import { EmptyState, ErrorState, SkeletonBlock } from "../../components/admin/feedback.tsx";
import { useConfirm } from "../../components/admin/overlay/Modal.tsx";
import { useToast } from "../../app/useToast.ts";
import { useModalParam } from "../../hooks/useModalParam.ts";
import { useAdminCategoriesQuery, useAdminProductHistoryQuery, useAdminProductQuery, useProductMutations } from "../../hooks/useAdminQuery.ts";
import { adminService } from "../../services/adminService.ts";
import { productService } from "../../services/productService.ts";
import type { AdminProduct, ProductHistoryEntry } from "../../types/admin.ts";
import { btnPrimary, btnSecondary, formatDateTime } from "../../utils/adminFormat.ts";
import { formatCurrency } from "../../utils/formatCurrency.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";
import { sanitizeHtml } from "../../utils/sanitizeHtml.ts";
import { ProductFormModal } from "./ProductFormModal.tsx";

const LOW_STOCK = 5;
const card = "rounded-xl border border-admin-border bg-admin-surface p-5";
const btnDangerOutline = "inline-flex items-center gap-1.5 rounded-lg border border-admin-danger-border bg-admin-surface px-4 py-2 text-sm font-medium text-admin-danger hover:bg-admin-danger-subtle disabled:opacity-50";

const ACTION_LABELS: Record<string, string> = {
  "product.created": "Tạo sản phẩm",
  "product.updated": "Cập nhật sản phẩm",
  "product.duplicated": "Tạo từ bản nhân bản",
  "product.deleted": "Xóa sản phẩm",
  "product.image_added": "Thêm ảnh",
  "product.image_removed": "Xóa ảnh",
  "product.images_reordered": "Sắp xếp lại ảnh",
};
const FIELD_LABELS: Record<string, string> = {
  name: "tên", slug: "đường dẫn", status: "trạng thái", is_featured: "nổi bật", brand_id: "thương hiệu", category_ids: "danh mục", categories: "danh mục",
  short_description: "mô tả ngắn", description: "mô tả", unit: "đơn vị", specifications: "thông số", meta_title: "tiêu đề SEO", meta_description: "mô tả SEO",
  variants: "biến thể", category_added: "gán danh mục", order: "thứ tự ảnh", primary_id: "ảnh chính", media_id: "ảnh", from: "nguồn",
};

/**
 * TODO(R6): khi có useCan(), ẩn Sửa/Nhân bản khi thiếu products.edit và Xóa khi thiếu products.delete.
 * Hiện mọi tài khoản admin đều có đủ quyền nên luôn trả về true.
 */
function useProductPermissions() {
  return { canEdit: true, canDelete: true };
}

function summarize(entry: ProductHistoryEntry): string | null {
  const c = entry.changes;
  if (!c || typeof c !== "object") return null;
  const keys = Object.keys(c).filter((k) => k !== "bulk" && k !== "path" && k !== "url");
  if (["product.created", "product.deleted", "product.image_added", "product.image_removed", "product.images_reordered"].includes(entry.action)) return null;
  if (entry.action === "product.duplicated" && typeof c.from === "number") return `Nhân bản từ sản phẩm #${c.from}`;
  if (keys.length === 0) return null;
  const status = c.status as unknown;
  const statusText = status && typeof status === "object"
    ? (() => { const v = Array.isArray(status) ? status : [(status as { from?: string }).from, (status as { to?: string }).to]; return `trạng thái: ${v[0] ?? "—"} → ${v[1] ?? "—"}`; })()
    : null;
  const rest = keys.filter((k) => k !== "status").map((k) => FIELD_LABELS[k] ?? k);
  return [statusText, rest.length ? `Đổi ${rest.join(", ")}` : null].filter(Boolean).join(" · ") + (c.bulk ? " (thao tác hàng loạt)" : "");
}

function Gallery({ product }: { product: AdminProduct }) {
  const media = [...product.media].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
  const [active, setActive] = useState(0);
  if (media.length === 0) {
    return <div className={`${card} flex aspect-square items-center justify-center`}><EmptyState title="Chưa có ảnh" icon={<ImageOff className="size-6" />} /></div>;
  }
  const current = media[Math.min(active, media.length - 1)];
  return (
    <section aria-label="Ảnh sản phẩm" className={card}>
      <img src={safeImageUrl(current.url) ?? "/product-fallback.svg"} alt={current.alt_text || product.name} className="aspect-square w-full rounded-lg bg-admin-subtle object-contain" />
      {media.length > 1 && (
        <ul className="mt-3 grid grid-cols-5 gap-2">
          {media.map((m, i) => (
            <li key={m.id}>
              <button type="button" aria-label={`Xem ảnh ${i + 1}${m.is_primary ? " (ảnh chính)" : ""}`} aria-pressed={i === active} onClick={() => setActive(i)}
                className={`block w-full overflow-hidden rounded-md border-2 ${i === active ? "border-admin-primary" : "border-transparent hover:border-admin-border"}`}>
                <img src={safeImageUrl(m.url) ?? "/product-fallback.svg"} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Reviews({ productId }: { productId: number }) {
  const q = useQuery({ queryKey: ["admin", "reviews", { product_id: productId, per_page: 5 }], queryFn: ({ signal }) => adminService.reviews({ product_id: String(productId), per_page: "5", sort: "-created_at" }, signal) });
  return (
    <section aria-labelledby="rv-h" className={card}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="rv-h" className="font-semibold">Đánh giá gần đây</h2>
        {(q.data?.meta.total ?? 0) > 0 && <span className="text-sm text-admin-muted">{q.data?.meta.total} đánh giá</span>}
      </div>
      {q.isLoading ? <SkeletonBlock lines={2} label="Đang tải đánh giá..." className="border-0 p-0" />
        : q.error ? <ErrorState compact error={q.error} onRetry={q.refetch} retrying={q.isRefetching} />
        : !q.data?.data.length ? <EmptyState title="Chưa có đánh giá" />
        : (
          <ul className="divide-y divide-admin-border">
            {q.data.data.map((r) => (
              <li key={r.id} className="py-3 text-sm first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-0.5 text-amber-500" role="img" aria-label={`${r.rating} trên 5 sao`}>
                    {Array.from({ length: 5 }, (_, i) => <Star key={i} aria-hidden className={`size-3.5 ${i < r.rating ? "fill-current" : "opacity-30"}`} />)}
                  </span>
                  <span className="font-medium">{r.user?.name ?? "Khách"}</span>
                  <ReviewStatusBadge approved={r.is_approved} />
                  <span className="text-xs text-admin-muted">{r.created_at ? formatDateTime(r.created_at) : ""}</span>
                </div>
                {r.comment && <p className="mt-1 whitespace-pre-line text-admin-fg-soft">{r.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      {(q.data?.meta.total ?? 0) > 0 && <Link to="/admin/danh-gia" className="mt-2 inline-block text-sm text-admin-primary hover:underline">Quản lý đánh giá</Link>}
    </section>
  );
}

function History({ productId }: { productId: number }) {
  const q = useAdminProductHistoryQuery(productId);
  return (
    <section aria-labelledby="hs-h" className={card}>
      <h2 id="hs-h" className="mb-3 font-semibold">Lịch sử thay đổi</h2>
      {q.isLoading ? <SkeletonBlock lines={3} label="Đang tải lịch sử..." className="border-0 p-0" />
        : q.error ? <ErrorState compact error={q.error} onRetry={q.refetch} retrying={q.isRefetching} />
        : !q.data?.length ? <EmptyState title="Chưa có lịch sử thay đổi" />
        : (
          <ol className="space-y-3 border-l border-admin-border pl-4 text-sm">
            {q.data.map((h) => {
              const detail = summarize(h);
              return (
                <li key={h.id} className="relative">
                  <span aria-hidden className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-admin-primary" />
                  <p className="font-medium">{ACTION_LABELS[h.action] ?? h.action}</p>
                  {detail && <p className="text-admin-fg-soft">{detail}</p>}
                  <p className="text-xs text-admin-muted">{h.user?.name ?? "Hệ thống"} · {h.created_at ? formatDateTime(h.created_at) : "—"}</p>
                </li>
              );
            })}
          </ol>
        )}
    </section>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><dt className="text-xs uppercase tracking-wide text-admin-muted">{label}</dt><dd className="mt-0.5 text-sm">{children}</dd></div>;
}

export default function ProductDetailPage() {
  const raw = useParams().id ?? "";
  const id = /^\d+$/.test(raw) ? Number(raw) : null;
  const { data: product, error, isLoading, refetch, isRefetching } = useAdminProductQuery(id);
  const categories = useAdminCategoriesQuery();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => productService.getBrands() });
  const modal = useModalParam();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { remove, duplicate } = useProductMutations();
  const { canEdit, canDelete } = useProductPermissions();

  if (id === null) return <EmptyState title="Không tìm thấy sản phẩm" action={<Link to="/admin/san-pham" className={btnSecondary}>Về danh sách</Link>} />;
  if (isLoading) {
    return <div className="grid gap-6 lg:grid-cols-3"><SkeletonBlock lines={8} label="Đang tải sản phẩm..." /><SkeletonBlock lines={8} label="" className="lg:col-span-2" /></div>;
  }
  if (error || !product) return <QueryError error={error ?? true} onRetry={refetch} retrying={isRefetching} />;

  const catNames = product.category_ids.map((cid) => categories.data?.find((c) => c.id === cid)?.name).filter(Boolean) as string[];
  const brand = brands.data?.find((b) => b.id === product.brand_id)?.name;
  const prices = product.variants.map((v) => v.price);
  const minP = prices.length ? Math.min(...prices) : null;
  const maxP = prices.length ? Math.max(...prices) : null;
  const stock = product.variants.reduce((s, v) => s + v.stock_quantity, 0);
  const specs = Object.entries(product.specifications ?? {});
  const description = sanitizeHtml(product.description);

  const onDuplicate = () => duplicate.mutate(product.id, {
    onSuccess: (copy) => { toast.showSuccess(`Đã nhân bản "${product.name}" thành bản nháp.`); navigate(`/admin/san-pham/${copy.id}?sua=${copy.id}`); },
    onError: toast.showError,
  });
  const onDelete = async () => {
    if (!(await confirm({ title: "Xóa sản phẩm?", message: `Sản phẩm "${product.name}" sẽ bị xóa. Đơn hàng cũ vẫn giữ nguyên thông tin.`, confirmLabel: "Xóa", danger: true }))) return;
    remove.mutate(product.id, { onSuccess: () => { toast.showSuccess("Đã xóa sản phẩm."); navigate("/admin/san-pham", { replace: true }); }, onError: toast.showError });
  };

  return (
    <>
      <PageHeader title={product.name} actions={<div className="flex flex-wrap items-center gap-2">
        <Link to="/admin/san-pham" className={btnSecondary}>Quay lại</Link>
        {canDelete && <button type="button" className={btnDangerOutline} disabled={remove.isPending} onClick={() => void onDelete()}><Trash2 aria-hidden className="size-4" />{remove.isPending ? "Đang xóa..." : "Xóa"}</button>}
        {canEdit && <button type="button" className={`${btnSecondary} inline-flex items-center gap-1.5`} disabled={duplicate.isPending} onClick={onDuplicate}><Copy aria-hidden className="size-4" />Nhân bản</button>}
        {canEdit && <button type="button" className={`${btnPrimary} inline-flex items-center gap-1.5`} onClick={() => modal.openEdit(product.id)}><Pencil aria-hidden className="size-4" />Sửa</button>}
      </div>} />
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,1fr)_2fr]">
        <div className="space-y-6">
          <Gallery product={product} />
          <section aria-labelledby="seo-h" className={card}>
            <h2 id="seo-h" className="mb-3 font-semibold">SEO</h2>
            <dl className="space-y-3">
              <Info label="Đường dẫn"><span className="break-all font-mono text-xs">/san-pham/{product.slug}</span></Info>
              <Info label="Tiêu đề SEO">{product.meta_title || <span className="text-admin-muted">Dùng tên sản phẩm</span>}</Info>
              <Info label="Mô tả SEO">{product.meta_description || <span className="text-admin-muted">Chưa có</span>}</Info>
            </dl>
          </section>
        </div>
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="ov-h" className={card}>
            <h2 id="ov-h" className="sr-only">Tổng quan</h2>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <ProductStatusBadge status={product.status} />
              {product.is_featured && <Badge tone="confirmed">Nổi bật</Badge>}
              <span className="text-sm text-admin-muted">Cập nhật {product.updated_at ? formatDateTime(product.updated_at) : "—"}</span>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              <Info label="Giá bán"><span className="whitespace-nowrap text-base font-semibold">{minP === null ? "—" : minP === maxP ? formatCurrency(minP) : `${formatCurrency(minP)} – ${formatCurrency(maxP as number)}`}</span></Info>
              <Info label="Tổng tồn kho"><span className={stock <= LOW_STOCK ? "font-semibold text-admin-danger" : "text-base font-semibold"}>{stock} {product.unit ?? ""}</span></Info>
              <Info label="Danh mục">{catNames.length ? catNames.join(", ") : <span className="text-admin-muted">Chưa phân loại</span>}</Info>
              <Info label="Thương hiệu">{brand ?? <span className="text-admin-muted">—</span>}</Info>
              <Info label="SKU"><span className="break-all font-mono text-xs">{product.variants.map((v) => v.sku).join(", ") || "—"}</span></Info>
              <Info label="Tạo lúc">{product.created_at ? formatDateTime(product.created_at) : "—"}</Info>
            </dl>
            {product.short_description && <p className="mt-4 border-t border-admin-border pt-4 text-sm text-admin-fg-soft">{product.short_description}</p>}
          </section>

          <section aria-labelledby="vr-h" className={card}>
            <h2 id="vr-h" className="mb-3 font-semibold">Biến thể ({product.variants.length})</h2>
            {product.variants.length === 0 ? <EmptyState title="Chưa có biến thể" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-admin-muted">
                    <tr><th className="py-2 pr-3 font-medium">SKU</th><th className="py-2 pr-3 font-medium">Tên</th><th className="py-2 pr-3 text-right font-medium">Giá</th><th className="py-2 pr-3 text-right font-medium">Giá gốc</th><th className="py-2 pr-3 text-right font-medium">Tồn kho</th><th className="py-2 font-medium">Trạng thái</th></tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {product.variants.map((v) => {
                      const low = v.stock_quantity <= LOW_STOCK;
                      return (
                        <tr key={v.id ?? v.sku} className={low ? "bg-admin-danger-subtle/50" : ""}>
                          <td className="py-2 pr-3 font-mono text-xs break-all">{v.sku}{v.is_default && <span className="ml-1 font-sans text-admin-muted">(mặc định)</span>}</td>
                          <td className="py-2 pr-3">{v.name}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right">{formatCurrency(v.price)}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-right text-admin-muted">{v.compare_at_price ? formatCurrency(v.compare_at_price) : "—"}</td>
                          <td className={`py-2 pr-3 text-right ${low ? "font-semibold text-admin-danger" : ""}`}>{v.stock_quantity}{low && <span className="sr-only"> (sắp hết)</span>}</td>
                          <td className="py-2">{v.is_active ? <Badge tone="success">Đang bán</Badge> : <Badge>Tạm ẩn</Badge>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section aria-labelledby="ds-h" className={card}>
            <h2 id="ds-h" className="mb-3 font-semibold">Mô tả</h2>
            {description ? <div className="rich-prose max-w-none text-sm text-admin-fg" dangerouslySetInnerHTML={{ __html: description }} /> : <EmptyState title="Chưa có mô tả" />}
          </section>

          <section aria-labelledby="sp-h" className={card}>
            <h2 id="sp-h" className="mb-3 font-semibold">Thông số kỹ thuật</h2>
            {specs.length === 0 ? <EmptyState title="Chưa có thông số" /> : (
              <dl className="grid gap-x-6 sm:grid-cols-2">
                {specs.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-admin-border py-2 text-sm"><dt className="text-admin-muted">{k}</dt><dd className="text-right">{v}</dd></div>
                ))}
              </dl>
            )}
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <Reviews productId={product.id} />
            <History productId={product.id} />
          </div>
        </div>
      </div>
      {modal.mode === "edit" && modal.editId !== null && canEdit && <ProductFormModal key={modal.editId} id={modal.editId} onClose={modal.close} />}
    </>
  );
}
