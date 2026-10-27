import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy, useMemo, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { PRODUCT_STATUS_LABELS, btnDanger, btnSecondary, inputClass } from "../../utils/adminFormat.ts";
import { CheckboxField, FormField, useUnsavedChanges } from "../../components/admin/form/FormField.tsx";
import { FormModal } from "../../components/admin/form/FormModal.tsx";
import { ProductImagesField, type ImageItem } from "../../components/admin/form/ProductImagesField.tsx";
import { Modal } from "../../components/admin/overlay/Modal.tsx";
import { useToast } from "../../app/useToast.ts";
import { SkeletonBlock } from "../../components/admin/feedback.tsx";
import { QueryError } from "../../components/admin/ui.tsx";
import { useAdminCategoriesQuery, useAdminProductQuery, useProductMutations } from "../../hooks/useAdminQuery.ts";
import { adminService } from "../../services/adminService.ts";
import { productService } from "../../services/productService.ts";
import type { AdminProduct, AdminProductInput } from "../../types/admin.ts";
import { VariantsTable } from "./product/VariantsTable.tsx";
import { duplicateSkuRows, emptyVariant } from "./product/variantUtils.ts";

const RichTextEditor = lazy(() => import("../../components/admin/editor/RichTextEditor.tsx"));
import { errorMessage, firstFieldErrors } from "../../utils/fieldErrors.ts";

const emptyProduct: AdminProductInput = {
  name: "", slug: "", status: "draft", is_featured: false, brand_id: null, category_ids: [],
  short_description: "", description: "", unit: "cái", specifications: {},
  meta_title: "", meta_description: "", variants: [emptyVariant(true)],
};

type SpecRow = { key: string; value: string };
const numOrNull = (v: string) => (v === "" ? null : Number(v));

function toInput(p: AdminProduct): AdminProductInput {
  const { id: _id, created_at: _c, updated_at: _u, media: _m, thumbnail_url: _t, ...rest } = p;
  return { ...rest, specifications: p.specifications ?? {} };
}

const TABS = [
  { id: "info", label: "Thông tin chung" },
  { id: "variants", label: "Biến thể & tồn kho" },
  { id: "images", label: "Hình ảnh" },
  { id: "specs", label: "Thông số kỹ thuật" },
  { id: "seo", label: "SEO" },
] as const;
type TabId = (typeof TABS)[number]["id"];
const isTab = (t: string | null): t is TabId => TABS.some((x) => x.id === t);

/** Văn bản thuần của HTML mô tả (để đếm độ dài, không render). */
const plainText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/** Lỗi máy chủ thuộc tab nào — để gắn dấu và tự chuyển tab. */
function tabOf(field: string): TabId {
  if (field.startsWith("variants")) return "variants";
  if (field.startsWith("specifications")) return "specs";
  if (field.startsWith("meta_")) return "seo";
  return "info";
}

