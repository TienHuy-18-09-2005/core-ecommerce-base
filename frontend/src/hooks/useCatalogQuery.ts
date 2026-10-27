import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { productService, type ProductListParams } from "../services/productService.ts";

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    staleTime: 10 * 60_000,
    queryFn: () => productService.getCategories(),
  });
}

export function useBrandsQuery() {
  return useQuery({
    queryKey: ["brands"],
    staleTime: 10 * 60_000,
    queryFn: () => productService.getBrands(),
  });
}

export const productsQueryOptions = (params: ProductListParams) => ({
  queryKey: ["products", params] as const,
  // signal: hủy request cũ khi filter đổi
  queryFn: ({ signal }: { signal: AbortSignal }) => productService.getProducts(params, signal),
});

export function useProductsQuery(params: ProductListParams) {
  return useQuery({ ...productsQueryOptions(params), placeholderData: keepPreviousData });
}

export function useProductDetailQuery(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: ({ signal }) => productService.getProductDetail(slug ?? "", signal),
    enabled: Boolean(slug),
  });
}
