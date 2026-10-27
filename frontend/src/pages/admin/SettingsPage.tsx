import { PageHeader } from "../../components/admin/ui.tsx";

/** Trang cài đặt: cố ý để trống theo yêu cầu, sẽ bổ sung sau. */
export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Cài đặt" />
      <div className="rounded-xl border border-dashed border-admin-border-strong bg-admin-surface p-8 text-center text-admin-muted">
        Tính năng cài đặt cửa hàng sẽ được bổ sung trong thời gian tới.
      </div>
    </div>
  );
}
