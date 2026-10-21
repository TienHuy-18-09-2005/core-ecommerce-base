import type { Address, AddressInput, User } from "../types/auth.ts";
import type { Order } from "../types/order.ts";
import { apiClient } from "./apiClient.ts";

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: { current_page: number; last_page: number; per_page: number; total: number };
}

export interface OrderPage {
  data: Order[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

export const accountService = {
  async updateProfile(input: { name: string; phone?: string | null }): Promise<User> {
    return (await apiClient.put<Envelope<User>>("/user/profile", input)).data.data;
  },
  async changePassword(input: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
    await apiClient.put("/user/password", input);
  },
  async orders(page: number, signal?: AbortSignal): Promise<OrderPage> {
    const response = await apiClient.get<Envelope<Order[]>>("/user/orders", { params: { page }, signal });
    return { data: response.data.data, meta: response.data.meta! };
  },
  async addresses(signal?: AbortSignal): Promise<Address[]> {
    return (await apiClient.get<Envelope<Address[]>>("/user/addresses", { signal })).data.data;
  },
  async createAddress(input: AddressInput): Promise<Address> {
    return (await apiClient.post<Envelope<Address>>("/user/addresses", input)).data.data;
  },
  async updateAddress(id: number, input: AddressInput): Promise<Address> {
    return (await apiClient.put<Envelope<Address>>(`/user/addresses/${id}`, input)).data.data;
  },
  async deleteAddress(id: number): Promise<void> {
    await apiClient.delete(`/user/addresses/${id}`);
  },
};
