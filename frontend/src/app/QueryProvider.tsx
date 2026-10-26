import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { appQueryClient } from "./queryClient.ts";

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={appQueryClient}>{children}</QueryClientProvider>;
}
