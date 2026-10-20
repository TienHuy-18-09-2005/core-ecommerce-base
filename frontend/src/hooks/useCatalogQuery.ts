import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
    // signal: huỷ request cũ khi filter đổi
    queryFn: ({ signal }) => productService.getProducts(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useProductDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: ({ signal }) => productService.getProductDetail(slug ?? "", signal),
    enabled: Boolean(slug),
  });
}
