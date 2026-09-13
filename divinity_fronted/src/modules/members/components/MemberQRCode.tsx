import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

/** Código escaneable del miembro (member_code) para check-in por código/QR. */
export const MemberQRCode = ({ value, size = 140 }: { value: string; size?: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 1 }).catch(() => {});
    }
  }, [value, size]);

  if (!value) return null;

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-[12px] border border-outline-variant bg-white p-2"
    />
  );
};
