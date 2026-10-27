import { useEffect, useRef, useState } from "react";
import { Modal } from "../overlay/Modal.tsx";
import { FormField } from "../form/FormField.tsx";
import { btnSecondary, inputClass } from "../../../utils/adminFormat.ts";

const QUICK = ["Khách yêu cầu hủy", "Không liên lạc được khách", "Hết hàng", "Đơn trùng / đặt nhầm"];
const danger = "rounded-lg bg-admin-danger px-4 py-2 text-sm font-semibold text-admin-on-primary hover:opacity-90 disabled:opacity-50";

/** Hủy đơn bắt buộc nhập lý do (≥ 3 ký tự). Dùng cho chi tiết đơn và hủy hàng loạt. */
export function CancelReasonModal({ open, onClose, onSubmit, count = 1, pending, serverError }: {
  open: boolean; onClose: () => void; onSubmit: (reason: string) => void; count?: number; pending?: boolean; serverError?: string;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open) { setReason(""); setTouched(false); } }, [open]);
  const trimmed = reason.trim();
  const error = serverError ?? (touched && trimmed.length < 3 ? "Vui lòng nhập lý do hủy (ít nhất 3 ký tự)." : undefined);
  const submit = () => {
    setTouched(true);
    if (trimmed.length >= 3) onSubmit(trimmed);
  };
  return (
    <Modal open={open} onClose={onClose} title={count > 1 ? `Hủy ${count} đơn hàng?` : "Hủy đơn hàng?"} size="sm" role="alertdialog" initialFocus={input}
      description={<p className="mb-3">Hủy đơn sẽ hoàn lại tồn kho và lượt dùng mã giảm giá. Thao tác này không hoàn tác được.</p>}
      footer={<>
        <button type="button" className={btnSecondary} onClick={onClose}>Không</button>
        <button type="button" className={danger} disabled={pending} onClick={submit}>{pending ? "Đang hủy..." : count > 1 ? `Hủy ${count} đơn` : "Hủy đơn"}</button>
      </>}>
      <FormField label="Lý do hủy" error={error} required>
        <textarea ref={input} className={inputClass} rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} />
      </FormField>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Lý do thường gặp">
        {QUICK.map((q) => (
          <button key={q} type="button" onClick={() => setReason(q)} className="rounded-full border border-admin-border px-3 py-1 text-xs text-admin-fg-soft hover:bg-admin-subtle">{q}</button>
        ))}
      </div>
    </Modal>
  );
}
