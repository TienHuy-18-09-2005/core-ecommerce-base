export interface CategoryNode {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  children?: CategoryNode[];
}

export interface BrandSummary {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
}

export interface CatalogProduct {
  id: number;
  name: string;
  slug: string;
  thumbnail_url?: string | null;
  unit?: string | null;
  min_price?: number | string | null;
  max_price?: number | string | null;
  is_featured?: boolean;
  brand?: { id: number; name: string; slug: string } | null;
  default_variant_id?: number | null;
  default_variant_price?: number | string | null;
  default_compare_at_price?: number | string | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export function featuredDepartments(categories: CategoryNode[]): CategoryNode[] {
  if (categories.length === 1 && (categories[0]?.children?.length ?? 0) > 0) {
    return categories[0]?.children ?? [];
  }

  return categories;
}
