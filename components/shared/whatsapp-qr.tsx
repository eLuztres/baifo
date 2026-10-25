import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

interface WhatsAppQrProps {
  url: string;
  /** What a scan does, for screen readers, e.g. "Scan to sell on WhatsApp". */
  label: string;
  className?: string;
}

// Room around the code that scanners need to find it, in modules.
const QUIET_ZONE = 2;

/** A QR code that opens the link on a phone; drawn as one SVG path from the code's modules, no injected HTML. */
export default function WhatsAppQr({ url, label, className }: WhatsAppQrProps) {
  const { size, data } = QRCode.create(url, { errorCorrectionLevel: 'M' }).modules;
  const path = Array.from({ length: size * size }, (_, index) => index)
    .filter((index) => data[index])
    .map((index) => `M${(index % size) + QUIET_ZONE} ${Math.floor(index / size) + QUIET_ZONE}h1v1h-1z`)
    .join('');
  const box = size + QUIET_ZONE * 2;

  return (
    <svg viewBox={`0 0 ${box} ${box}`} role='img' aria-label={label} shapeRendering='crispEdges' className={cn('block', className)}>
      <rect width={box} height={box} fill='var(--background)' />
      <path d={path} fill='var(--foreground)' />
    </svg>
  );
}
