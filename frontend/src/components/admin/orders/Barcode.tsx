import { code128Bars } from "./code128.ts";

export function Barcode({ value, height = 48, className = "" }: { value: string; height?: number; className?: string }) {
  const data = code128Bars(value);
  if (!data) return null;
  return (
    <svg role="img" aria-label={`Mã vạch ${value}`} viewBox={`0 0 ${data.width} ${height}`} preserveAspectRatio="none"
      className={className} style={{ height, width: Math.min(data.width * 1.6, 320) }}>
      <rect width={data.width} height={height} fill="#fff" />
      {data.bars.map((b, i) => <rect key={i} x={b.x} width={b.w} height={height} fill="#000" />)}
    </svg>
  );
}
