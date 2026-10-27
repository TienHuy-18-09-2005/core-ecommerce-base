import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PRODUCT_STATUS_LABELS, btnDanger, btnPrimary, btnSecondary, inputClass } from "../../utils/adminFormat.ts";
import { useToast } from "../../app/useToast.ts";
import { PageHeader, QueryError } from "../../components/admin/ui.tsx";
import { useAdminCategoriesQuery, useAdminProductQuery, useProductMutations } from "../../hooks/useAdminQuery.ts";
import { productService } from "../../services/productService.ts";
import type { AdminProduct, AdminProductInput, AdminVariant } from "../../types/admin.ts";
import { firstFieldErrors } from "../../utils/fieldErrors.ts";
import { safeImageUrl } from "../../utils/safeImageUrl.ts";

const emptyVariant = (isDefault: boolean): AdminVariant => ({
  sku: "", name: "Mặc định", price: 0, compare_at_price: null, cost_price: null,
  stock_quantity: 0, weight_grams: 0, image_url: null, is_default: isDefault, is_active: true,
});

const emptyProduct: AdminProductInput = {
  name: "", slug: "", status: "draft", is_featured: false, brand_id: null, category_ids: [],
  short_description: "", description: "", thumbnail_url: null, unit: "cái", specifications: {},
  meta_title: "", meta_description: "", media: [], variants: [emptyVariant(true)],
};

type SpecRow = { key: string; value: string };

function toInput(p: AdminProduct): AdminProductInput {
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = p;
  return { ...rest, specifications: p.specifications ?? {} };
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-admin-fg-soft">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-admin-danger">{error}</span>}
    </label>
  );
}

const numOrNull = (v: string) => (v === "" ? null : Number(v));

export default function ProductFormPage() {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const detail = useAdminProductQuery(id);

  if (id !== null && detail.isLoading) {
    return <p>Đang tải sản phẩm...</p>;
  }
  if (id !== null && detail.error) {
    return <QueryError error={detail.error} />;
  }
  // key: nạp lại form khi đổi sản phẩm
  return <ProductForm key={id ?? "new"} id={id} initial={detail.data ? toInput(detail.data) : emptyProduct} slug={detail.data?.slug} />;
}

