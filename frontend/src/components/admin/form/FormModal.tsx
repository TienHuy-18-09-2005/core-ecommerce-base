import { useId, useRef, type FormEvent, type ReactNode } from "react";
import { Modal, useConfirm } from "../overlay/Modal.tsx";
import { btnPrimary, btnSecondary } from "../../../utils/adminFormat.ts";
import { useSaveShortcut } from "./FormField.tsx";

/**
 * Modal chứa biểu mẫu thêm/sửa: bẫy focus + ESC (từ Modal), Ctrl+S để lưu,
 * đóng khi còn thay đổi chưa lưu → hỏi "Bỏ thay đổi?".
 */
export function FormModal({ title, size = "md", isDirty, onClose, onSubmit, saving, submitLabel = "Lưu", savingLabel = "Đang lưu...", extraActions, children }: {
  title: string; size?: "md" | "lg" | "xl"; isDirty: () => boolean; onClose: () => void; onSubmit: () => void;
  saving?: boolean; submitLabel?: string; savingLabel?: string; extraActions?: ReactNode; children: ReactNode;
}) {
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();
  useSaveShortcut(formRef);

  const requestClose = async () => {
    if (saving) return;
    if (isDirty() && !(await confirm({ title: "Bỏ thay đổi?", message: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Bỏ thay đổi", cancelLabel: "Tiếp tục sửa", danger: true }))) return;
    onClose();
  };

  const submit = (e: FormEvent) => { e.preventDefault(); if (!saving) onSubmit(); };

  return (
    <Modal open size={size} title={title} onClose={() => void requestClose()} footer={<>
      {extraActions && <div className="mr-auto flex flex-wrap gap-2">{extraActions}</div>}
      <button type="button" className={btnSecondary} onClick={() => void requestClose()}>Hủy</button>
      <button type="submit" form={formId} className={btnPrimary} disabled={saving}>{saving ? savingLabel : submitLabel}</button>
    </>}>
      <form id={formId} ref={formRef} onSubmit={submit} noValidate className="space-y-4">{children}</form>
    </Modal>
  );
}
