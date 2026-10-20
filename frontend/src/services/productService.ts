import type { Product } from "../types/product.ts";
import { apiClient } from "./apiClient.ts";

interface ApiSuccess<T> {
  success: boolean;
  data: T;
}

export type ProductListParams = Record<string, string | number | boolean | undefined>;

export const productService = {
  async getProducts(params?: ProductListParams) {
    const response = await apiClient.get<ApiSuccess<unknown>>("/products", { params });
    return response.data.data;
  },

  async getProductDetail(slug: string): Promise<Product> {
    const response = await apiClient.get<ApiSuccess<Product>>(`/products/${slug}`);
    return response.data.data;
  },
};