function ProductForm({ id, initial, slug }: { id: number | null; initial: AdminProductInput; slug?: string }) {
  const [form, setForm] = useState<AdminProductInput>(initial);
  const [specs, setSpecs] = useState<SpecRow[]>(() => Object.entries(initial.specifications).map(([key, value]) => ({ key, value: String(value) })));
  const categories = useAdminCategoriesQuery();
  const brands = useQuery({ queryKey: ["brands"], queryFn: () => productService.getBrands() });
  const { create, update, upload } = useProductMutations();
  const toast = useToast();
  const navigate = useNavigate();
  const saving = create.isPending || update.isPending;
  const errors = firstFieldErrors(id ? update.error : create.error);

  const patch = (p: Partial<AdminProductInput>) => setForm((f) => ({ ...f, ...p }));
  const patchVariant = (i: number, p: Partial<AdminVariant>) =>
    setForm((f) => ({ ...f, variants: f.variants.map((v, j) => (j === i ? { ...v, ...p } : p.is_default ? { ...v, is_default: false } : v)) }));

  const uploadTo = (file: File | undefined, done: (url: string) => void) => {
    if (!file) {
      return;
    }
    upload.mutate(file, { onSuccess: (r) => done(r.url), onError: toast.showError });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const payload: AdminProductInput = {
      ...form,
      slug: form.slug || null,
      specifications: Object.fromEntries(specs.filter((s) => s.key.trim()).map((s) => [s.key.trim(), s.value.trim()])),
    };
    if (id) {
      update.mutate({ id, input: payload }, { onSuccess: () => toast.showSuccess("Đã lưu sản phẩm."), onError: toast.showError });
    } else {
      create.mutate(payload, {
        onSuccess: (p) => { toast.showSuccess("Đã tạo sản phẩm."); navigate(`/admin/san-pham/${p.id}`, { replace: true }); },
        onError: toast.showError,
      });
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title={id ? "Sửa sản phẩm" : "Thêm sản phẩm"} actions={
        <div className="flex gap-2">
          {slug && form.status === "published" && <a className={btnSecondary} href={`/san-pham/${slug}`} target="_blank" rel="noreferrer">Xem trên shop</a>}
          <Link to="/admin/san-pham" className={btnSecondary}>Quay lại</Link>
          <button type="submit" className={btnPrimary} disabled={saving}>{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
      } />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-4 rounded-xl border border-admin-border bg-admin-surface p-5">
            <Field label="Tên sản phẩm" error={errors.name}>
              <input className={inputClass} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Slug (để trống sẽ tự tạo)" error={errors.slug}>
              <input className={inputClass} value={form.slug ?? ""} onChange={(e) => patch({ slug: e.target.value })} />
            </Field>
            <Field label="Mô tả ngắn" error={errors.short_description}>
              <textarea className={inputClass} rows={2} value={form.short_description ?? ""} onChange={(e) => patch({ short_description: e.target.value })} />
            </Field>
            <Field label="Mô tả chi tiết (HTML cơ bản: p, strong, em, ul/ol, h2–h4, a, table — máy chủ tự lọc thẻ không an toàn)" error={errors.description}>
              <textarea className={`${inputClass} font-mono`} rows={8} value={form.description ?? ""} onChange={(e) => patch({ description: e.target.value })} />
            </Field>
          </section>

          <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Biến thể</h2>
              <button type="button" className={btnSecondary} onClick={() => patch({ variants: [...form.variants, { ...emptyVariant(false), name: "" }] })}>+ Thêm biến thể</button>
            </div>
            {errors.variants && <p role="alert" className="mb-2 text-xs text-admin-danger">{errors.variants}</p>}
            <div className="space-y-4">
              {form.variants.map((v, i) => (
                <fieldset key={v.id ?? `new-${i}`} className="grid gap-3 rounded-lg border border-admin-border p-3 sm:grid-cols-4">
                  <legend className="px-1 text-xs text-admin-muted">Biến thể #{i + 1}{v.id ? ` (id ${v.id})` : " (mới)"}</legend>
                  <Field label="SKU" error={errors[`variants.${i}.sku`]}><input className={inputClass} value={v.sku} onChange={(e) => patchVariant(i, { sku: e.target.value })} /></Field>
                  <Field label="Tên biến thể" error={errors[`variants.${i}.name`]}><input className={inputClass} value={v.name} onChange={(e) => patchVariant(i, { name: e.target.value })} /></Field>
                  <Field label="Giá bán" error={errors[`variants.${i}.price`]}><input type="number" min={0} className={inputClass} value={v.price} onChange={(e) => patchVariant(i, { price: Number(e.target.value) })} /></Field>
                  <Field label="Giá gốc" error={errors[`variants.${i}.compare_at_price`]}><input type="number" min={0} className={inputClass} value={v.compare_at_price ?? ""} onChange={(e) => patchVariant(i, { compare_at_price: numOrNull(e.target.value) })} /></Field>
                  <Field label="Giá vốn" error={errors[`variants.${i}.cost_price`]}><input type="number" min={0} className={inputClass} value={v.cost_price ?? ""} onChange={(e) => patchVariant(i, { cost_price: numOrNull(e.target.value) })} /></Field>
                  <Field label="Tồn kho" error={errors[`variants.${i}.stock_quantity`]}><input type="number" min={0} className={inputClass} value={v.stock_quantity} onChange={(e) => patchVariant(i, { stock_quantity: Number(e.target.value) })} /></Field>
                  <Field label="Khối lượng (g)" error={errors[`variants.${i}.weight_grams`]}><input type="number" min={0} className={inputClass} value={v.weight_grams} onChange={(e) => patchVariant(i, { weight_grams: Number(e.target.value) })} /></Field>
                  <div className="flex flex-col justify-end gap-1 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" name="default-variant" checked={v.is_default} onChange={() => patchVariant(i, { is_default: true })} />Mặc định</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_active} onChange={(e) => patchVariant(i, { is_active: e.target.checked })} />Đang bán</label>
                    {form.variants.length > 1 && (
                      <button type="button" className={btnDanger} onClick={() => patch({ variants: form.variants.filter((_, j) => j !== i) })}>Bỏ biến thể</button>
                    )}
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Thông số kỹ thuật</h2>
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

          <section className="rounded-xl border border-admin-border bg-admin-surface p-5">
            <h2 className="mb-3 font-semibold">Thư viện ảnh</h2>
            {errors.media && <p role="alert" className="mb-2 text-xs text-admin-danger">{errors.media}</p>}
            <div className="flex flex-wrap gap-3">
              {form.media.map((m, i) => (
                <div key={`${m.url}-${i}`} className="w-28 text-xs">
                  <img src={safeImageUrl(m.url) ?? "/product-fallback.svg"} alt={m.alt_text ?? ""} className="h-28 w-28 rounded object-cover" />
                  <button type="button" className="mt-1 text-admin-danger" onClick={() => patch({ media: form.media.filter((_, j) => j !== i) })}>Xóa ảnh</button>
                </div>
              ))}
            </div>
            <label className="mt-3 inline-block text-sm">
              <span className="mr-2">Tải ảnh lên (JPG/PNG/WebP, tối đa 5MB):</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={upload.isPending}
                onChange={(e) => { uploadTo(e.target.files?.[0], (url) => patch({ media: [...form.media, { url, alt_text: form.name || null }] })); e.target.value = ""; }} />
            </label>
            {upload.isPending && <p className="text-sm text-admin-muted">Đang tải ảnh...</p>}
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-4 rounded-xl border border-admin-border bg-admin-surface p-5">
            <Field label="Trạng thái" error={errors.status}>
              <select className={inputClass} value={form.status} onChange={(e) => patch({ status: e.target.value as AdminProductInput["status"] })}>
                {Object.entries(PRODUCT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => patch({ is_featured: e.target.checked })} />Sản phẩm nổi bật</label>
            <Field label="Thương hiệu" error={errors.brand_id}>
              <select className={inputClass} value={form.brand_id ?? ""} onChange={(e) => patch({ brand_id: numOrNull(e.target.value) })}>
                <option value="">— Không —</option>
                {brands.data?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
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
            <Field label="Đơn vị" error={errors.unit}><input className={inputClass} value={form.unit ?? ""} onChange={(e) => patch({ unit: e.target.value })} /></Field>
          </section>

          <section className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-5">
            <h2 className="font-semibold">Ảnh đại diện</h2>
            {form.thumbnail_url && <img src={safeImageUrl(form.thumbnail_url) ?? "/product-fallback.svg"} alt="Ảnh đại diện" className="h-40 w-full rounded object-cover" />}
            <Field label="URL ảnh" error={errors.thumbnail_url}>
              <input className={inputClass} value={form.thumbnail_url ?? ""} onChange={(e) => patch({ thumbnail_url: e.target.value || null })} />
            </Field>
            <input type="file" aria-label="Tải ảnh đại diện" accept="image/jpeg,image/png,image/webp" disabled={upload.isPending}
              onChange={(e) => { uploadTo(e.target.files?.[0], (url) => patch({ thumbnail_url: url })); e.target.value = ""; }} />
          </section>

          <section className="space-y-3 rounded-xl border border-admin-border bg-admin-surface p-5">
            <h2 className="font-semibold">SEO</h2>
            <Field label="Meta title" error={errors.meta_title}><input className={inputClass} value={form.meta_title ?? ""} onChange={(e) => patch({ meta_title: e.target.value })} /></Field>
            <Field label="Meta description" error={errors.meta_description}><textarea className={inputClass} rows={3} value={form.meta_description ?? ""} onChange={(e) => patch({ meta_description: e.target.value })} /></Field>
          </section>
        </div>
      </div>
    </form>
  );
}
