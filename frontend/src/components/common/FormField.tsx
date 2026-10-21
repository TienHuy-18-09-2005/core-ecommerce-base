import type { InputHTMLAttributes } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
}

export function FormField({ label, name, error, className, ...rest }: Props) {
  const errorId = `${name}-error`;
  return (
    <label className={`block text-sm font-medium ${className ?? ""}`}>
      {label}
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        {...rest}
      />
      {error ? <span id={errorId} className="mt-1 block text-xs text-red-700">{error}</span> : null}
    </label>
  );
}
