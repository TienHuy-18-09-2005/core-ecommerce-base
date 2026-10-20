import type { BrandSummary, CatalogProduct, CategoryNode, Paginated, ProductSuggestion } from "../types/catalog.ts";
import type { Product } from "../types/product.ts";
import { apiClient } from "./apiClient.ts";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

export type ProductListParams = Record<string, string | number | boolean | undefined>;

export const productService = {
  async getProducts(params?: ProductListParams, signal?: AbortSignal) {
    const response = await apiClient.get<ApiSuccess<Paginated<CatalogProduct>>>("/products", { params, signal });
    return response.data.data;
  },

  async suggest(q: string, signal?: AbortSignal) {
    const response = await apiClient.get<ApiSuccess<ProductSuggestion[]>>("/products/suggest", { params: { q }, signal });
    return response.data.data;
  },

  async getCategories() {
    const response = await apiClient.get<ApiSuccess<CategoryNode[]>>("/categories");
    return response.data.data;
  },

  async getBrands() {
    const response = await apiClient.get<ApiSuccess<BrandSummary[]>>("/brands");
    return response.data.data;
  },

  async getProductDetail(slug: string, signal?: AbortSignal): Promise<Product> {
    const response = await apiClient.get<ApiSuccess<Product>>(`/products/${encodeURIComponent(slug)}`, { signal });
    return response.data.data;
  },
};