/** Modal thêm/sửa sản phẩm: tải chi tiết (nếu sửa) rồi dựng biểu mẫu. */
export function ProductFormModal({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useAdminProductQuery(id);
  if (id !== null && (detail.isLoading || detail.error)) {
    return (
      <Modal open size="xl" title="Sửa sản phẩm" onClose={onClose}>
        {detail.isLoading ? <SkeletonBlock lines={8} label="Đang tải sản phẩm..." /> : <QueryError error={detail.error} onRetry={detail.refetch} retrying={detail.isRefetching} />}
      </Modal>
    );
  }
  return <ProductForm id={id} product={detail.data} onClose={onClose} />;
}

function ProductForm({ id, product, onClose }: { id: number | null; product?: AdminProduct; onClose: () => void }) {
  const initial = product ? toInput(product) : emptyProduct;
  const [form, setForm] = useState<AdminProductInput>(initial);
  const [specs, setSpecs] = useState<SpecRow[]>(() => Object.entries(initial.specifications).map(([key, value]) => ({ key, value: String(value) })));
  const [images, setImages] = useState<ImageItem[]>(() => (product?.media ?? []).map((m) => ({ key: `id-${m.id}`, id: m.id, url: m.url })));
  const [primaryKey, setPrimaryKey] = useState<string | null>(() => {
    const p = product?.media.find((m) => m.is_primary) ?? product?.media[0];
    return p ? `id-${p.id}` : null;
  });
  // Sản phẩm mới đã tạo nhưng ảnh tải lỗi → lần lưu sau là cập nhật, không tạo trùng.
  const [savedId, setSavedId] = useState<number | null>(id);
  // Tab đang mở nằm trên URL (?tab=) để refresh/chia sẻ link vẫn đúng tab.
  const [search, setSearch] = useSearchParams();
  const rawTab = search.get("tab");
  const tab: TabId = isTab(rawTab) ? rawTab : "info";
  const setTab = (t: TabId) => setSearch((prev) => { const n = new URLSearchParams(prev); if (t === "info") n.delete("tab"); else n.set("tab", t); return n; }, { replace: true });
  const [busy, setBusy] = useState(false);
  const categories = useAdminCategoriesQuery();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => productService.getBrands() });
  const { create, update, invalidate } = useProductMutations();
  const toast = useToast();
  const errors = firstFieldErrors(savedId ? update.error : create.error);
  const errorTabs = new Set(Object.keys(errors).map(tabOf));
  const unsaved = useUnsavedChanges({ form, specs, images: images.map((i) => i.key), primaryKey });
  const initialIds = (product?.media ?? []).map((m) => m.id);

  const patch = (p: Partial<AdminProductInput>) => setForm((f) => ({ ...f, ...p }));
  const dupRows = useMemo(() => duplicateSkuRows(form.variants), [form.variants]);
  const dirty = unsaved.isDirty();
  const descLen = plainText(form.description ?? "").length;
  const checks: { label: string; ok: boolean; tab: TabId; hint: string }[] = [
    { label: "Hình ảnh", ok: images.length > 0, tab: "images", hint: images.length ? `${images.length} ảnh` : "Chưa có ảnh" },
    { label: "Mô tả chi tiết", ok: descLen >= 100, tab: "info", hint: descLen ? `${descLen} ký tự (nên ≥ 100)` : "Chưa có mô tả" },
    { label: "Mô tả ngắn", ok: !!form.short_description?.trim(), tab: "info", hint: form.short_description?.trim() ? "Đã có" : "Chưa có" },
    { label: "Giá bán", ok: form.variants.every((v) => v.price > 0), tab: "variants", hint: form.variants.every((v) => v.price > 0) ? "Đủ" : "Có biến thể giá 0đ" },
    { label: "SEO", ok: !!form.meta_title?.trim() && !!form.meta_description?.trim(), tab: "seo", hint: form.meta_title?.trim() && form.meta_description?.trim() ? "Đủ tiêu đề + mô tả" : "Thiếu tiêu đề hoặc mô tả" },
  ];
  const done = checks.filter((c) => c.ok).length;
  const setImage = (key: string, p: Partial<ImageItem>) => setImages((all) => all.map((x) => (x.key === key ? { ...x, ...p } : x)));

  /** Đồng bộ ảnh sau khi lưu sản phẩm: xóa ảnh bị bỏ → tải ảnh mới (có tiến độ) → lưu thứ tự + ảnh chính. */
  const syncImages = async (pid: number): Promise<number> => {
    const keep = new Set(images.flatMap((i) => (i.id ? [i.id] : [])));
    for (const old of initialIds) if (!keep.has(old)) await adminService.deleteProductImage(pid, old);
    const ids = new Map<string, number>();
    images.forEach((i) => i.id && ids.set(i.key, i.id));
    let failed = 0;
    for (const it of images.filter((i) => i.file && !i.id)) {
      setImage(it.key, { progress: 0, error: undefined });
      try {
        const r = await adminService.uploadProductImage(pid, it.file as File, (p) => setImage(it.key, { progress: p }));
        ids.set(it.key, r.id);
        setImage(it.key, { id: r.id, progress: 100 });
      } catch (e) {
        failed++;
        setImage(it.key, { error: errorMessage(e, "Tải ảnh thất bại.") ?? "Tải ảnh thất bại." });
      }
    }
    const order = images.flatMap((i) => (ids.has(i.key) ? [ids.get(i.key) as number] : []));
    if (order.length) await adminService.reorderProductImages(pid, order, primaryKey ? (ids.get(primaryKey) ?? null) : null);
    return failed;
  };

  const onSubmit = async () => {
    if (dupRows.size) {
      setTab("variants");
      toast.showError(new Error("Có SKU bị trùng giữa các biến thể. Sửa lại trước khi lưu."));
      return;
    }
    const payload: AdminProductInput = {
      ...form,
      slug: form.slug || null,
      specifications: Object.fromEntries(specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value.trim()])),
    };
    setBusy(true);
    try {
      let pid = savedId;
      try {
        pid = savedId ? (await update.mutateAsync({ id: savedId, input: payload })).id : (await create.mutateAsync(payload)).id;
      } catch (e) {
        toast.showError(e);
        const fe = firstFieldErrors(e);
        const first = Object.keys(fe)[0];
        if (first) setTab(tabOf(first));
        return;
      }
      setSavedId(pid);
      let failed = 0;
      try {
        failed = await syncImages(pid);
      } catch (e) {
        failed = -1;
        toast.showError(e);
      }
      await invalidate();
      if (failed === 0) {
        unsaved.markClean();
        toast.showSuccess(id ? "Đã lưu sản phẩm." : "Đã tạo sản phẩm.");
        onClose();
      } else {
        setTab("images");
        if (failed > 0) toast.showInfo(`Đã lưu sản phẩm nhưng ${failed} ảnh tải lên thất bại. Kiểm tra lại tab Ảnh rồi lưu lại.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const onTabKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = TABS[(i + d + TABS.length) % TABS.length].id;
    setTab(next);
    document.getElementById(`ptab-${next}`)?.focus();
  };

  const slug = product?.slug;
  return (
    <FormModal size="xl" title={id ? `Sửa sản phẩm: ${product?.name ?? ""}` : "Thêm sản phẩm"} isDirty={unsaved.isDirty} onClose={onClose}
      onSubmit={() => void onSubmit()} saving={busy}
      extraActions={slug && form.status === "published" ? <a className={btnSecondary} href={`/san-pham/${slug}`} target="_blank" rel="noreferrer">Xem trên shop</a> : undefined}>
      {unsaved.prompt}
      <div className="-mx-1 flex items-end gap-2 border-b border-admin-border">
      <div role="tablist" aria-label="Phần của biểu mẫu" className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t.id} id={`ptab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`ppanel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? "border-admin-primary text-admin-primary" : "border-transparent text-admin-muted hover:text-admin-fg"}`}>
            {t.label}{t.id === "images" && images.length > 0 && ` (${images.length})`}{t.id === "variants" && ` (${form.variants.length})`}
            {(errorTabs.has(t.id) || (t.id === "variants" && dupRows.size > 0)) && <span className="ml-1 text-admin-danger" aria-label="có lỗi">●</span>}
          </button>
        ))}
      </div>
      <p role="status" className="mb-1.5 shrink-0 rounded bg-admin-warning-subtle px-2 py-0.5 text-xs font-medium text-admin-fg empty:hidden">{dirty ? "● Có thay đổi chưa lưu" : ""}</p>
      </div>

      <div role="tabpanel" id="ppanel-info" aria-labelledby="ptab-info" hidden={tab !== "info"} className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <FormField label="Tên sản phẩm" error={errors.name} required>
            <input className={inputClass} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </FormField>
          <FormField label="Slug" hint="Để trống sẽ tự tạo từ tên." error={errors.slug}>
            <input className={inputClass} value={form.slug ?? ""} onChange={(e) => patch({ slug: e.target.value })} />
          </FormField>
          <FormField label="Mô tả ngắn" error={errors.short_description}>
            <textarea className={inputClass} rows={2} value={form.short_description ?? ""} onChange={(e) => patch({ short_description: e.target.value })} />
          </FormField>
          <div className="text-sm">
            <p id="pdesc-label" className="mb-1 font-medium text-admin-fg-soft">Mô tả chi tiết</p>
            {tab === "info" && (
              <Suspense fallback={<SkeletonBlock lines={6} label="Đang tải trình soạn thảo..." />}>
                <RichTextEditor labelId="pdesc-label" invalid={!!errors.description} value={form.description ?? ""} onChange={(html) => patch({ description: html })}
                  onError={toast.showError} onUploadImage={async (f) => (await adminService.uploadDescriptionImage(f)).url} />
              </Suspense>
            )}
            <p className="mt-1 text-xs text-admin-muted">Ảnh chèn vào mô tả được tải lên máy chủ ngay (không vào thư viện ảnh sản phẩm). Máy chủ tự lọc thẻ/thuộc tính không an toàn.</p>
            {errors.description && <p role="alert" className="mt-1 text-xs text-admin-danger">{errors.description}</p>}
          </div>
        </div>
        <div className="space-y-4">
          <section aria-labelledby="pcomplete" className="rounded-lg border border-admin-border bg-admin-subtle p-3 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 id="pcomplete" className="font-semibold text-admin-fg">Độ hoàn thiện</h3>
              <span className="text-xs text-admin-muted">{done}/{checks.length}</span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded bg-admin-border" aria-hidden="true"><div className="h-full bg-admin-success" style={{ width: `${(done / checks.length) * 100}%` }} /></div>
            <ul className="space-y-1">
              {checks.map((c) => (
                <li key={c.label}>
                  <button type="button" onClick={() => setTab(c.tab)} className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-admin-surface">
                    <span aria-hidden="true" className={c.ok ? "text-admin-success" : "text-admin-muted"}>{c.ok ? "✓" : "○"}</span>
                    <span className="flex-1 text-admin-fg">{c.label}<span className="sr-only">{c.ok ? ": đạt" : ": chưa đạt"}</span></span>
                    <span className="text-xs text-admin-muted">{c.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <FormField label="Trạng thái" error={errors.status} required>
            <select className={inputClass} value={form.status} onChange={(e) => patch({ status: e.target.value as AdminProductInput["status"] })}>
              {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormField>
          <CheckboxField label="Sản phẩm nổi bật"><input type="checkbox" checked={form.is_featured} onChange={(e) => patch({ is_featured: e.target.checked })} /></CheckboxField>
          <FormField label="Thương hiệu" error={errors.brand_id}>
            <select className={inputClass} value={form.brand_id ?? ""} onChange={(e) => patch({ brand_id: numOrNull(e.target.value) })}>
              <option value="">— Không —</option>
              {brands.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </FormField>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-admin-fg-soft">Danh mục</legend>
            {errors.category_ids && <p role="alert" className="text-xs text-admin-danger">{errors.category_ids}</p>}
            <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {categories.data?.map((c) => (
                <label key={c.id} className="flex items-center gap-2" style={{ paddingLeft: c.parent_id ? 16 : 0 }}>
                  <input type="checkbox" checked={form.category_ids.includes(c.id)}
                    onChange={(e) => patch({ category_ids: e.target.checked ? [...form.category_ids, c.id] : form.category_ids.filter((x) => x !== c.id) })} />
                  {c.name}
                </label>
              ))}
            </div>
          </fieldset>
          <FormField label="Đơn vị" error={errors.unit}><input className={inputClass} value={form.unit ?? ""} onChange={(e) => patch({ unit: e.target.value })} /></FormField>
        </div>
      </div>

      <div role="tabpanel" id="ppanel-variants" aria-labelledby="ptab-variants" hidden={tab !== "variants"}>
        <VariantsTable variants={form.variants} onChange={(variants) => patch({ variants })} errors={errors} dupRows={dupRows} productName={form.name} />
      </div>

      <div role="tabpanel" id="ppanel-images" aria-labelledby="ptab-images" hidden={tab !== "images"}>
        <p className="mb-3 text-sm text-admin-muted">Ảnh chính hiển thị đầu tiên trên shop và làm ảnh đại diện. Kéo thả hoặc dùng mũi tên để sắp xếp. Ảnh được tải lên khi bấm Lưu.</p>
        <ProductImagesField items={images} primaryKey={primaryKey} disabled={busy} onChange={(items, pk) => { setImages(items); setPrimaryKey(pk); }} />
      </div>

      <div role="tabpanel" id="ppanel-specs" aria-labelledby="ptab-specs" hidden={tab !== "specs"}>
        <section className="max-w-3xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-admin-fg">Thông số kỹ thuật</h3>
            <button type="button" className={btnSecondary} onClick={() => setSpecs((s) => [...s, { key: "", value: "" }])}>+ Thêm dòng</button>
          </div>
          {errors.specifications && <p role="alert" className="mb-2 text-xs text-admin-danger">{errors.specifications}</p>}
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label={`Tên thông số ${i + 1}`} placeholder="Tên (vd. Công suất)" className={inputClass} value={s.key}
                  onChange={(e) => setSpecs((all) => all.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                <input aria-label={`Giá trị thông số ${i + 1}`} placeholder="Giá trị (vd. 9W)" className={inputClass} value={s.value}
                  onChange={(e) => setSpecs((all) => all.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className={btnDanger} aria-label={`Xóa thông số ${i + 1}`} onClick={() => setSpecs((all) => all.filter((_, j) => j !== i))}>×</button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div role="tabpanel" id="ppanel-seo" aria-labelledby="ptab-seo" hidden={tab !== "seo"}>
        <section className="max-w-2xl space-y-3">
          <p className="text-sm text-admin-muted">Để trống sẽ dùng tên và mô tả ngắn của sản phẩm.</p>
          <FormField label="Meta title" error={errors.meta_title}><input className={inputClass} maxLength={255} value={form.meta_title ?? ""} onChange={(e) => patch({ meta_title: e.target.value })} /></FormField>
          <p className="-mt-2 text-xs text-admin-muted">{(form.meta_title ?? "").length}/60 ký tự khuyến nghị</p>
          <FormField label="Meta description" error={errors.meta_description}><textarea className={inputClass} rows={3} value={form.meta_description ?? ""} onChange={(e) => patch({ meta_description: e.target.value })} /></FormField>
          <p className="-mt-2 text-xs text-admin-muted">{(form.meta_description ?? "").length}/160 ký tự khuyến nghị</p>
          <div className="rounded-lg border border-admin-border p-3" aria-label="Xem trước kết quả tìm kiếm">
            <p className="text-xs text-admin-muted">Xem trước trên Google</p>
            <p className="truncate text-base text-admin-primary">{form.meta_title?.trim() || form.name || "Tên sản phẩm"}</p>
            <p className="truncate text-xs text-admin-success">/san-pham/{form.slug || product?.slug || "duong-dan"}</p>
            <p className="line-clamp-2 text-sm text-admin-fg-soft">{form.meta_description?.trim() || form.short_description || "Mô tả sản phẩm..."}</p>
          </div>
        </section>
      </div>
    </FormModal>
  );
}
