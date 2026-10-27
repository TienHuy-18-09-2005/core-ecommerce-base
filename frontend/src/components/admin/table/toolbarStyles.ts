/** Kiểu dùng chung cho thanh công cụ bảng: mọi ô/nút cao 40px, cùng bo góc và viền. */
export const toolLabel = "block text-xs font-medium leading-4 text-admin-muted";
const ctl = "h-10 rounded-lg border bg-admin-surface px-3 text-sm text-admin-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-primary/40";
export const ctlIdle = `${ctl} border-admin-border-strong`;
export const ctlOn = `${ctl} border-admin-primary bg-admin-primary/10 font-medium text-admin-primary`;
export const toolBtn = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-admin-border-strong bg-admin-surface px-3 text-sm font-medium text-admin-fg-soft hover:bg-admin-subtle";
export const toolBtnOn = "inline-flex h-10 items-center gap-1.5 rounded-lg border border-admin-primary bg-admin-surface px-3 text-sm font-medium text-admin-primary hover:bg-admin-subtle";
export const ghostBtn = "inline-flex h-10 items-center gap-1 rounded-lg px-2 text-sm text-admin-muted hover:bg-admin-subtle hover:text-admin-fg";
