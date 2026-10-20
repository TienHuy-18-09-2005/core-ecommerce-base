import type { BrandSummary, CatalogProduct, CategoryNode, Paginated } from "../types/catalog.ts";
import type { Product } from "../types/product.ts";
import { apiClient } from "./apiClient.ts";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

export type ProductListParams = Record<string, string | number | boolean | undefined>;

export const productService = {
  async getProducts(params?: ProductListParams) {
    const response = await apiClient.get<ApiSuccess<Paginated<CatalogProduct>>>("/products", { params });
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

  async getProductDetail(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiSuccess<Product>>(`/products/${slug}`);
    return response.data.data;
  },
};
