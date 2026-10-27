export interface PageMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface OrderSummaryRow {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  items_count: number;
  created_at: string | null;
}

export interface DashboardData {
  stats: {
    orders_total: number;
    orders_today: number;
    revenue_today: number;
    revenue_14d: number;
    pending_orders: number;
    low_stock_variants: number;
    hidden_reviews: number;
  };
  revenue_series: { date: string; orders: number; revenue: number }[];
  recent_orders: OrderSummaryRow[];
  low_stock: { variant_id: number; product_id: number; product_name: string | null; variant_name: string; sku: string; stock_quantity: number }[];
}

export interface AdminProductRow {
  id: number;
  name: string;
  slug: string;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  thumbnail_url: string | null;
  brand: { id: number; name: string } | null;
  categories: { id: number; name: string }[];
  price_min: number | null;
  price_max: number | null;
  sku: string | null;
  stock_total: number;
  variants_count: number;
  updated_at: string | null;
}

export interface AdminVariant {
  id?: number;
  sku: string;
  name: string;
  price: number;
  compare_at_price: number | null;
  cost_price: number | null;
  stock_quantity: number;
  weight_grams: number;
  image_url: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface AdminProductInput {
  name: string;
  slug?: string | null;
  status: "draft" | "published" | "archived";
  is_featured: boolean;
  brand_id: number | null;
  category_ids: number[];
  short_description: string | null;
  description: string | null;
  unit: string | null;
  specifications: Record<string, string>;
  meta_title: string | null;
  meta_description: string | null;
  variants: AdminVariant[];
}

/** Ảnh sản phẩm — quản lý qua endpoint riêng (tải file lên), không gửi kèm khi lưu sản phẩm. */
export interface AdminProductImage {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface AdminProduct extends AdminProductInput {
  id: number;
  slug: string;
  thumbnail_url: string | null;
  media: AdminProductImage[];
  created_at: string | null;
  updated_at: string | null;
}

/** Một dòng lịch sử thay đổi sản phẩm (từ nhật ký thao tác admin). */
export interface ProductHistoryEntry {
  id: number;
  action: string;
  changes: Record<string, unknown> | null;
  user: { id: number; name: string } | null;
  created_at: string | null;
}

export interface AdminCategory {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  products_count: number;
  children_count: number;
}

export type AdminCategoryInput = Pick<AdminCategory, "name" | "parent_id" | "description" | "image_url" | "is_active" | "sort_order"> & { slug?: string | null };

export interface AdminCoupon {
  id: number;
  code: string;
  type: "fixed" | "percent";
  value: number;
  min_order_amount: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  per_customer_limit: number | null;
  used_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export type AdminCouponInput = Omit<AdminCoupon, "id" | "used_count">;

export interface TimelineEntry {
  type: "created" | "status_changed";
  status: string | null;
  from?: string | null;
  label: string;
  by: string | null;
  note: string | null;
  /** Mốc suy ra từ dữ liệu cũ (trước khi có bảng lịch sử). */
  backfilled?: boolean;
  at: string | null;
}

export interface OrderNote { id: number; body: string; by: string | null; at: string | null }

export type OrderStatusCounts = Record<string, number> & { all: number };

export interface LatestOrders { latest_id: number; new_count: number; pending_count: number }

export interface BulkStatusResult {
  results: { id: number; order_code: string | null; ok: boolean; message: string | null }[];
  succeeded: number;
  failed: number;
}

export interface BulkProductResult {
  results: { id: number; name: string | null; ok: boolean; message: string | null }[];
  succeeded: number;
  failed: number;
}
export type BulkProductInput =
  | { ids: number[]; action: "status"; status: AdminProductRow["status"] }
  | { ids: number[]; action: "add_category"; category_id: number };

export interface StoreInfo { name: string; phone: string | null; address: string | null; email: string | null }

export type PrintOrder = Omit<AdminOrderDetail, "allowed_transitions" | "timeline" | "notes" | "admin_note" | "cancel_reason" | "user_id"> & { cod_amount: number };

export interface PrintData { store: StoreInfo; orders: PrintOrder[] }

export interface AdminOrderDetail {
  id: number;
  order_code: string;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  created_at: string | null;
  customer: { name: string; phone: string; email: string | null };
  shipping: { province: string; district: string; ward: string | null; address: string | null };
  customer_note: string | null;
  admin_note: string | null;
  cancel_reason: string | null;
  coupon_code: string | null;
  user_id: number | null;
  allowed_transitions: string[];
  timeline: TimelineEntry[];
  notes: OrderNote[];
  items: { product_name: string; variant_name: string | null; sku: string | null; unit_price: number; quantity: number; line_total: number; thumbnail_url: string | null }[];
}

export interface AdminReview {
  id: number;
  rating: number;
  comment: string | null;
  images: string[];
  is_approved: boolean;
  verified_purchase: boolean;
  created_at: string | null;
  product: { id: number; name: string; slug: string } | null;
  user: { id: number; name: string; email: string } | null;
}
