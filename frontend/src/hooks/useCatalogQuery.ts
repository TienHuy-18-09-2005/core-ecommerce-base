import { useQuery } from "@tanstack/react-query";
import { productService, type ProductListParams } from "../services/productService.ts";

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => productService.getCategories(),
  });
}

export function useBrandsQuery() {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => productService.getBrands(),
  });
}

export function useProductsQuery(params: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productService.getProducts(params),
  });
}
