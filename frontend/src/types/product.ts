// frontend/src/types/product.ts
export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export interface Attribute {
  id: number;
  name: string;
  code: string;
  display_type: "text" | "color" | "button";
}

export interface AttributeValue {
  id: number;
  attribute_id: number;
  value: string;
  color_hex?: string;
  attribute?: Attribute;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  name: string;
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  image_url?: string;
  is_default: boolean;
  attribute_values: AttributeValue[];
}

export interface ProductMedia {
  id: number;
  file_url: string;
  media_type: "image" | "video";
  alt_text?: string;
}

export interface Product {
  id: number;
  brand_id?: number;
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  thumbnail_url?: string;
  unit: string;
  specifications?: Record<string, unknown> | null;
  has_variants: boolean;
  min_price?: number;
  max_price?: number;
  brand?: Brand;
  variants: ProductVariant[];
  media: ProductMedia[];
  categories?: { id: number; name: string; slug: string }[];
}
