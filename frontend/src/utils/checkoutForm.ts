import type { CheckoutInput } from "../types/order.ts";
import { isValidVnPhone } from "./vnPhone.ts";

export type CheckoutFormFields = Omit<CheckoutInput, "payment_method" | "coupon_code">;
export type CheckoutFieldName = keyof CheckoutFormFields;

export const EMPTY_CHECKOUT_FORM: CheckoutFormFields = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  shipping_province: "",
  shipping_district: "",
  shipping_ward: "",
  shipping_address: "",
  customer_note: "",
};

export const CHECKOUT_FIELDS: { name: CheckoutFieldName; label: string; required: boolean; type?: string; autoComplete?: string }[] = [
  { name: "customer_name", label: "Họ và tên", required: true, autoComplete: "name" },
  { name: "customer_phone", label: "Số điện thoại", required: true, type: "tel", autoComplete: "tel" },
  { name: "customer_email", label: "Email (không bắt buộc)", required: false, type: "email", autoComplete: "email" },
  { name: "shipping_province", label: "Tỉnh/Thành phố", required: true, autoComplete: "address-level1" },
  { name: "shipping_district", label: "Quận/Huyện", required: true, autoComplete: "address-level2" },
  { name: "shipping_ward", label: "Phường/Xã", required: true, autoComplete: "address-level3" },
  { name: "shipping_address", label: "Địa chỉ cụ thể", required: true, autoComplete: "street-address" },
];

export function validateCheckout(form: CheckoutFormFields): Partial<Record<CheckoutFieldName, string>> {
  const errors: Partial<Record<CheckoutFieldName, string>> = {};
  for (const field of CHECKOUT_FIELDS) {
    if (field.required && !form[field.name]?.trim()) {
      errors[field.name] = `Vui lòng nhập ${field.label.toLowerCase()}.`;
    }
  }
  if (form.customer_phone.trim() && !isValidVnPhone(form.customer_phone)) {
    errors.customer_phone = "Số điện thoại di động Việt Nam không hợp lệ.";
  }
  if (form.customer_email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email.trim())) {
    errors.customer_email = "Email không hợp lệ.";
  }
  return errors;
}
