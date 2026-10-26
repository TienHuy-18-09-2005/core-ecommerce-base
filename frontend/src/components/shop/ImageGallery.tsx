import { useState } from "react";
import { ProductImage } from "./ProductImage.tsx";

export interface GalleryImage {
  src?: string | null;
  alt: string;
}

/** Task 3.10: ảnh chính + thumbnail; điều hướng bằng nút (bàn phím được), ảnh qua ProductImage (lọc URL an toàn). */
export function ImageGallery({ images, activeSrc }: { images: GalleryImage[]; activeSrc?: string | null }) {
  const list = images.filter((image, index, all) => image.src && all.findIndex((x) => x.src === image.src) === index);
  const [selected, setSelected] = useState(0);
  const [prevActive, setPrevActive] = useState(activeSrc);

  // Đổi biến thể có ảnh riêng → nhảy tới ảnh đó
  if (prevActive !== activeSrc) {
    setPrevActive(activeSrc);
    const found = list.findIndex((image) => image.src === activeSrc);
    if (found >= 0) {
      setSelected(found);
    }
  }

  const current = list[selected] ?? list[0] ?? { src: undefined, alt: images[0]?.alt ?? "" };

  return (
    <div>
      <ProductImage src={current.src ?? undefined} alt={current.alt} priority width={800} height={800} className="h-64 sm:h-96 w-full rounded-xl border object-cover shadow-sm" />
      {list.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto" aria-label="Ảnh sản phẩm">
          {list.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                aria-label={`Xem ảnh ${index + 1}`}
                aria-current={index === selected ? "true" : undefined}
                onClick={() => setSelected(index)}
                className={`block rounded-lg border-2 ${index === selected ? "border-blue-600" : "border-transparent"}`}
              >
                <ProductImage src={image.src ?? undefined} alt="" className="h-16 w-16 rounded-md object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
