import axios from "axios";
import type { Product } from "../types/product";

const API_URL = "/api";

export const productService = {
  async getProducts(params?: Record<string, any>) {
    const response = await axios.get(`${API_URL}/products`, { params });
    return response.data.data;
  },

  async getProductDetail(slug: string): Promise<Product> {
    const response = await axios.get(`${API_URL}/products/${slug}`);
    return response.data.data;
  },
};
