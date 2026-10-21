import { isValidVnPhone } from "./vnPhone.ts";

export type RegisterFields = { name: string; email: string; phone: string; password: string; password_confirmation: string };

export function validateRegister(f: RegisterFields): Record<string, string> {
  const e: Record<string, string> = {};
  if (!f.name.trim()) e.name = "Vui lòng nhập họ tên.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Email không hợp lệ.";
  if (f.phone.trim() && !isValidVnPhone(f.phone)) e.phone = "Số điện thoại không hợp lệ.";
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) {
    e.password = "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số.";
  }
  if (f.password !== f.password_confirmation) e.password_confirmation = "Mật khẩu xác nhận không khớp.";
  return e;
}

export function validateNewPassword(password: string, confirmation: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    e.password = "Mật khẩu tối thiểu 8 ký tự, gồm cả chữ và số.";
  }
  if (password !== confirmation) e.password_confirmation = "Mật khẩu xác nhận không khớp.";
  return e;
}
