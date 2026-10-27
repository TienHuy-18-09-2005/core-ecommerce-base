import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { useRef, useState, type ReactNode } from "react";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Tải ảnh lên máy chủ, trả về URL /storage/... (ảnh ngoài bị bộ lọc HTML loại bỏ). */
  onUploadImage: (file: File) => Promise<string>;
  onError?: (e: unknown) => void;
  labelId?: string;
  invalid?: boolean;
}

/** Trình soạn thảo mô tả sản phẩm (Tiptap). Tải lười — chỉ nạp khi mở tab Thông tin chung. */
export default function RichTextEditor({ value, onChange, onUploadImage, onError, labelId, invalid }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false, codeBlock: false, strike: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"], HTMLAttributes: { rel: "nofollow noopener", target: null } },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
    ],
    content: value || "",
    immediatelyRender: true,
    editorProps: {
      attributes: {
        class: "rich-prose min-h-56 max-h-[28rem] overflow-y-auto px-3 py-2 focus:outline-none",
        role: "textbox", "aria-multiline": "true",
        ...(labelId ? { "aria-labelledby": labelId } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  return (
    <div className={`rounded-lg border bg-admin-surface ${invalid ? "border-admin-danger" : "border-admin-border"} focus-within:ring-2 focus-within:ring-admin-primary/40`}>
      {editor && <Toolbar editor={editor} onUploadImage={onUploadImage} onError={onError} />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor, onUploadImage, onError }: { editor: Editor; onUploadImage: (f: File) => Promise<string>; onError?: (e: unknown) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
      h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }), h4: e.isActive("heading", { level: 4 }),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"), link: e.isActive("link"),
      table: e.isActive("table"), undo: e.can().undo(), redo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();

  const setLink = () => {
    const prev = (editor.getAttributes("link").href as string | undefined) ?? "https://";
    const url = window.prompt("Địa chỉ liên kết (để trống để bỏ liên kết):", prev);
    if (url === null) return;
    if (url.trim() === "") { c().extendMarkRange("link").unsetLink().run(); return; }
    if (!/^(https?:|mailto:|tel:|\/)/i.test(url.trim())) { window.alert("Chỉ hỗ trợ liên kết http(s), mailto, tel hoặc đường dẫn nội bộ."); return; }
    c().extendMarkRange("link").setLink({ href: url.trim() }).run();
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setUploading(true);
    try {
      const src = await onUploadImage(f);
      c().setImage({ src, alt: f.name.replace(/\.[^.]+$/, "") }).run();
    } catch (e) {
      onError?.(e);
    } finally {
      setUploading(false);
      if (file.current) file.current.value = "";
    }
  };

  return (
    <div role="toolbar" aria-label="Định dạng mô tả" className="flex flex-wrap items-center gap-0.5 border-b border-admin-border px-1.5 py-1">
      <B label="Hoàn tác" onClick={() => c().undo().run()} disabled={!s.undo}>↶</B>
      <B label="Làm lại" onClick={() => c().redo().run()} disabled={!s.redo}>↷</B>
      <Sep />
      <B label="Tiêu đề 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>H2</B>
      <B label="Tiêu đề 3" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>H3</B>
      <B label="Tiêu đề 4" active={s.h4} onClick={() => c().toggleHeading({ level: 4 }).run()}>H4</B>
      <Sep />
      <B label="In đậm" active={s.bold} onClick={() => c().toggleBold().run()}><strong>B</strong></B>
      <B label="In nghiêng" active={s.italic} onClick={() => c().toggleItalic().run()}><em>I</em></B>
      <B label="Gạch chân" active={s.underline} onClick={() => c().toggleUnderline().run()}><u>U</u></B>
      <Sep />
      <B label="Danh sách chấm" active={s.ul} onClick={() => c().toggleBulletList().run()}>•≡</B>
      <B label="Danh sách số" active={s.ol} onClick={() => c().toggleOrderedList().run()}>1≡</B>
      <B label="Trích dẫn" active={s.quote} onClick={() => c().toggleBlockquote().run()}>❝</B>
      <Sep />
      <B label={s.link ? "Sửa liên kết" : "Chèn liên kết"} active={s.link} onClick={setLink}>🔗</B>
      <B label="Chèn ảnh (tải lên)" disabled={uploading} onClick={() => file.current?.click()}>{uploading ? "…" : "🖼"}</B>
      <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void onFile(e.target.files?.[0])} />
      <Sep />
      {!s.table ? (
        <B label="Chèn bảng 3×3" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>▦</B>
      ) : (<>
        <B label="Thêm hàng" onClick={() => c().addRowAfter().run()}>+H</B>
        <B label="Thêm cột" onClick={() => c().addColumnAfter().run()}>+C</B>
        <B label="Xóa hàng" onClick={() => c().deleteRow().run()}>−H</B>
        <B label="Xóa cột" onClick={() => c().deleteColumn().run()}>−C</B>
        <B label="Xóa bảng" onClick={() => c().deleteTable().run()}>✕▦</B>
      </>)}
    </div>
  );
}

function B({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={active === undefined ? undefined : active} disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={`min-w-8 rounded px-1.5 py-1 text-sm leading-none ${active ? "bg-admin-primary-subtle text-admin-primary" : "text-admin-fg-soft hover:bg-admin-subtle"} disabled:opacity-40`}>
      {children}
    </button>
  );
}
const Sep = () => <span aria-hidden="true" className="mx-1 h-5 w-px bg-admin-border" />;
