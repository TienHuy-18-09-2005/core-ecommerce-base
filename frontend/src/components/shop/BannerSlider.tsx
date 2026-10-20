import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";

interface Slide {
  title: string;
  text: string;
  href: string;
  cta: string;
  tone: string;
}

const slides: Slide[] = [
  {
    title: "Đèn LED Panel Rạng Đông",
    text: "Ánh sáng trung thực cho nhà ở và văn phòng. Xem các mẫu đang nổi bật.",
    href: "/san-pham?search=LED",
    cta: "Xem đèn LED",
    tone: "bg-blue-700",
  },
  {
    title: "Thiết bị đóng cắt",
    text: "Aptomat và cầu dao cho tủ điện gia đình. Chọn đúng dòng định mức.",
    href: "/san-pham",
    cta: "Xem danh mục",
    tone: "bg-slate-800",
  },
  {
    title: "Dây cáp điện Cadivi",
    text: "Ruột đồng, cách điện PVC, dùng cho mạch dân dụng.",
    href: "/san-pham?search=Cadivi",
    cta: "Xem dây cáp",
    tone: "bg-amber-700",
  },
];

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BannerSlider() {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const reducedMotion = prefersReducedMotion();
  const paused = hoverPaused || manualPaused || reducedMotion;
  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused]);

  function show(next: number) {
    setIndex((next + slides.length) % slides.length);
  }

  if (!slide) {
    return null;
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={labelId}
      className={`relative overflow-hidden rounded-2xl text-white ${slide.tone}`}
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocus={() => setHoverPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHoverPaused(false);
        }
      }}
    >
      <div className="px-6 py-10 md:px-10 md:py-14">
        <p id={labelId} className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Khuyến mãi
        </p>
        <h2 className="mt-2 max-w-xl text-3xl font-bold">{slide.title}</h2>
        <p className="mt-3 max-w-xl text-base text-white/90">{slide.text}</p>
        <Link
          to={slide.href}
          className="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          {slide.cta}
        </Link>
      </div>
      <div className="flex items-center gap-2 px-6 pb-6 md:px-10">
        <button type="button" className="rounded-full bg-white/15 p-2" aria-label="Ảnh trước" onClick={() => show(index - 1)}>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" className="rounded-full bg-white/15 p-2" aria-label="Ảnh sau" onClick={() => show(index + 1)}>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="rounded-full bg-white/15 p-2"
          aria-label={manualPaused ? "Tiếp tục trình chiếu" : "Tạm dừng trình chiếu"}
          aria-pressed={manualPaused}
          onClick={() => setManualPaused((current) => !current)}
        >
          {manualPaused ? <Play className="h-5 w-5" aria-hidden="true" /> : <Pause className="h-5 w-5" aria-hidden="true" />}
        </button>
        <ol className="ml-2 flex gap-1">
          {slides.map((item, slideIndex) => (
            <li key={item.title}>
              <button
                type="button"
                aria-label={`Chuyển tới ${item.title}`}
                aria-current={slideIndex === index}
                className="inline-flex h-6 w-6 items-center justify-center"
                onClick={() => show(slideIndex)}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${slideIndex === index ? "bg-white" : "bg-white/40"}`}
                />
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
