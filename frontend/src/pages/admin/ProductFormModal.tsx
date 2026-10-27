import { useQuery } from "@tanstack/react-query";
import { useState, type KeyboardEvent } from "react";
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
import type { AdminProduct, AdminProductInput, AdminVariant } from "../../types/admin.ts";
import { errorMessage, firstFieldErrors } from "../../utils/fieldErrors.ts";

const emptyVariant = (isDefault: boolean): AdminVariant => ({
  sku: "", name: "Mặc định", price: 0, compare_at_price: null, cost_price: null,
  stock_quantity: 0, weight_grams: 0, image_url: null, is_default: isDefault, is_active: true,
});

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
  { id: "variants", label: "Biến thể" },
  { id: "images", label: "Ảnh" },
  { id: "specs", label: "Thông số & SEO" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Lỗi máy chủ thuộc tab nào — để gắn dấu và tự chuyển tab. */
function tabOf(field: string): TabId {
  if (field.startsWith("variants")) return "variants";
  if (field.startsWith("specifications") || field.startsWith("meta_")) return "specs";
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
  const [tab, setTab] = useState<TabId>("info");
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
  const patchVariant = (i: number, p: Partial<AdminVariant>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, ...p } : p.is_default ? { ...v, is_default: false } : v)) }));
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
      <div role="tablist" aria-label="Phần của biểu mẫu" className="-mx-1 flex gap-1 overflow-x-auto border-b border-admin-border">
        {TABS.map((t, i) => (
          <button key={t.id} id={`ptab-${t.id}`} type="button" role="tab" aria-selected={tab === t.id} aria-controls={`ppanel-${t.id}`} tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)} onKeyDown={(e) => onTabKey(e, i)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === t.id ? "border-admin-primary text-admin-primary" : "border-transparent text-admin-muted hover:text-admin-fg"}`}>
            {t.label}{t.id === "images" && images.length > 0 && ` (${images.length})`}
            {errorTabs.has(t.id) && <span className="ml-1 text-admin-danger" aria-label="có lỗi">●</span>}
          </button>
        ))}
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
          <FormField label="Mô tả chi tiết" hint="HTML cơ bản: p, strong, em, ul/ol, h2–h4, a, table — máy chủ tự lọc thẻ không an toàn." error={errors.description}>
            <textarea className={`${inputClass} font-mono`} rows={8} value={form.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
          </FormField>
        </div>
        <div className="space-y-4">
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

      <div role="tabpanel" id="ppanel-variants" aria-labelledby="ptab-variants" hidden={tab !== "variants"} className="space-y-4">
        <div className="flex justify-end">
          <button type="button" className={btnSecondary} onClick={() => patch({ variants: [...form.variants, { ...emptyVariant(false), name: "" }] })}>+ Thêm biến thể</button>
        </div>
        {errors.variants && <p role="alert" className="text-xs text-admin-danger">{errors.variants}</p>}
        {form.variants.map((v, i) => (
          <fieldset key={v.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-admin-border p-3 sm:grid-cols-2 lg:grid-cols-4">
            <legend className="px-1 text-xs text-admin-muted">Biến thể #{i + 1}{v.id ? ` (id ${v.id})` : " (mới)"}</legend>
            <FormField label="SKU" error={errors[`variants.${i}.sku`]} required><input className={inputClass} value={v.sku} onChange={(e) => patchVariant(i, { sku: e.target.value })} /></FormField>
            <FormField label="Tên biến thể" error={errors[`variants.${i}.name`]} required><input className={inputClass} value={v.name} onChange={(e) => patchVariant(i, { name: e.target.value })} /></FormField>
            <FormField label="Giá bán" error={errors[`variants.${i}.price`]} required><input type="number" min={0} className={inputClass} value={v.price} onChange={(e) => patchVariant(i, { price: Number(e.target.value) })} /></FormField>
            <FormField label="Giá gốc" error={errors[`variants.${i}.compare_at_price`]}><input type="number" min={0} className={inputClass} value={v.compare_at_price ?? ""} onChange={(e) => patchVariant(i, { compare_at_price: numOrNull(e.target.value) })} /></FormField>
            <FormField label="Giá vốn" error={errors[`variants.${i}.cost_price`]}><input type="number" min={0} className={inputClass} value={v.cost_price ?? ""} onChange={(e) => patchVariant(i, { cost_price: numOrNull(e.target.value) })} /></FormField>
            <FormField label="Tồn kho" error={errors[`variants.${i}.stock_quantity`]}><input type="number" min={0} className={inputClass} value={v.stock_quantity} onChange={(e) => patchVariant(i, { stock_quantity: Number(e.target.value) })} /></FormField>
            <FormField label="Khối lượng (g)" error={errors[`variants.${i}.weight_grams`]}><input type="number" min={0} className={inputClass} value={v.weight_grams} onChange={(e) => patchVariant(i, { weight_grams: Number(e.target.value) })} /></FormField>
            <div className="flex flex-col justify-end gap-1 text-sm">
              <CheckboxField label="Mặc định"><input type="radio" name="default-variant" checked={v.is_default} onChange={() => patchVariant(i, { is_default: true })} /></CheckboxField>
              <CheckboxField label="Đang bán"><input type="checkbox" checked={v.is_active} onChange={(e) => patchVariant(i, { is_active: e.target.checked })} /></CheckboxField>
              {form.variants.length > 1 && (
                <button type="button" className={btnDanger} onClick={() => patch({ variants: form.variants.filter((_, j) => j !== i) })}>Bỏ biến thể</button>
              )}
            </div>
          </fieldset>
        ))}
      </div>

      <div role="tabpanel" id="ppanel-images" aria-labelledby="ptab-images" hidden={tab !== "images"}>
        <p className="mb-3 text-sm text-admin-muted">Ảnh chính hiển thị đầu tiên trên shop và làm ảnh đại diện. Kéo thả hoặc dùng mũi tên để sắp xếp. Ảnh được tải lên khi bấm Lưu.</p>
        <ProductImagesField items={images} primaryKey={primaryKey} disabled={busy} onChange={(items, pk) => { setImages(items); setPrimaryKey(pk); }} />
      </div>

      <div role="tabpanel" id="ppanel-specs" aria-labelledby="ptab-specs" hidden={tab !== "specs"} className="grid gap-6 lg:grid-cols-2">
        <section>
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
        <section className="space-y-3">
          <h3 className="font-semibold text-admin-fg">SEO</h3>
          <FormField label="Meta title" error={errors.meta_title}><input className={inputClass} value={form.meta_title ?? ""} onChange={(e) => patch({ meta_title: e.target.value })} /></FormField>
          <FormField label="Meta description" error={errors.meta_description}><textarea className={inputClass} rows={3} value={form.meta_description ?? ""} onChange={(e) => patch({ meta_description: e.target.value })} /></FormField>
        </section>
      </div>
    </FormModal>
  );
}
