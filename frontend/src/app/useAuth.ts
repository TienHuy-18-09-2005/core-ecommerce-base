import { createContext, useContext } from "react";
import type { LoginInput, RegisterInput } from "../services/authService.ts";
import type { AuthResult, CartAdjustment, User } from "../types/auth.ts";

export interface AuthContextValue {
  user: User | null;
  /** true khi đang khôi phục phiên lần đầu (gọi /api/user). */
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthResult>;
  register: (input: RegisterInput) => Promise<AuthResult>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  cartAdjustments: CartAdjustment[];
  dismissCartAdjustments: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const authQueryKey = ["auth", "me"] as const;

const notReady = () => Promise.reject(new Error("AuthProvider chưa được gắn."));

/** Ngoài AuthProvider (vd. test component đơn lẻ) coi như khách. */
const GUEST: AuthContextValue = {
  user: null,
  isLoading: false,
  login: notReady,
  register: notReady,
  logout: notReady,
  setUser: () => {},
  cartAdjustments: [],
  dismissCartAdjustments: () => {},
};

export function useAuth(): AuthContextValue {
  return useContext(AuthContext) ?? GUEST;
}
