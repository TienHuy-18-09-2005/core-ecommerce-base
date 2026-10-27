import { cloneElement, isValidElement, useCallback, useEffect, useId, useRef, type ReactElement, type ReactNode, type RefObject } from "react";
import { useBlocker } from "react-router-dom";
import { ConfirmModal } from "../overlay/Modal.tsx";

type ControlProps = {
  id?: string; className?: string; required?: boolean;
  "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false"; "aria-required"?: boolean;
};

/**
 * Trường biểu mẫu thống nhất: nhãn (gắn htmlFor), dấu * bắt buộc, gợi ý, lỗi.
 * Tự gắn id, aria-describedby (gợi ý + lỗi), aria-invalid, aria-required vào ô nhập con.
 * Lỗi lấy từ `errors` chuẩn `{success,code,message,errors}` qua firstFieldErrors.
 */
export function FormField({ label, hint, error, required, children, className = "" }: {
  label: ReactNode; hint?: ReactNode; error?: string; required?: boolean; children: ReactElement<ControlProps>; className?: string;
}) {
  const auto = useId();
  const child = isValidElement(children) ? children : null;
  const id = child?.props.id ?? `f${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child?.props["aria-describedby"], hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`block text-sm ${className}`}>
      <div className="mb-1 flex items-baseline gap-0.5">
        <label htmlFor={id} className="font-medium text-admin-fg-soft">{label}</label>
        {/* Dấu * chỉ để nhìn; trình đọc màn hình nhận "bắt buộc" qua aria-required trên ô nhập. */}
        {required && <span aria-hidden className="text-admin-danger">*</span>}
      </div>
      {child && cloneElement(child, {
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
        "aria-required": required || undefined,
        className: `${child.props.className ?? ""}${error ? " border-admin-danger! focus:ring-1 focus:ring-admin-danger" : ""}`,
      })}
      {hint && <p id={hintId} className="mt-1 text-xs text-admin-muted">{hint}</p>}
      {error && <p id={errorId} role="alert" className="mt-1 text-xs text-admin-danger">{error}</p>}
    </div>
  );
}

/** Ô chọn (checkbox/radio) kèm nhãn bên phải, có gợi ý tùy chọn. */
export function CheckboxField({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactElement<ControlProps> }) {
  const auto = useId();
  const id = children.props.id ?? `c${auto}`;
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="text-sm">
      <label htmlFor={id} className="inline-flex items-center gap-2 text-admin-fg">
        {cloneElement(children, { id, "aria-describedby": hintId, className: `${children.props.className ?? ""} size-4 accent-admin-primary` })}
        {label}
      </label>
      {hint && <p id={hintId} className="ml-6 text-xs text-admin-muted">{hint}</p>}
    </div>
  );
}

/**
 * Cảnh báo rời trang khi có thay đổi chưa lưu (điều hướng trong app + đóng tab).
 * Trả về `markClean(v)` để đặt mốc "đã lưu" mới.
 */
export function useUnsavedChanges<T>(value: T) {
  const snapshot = useRef(JSON.stringify(value));
  const current = useRef(value);
  current.current = value;
  const isDirty = () => JSON.stringify(current.current) !== snapshot.current;
  const markClean = useCallback((v?: unknown) => { snapshot.current = JSON.stringify(v === undefined ? current.current : v); }, []);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname && JSON.stringify(current.current) !== snapshot.current);

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => { if (JSON.stringify(current.current) !== snapshot.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, []);

  const prompt = (
    <ConfirmModal open={blocker.state === "blocked"} danger title="Rời trang khi chưa lưu?"
      message="Các thay đổi chưa lưu sẽ bị mất." confirmLabel="Rời trang" cancelLabel="Ở lại"
      onConfirm={() => blocker.proceed?.()} onCancel={() => blocker.reset?.()} />
  );
  return { isDirty, markClean, prompt };
}

/** Ctrl+S / Cmd+S gửi biểu mẫu. */
export function useSaveShortcut(form: RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && form.current) {
        e.preventDefault();
        form.current.requestSubmit();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [form]);
}
