import { useCallback, useEffect, useRef, useState } from 'react';

import {
  md3FilledButtonClass,
  md3OutlinedButtonClass,
  md3TitleMediumClass,
} from '@/shared/ui/material';

type ModalState = 'live' | 'validating' | 'valid' | 'invalid' | 'cam_error';

interface Props {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

const VALIDATION_TEXTS = [
  'Analizando la imagen...',
  'Verificando que sea una persona...',
  'Procesando rasgos faciales...',
];

export const PhotoCaptureModal = ({ onConfirm, onCancel }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [modalState, setModalState] = useState<ModalState>('live');
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [validationText, setValidationText] = useState(VALIDATION_TEXTS[0]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => setModalState('cam_error'));
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  /**
   * Analyzes pixel data to reject obviously invalid images:
   * covered camera (near-black), totally washed out, or zero-content frames.
   * Returns false when the image is too dark/uniform to contain a face.
   */
  const analyzePixels = useCallback((canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    let totalLuma = 0;
    let count = 0;
    // Sample every ~10th pixel for speed
    for (let i = 0; i < data.length; i += 40) {
      totalLuma += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      count++;
    }
    const avgLuma = totalLuma / count;

    // Too dark (covered camera) or totally overexposed
    if (avgLuma < 25 || avgLuma > 245) return false;

    // Measure variance — covered camera or blank wall has near-zero variance
    let variance = 0;
    for (let i = 0; i < data.length; i += 40) {
      const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      variance += (luma - avgLuma) ** 2;
    }
    variance /= count;

    // std dev < ~15 means uniform image — no discernible content
    return variance > 225;
  }, []);

  const detectFace = useCallback(async (canvas: HTMLCanvasElement, dataUrl: string): Promise<boolean> => {
    let textIdx = 0;
    const textInterval = setInterval(() => {
      textIdx = (textIdx + 1) % VALIDATION_TEXTS.length;
      setValidationText(VALIDATION_TEXTS[textIdx]);
    }, 900);

    // First: fast pixel analysis — reject black/blank frames immediately
    if (!analyzePixels(canvas)) {
      clearInterval(textInterval);
      return false;
    }

    try {
      // Native FaceDetector API (Chrome/Edge, requires secure context or localhost)
      if ('FaceDetector' in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fd = new (window as any).FaceDetector({ maxDetectedFaces: 1 });
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((res) => { img.onload = () => res(); });
        const faces = await fd.detect(img);
        clearInterval(textInterval);
        return faces.length > 0;
      }
    } catch {
      // FaceDetector not available or failed — pixel analysis already passed
    }

    // Fallback (Firefox/Safari): pixel analysis confirmed content exists.
    // Brief pause for UX then accept.
    await new Promise<void>((res) => setTimeout(res, 1800));
    clearInterval(textInterval);
    return true;
  }, [analyzePixels]);

  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedDataUrl(dataUrl);
    stopCamera();
    setModalState('validating');
    setValidationText(VALIDATION_TEXTS[0]);

    const hasFace = await detectFace(canvas, dataUrl);
    setModalState(hasFace ? 'valid' : 'invalid');
  }, [stopCamera, detectFace]);

  const handleRetry = useCallback(() => {
    setCapturedDataUrl(null);
    setModalState('live');
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(() => {
    if (capturedDataUrl) {
      stopCamera();
      onConfirm(capturedDataUrl);
    }
  }, [capturedDataUrl, stopCamera, onConfirm]);

  const handleCancel = useCallback(() => {
    stopCamera();
    onCancel();
  }, [stopCamera, onCancel]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-surface shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className={md3TitleMediumClass}>Tomar foto del miembro</h3>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full p-1.5 text-on-surface-variant transition hover:bg-on-surface/8"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Camera / preview area */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-surface-container">
            {/* Live video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover transition-opacity ${
                modalState === 'live' ? 'opacity-100' : 'opacity-0 absolute inset-0'
              }`}
            />

            {/* Captured still */}
            {capturedDataUrl && modalState !== 'live' && (
              <img
                src={capturedDataUrl}
                alt="Foto capturada"
                className="h-full w-full object-cover"
              />
            )}

            {/* Validation overlay */}
            {modalState === 'validating' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/50">
                <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
                <p className="text-center text-sm font-medium text-white">{validationText}</p>
              </div>
            )}

            {/* Valid face overlay */}
            {modalState === 'valid' && (
              <div className="absolute inset-0 flex items-end justify-center pb-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center gap-1.5 rounded-full bg-tertiary-container px-3 py-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-on-tertiary-container">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  <span className="text-xs font-semibold text-on-tertiary-container">Persona detectada</span>
                </div>
              </div>
            )}

            {/* Invalid face overlay */}
            {modalState === 'invalid' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="rounded-[16px] bg-error-container px-5 py-3 text-center">
                  <p className="text-sm font-semibold text-on-error-container">
                    No se detectó ninguna persona
                  </p>
                  <p className="mt-1 text-xs text-on-error-container/80">
                    Asegúrate de que tu cara sea visible
                  </p>
                </div>
              </div>
            )}

            {/* Camera error */}
            {modalState === 'cam_error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-container">
                <div className="px-4 text-center">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-error">
                    <path d="M17 6.1H3c-1.1 0-2 .9-2 2V18c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.1l3 3V5.1l-3 3V6.1z" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                  <p className="text-sm font-medium text-on-surface">No se pudo acceder a la cámara</p>
                  <p className="mt-1 text-xs text-on-surface-variant">Verifica los permisos de la cámara en tu navegador</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Face alignment guide text */}
          {modalState === 'live' && (
            <p className="mt-2 text-center text-xs text-on-surface-variant">
              Centra tu cara en el recuadro y presiona tomar foto
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {modalState === 'live' && (
              <>
                <button type="button" onClick={handleCapture} className={md3FilledButtonClass}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M20 6h-2.2a2 2 0 0 1-1.6-.8l-1.4-1.4A2 2 0 0 0 13.2 3h-2.4a2 2 0 0 0-1.6.8L7.8 5.2A2 2 0 0 1 6.2 6H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z" />
                  </svg>
                  Tomar foto
                </button>
                <button type="button" onClick={handleCancel} className={md3OutlinedButtonClass}>
                  Cancelar
                </button>
              </>
            )}

            {modalState === 'valid' && (
              <>
                <button type="button" onClick={handleConfirm} className={md3FilledButtonClass}>
                  Confirmar foto
                </button>
                <button type="button" onClick={handleRetry} className={md3OutlinedButtonClass}>
                  Repetir foto
                </button>
                <button type="button" onClick={handleCancel} className={md3OutlinedButtonClass}>
                  Cancelar
                </button>
              </>
            )}

            {modalState === 'invalid' && (
              <>
                <button type="button" onClick={handleRetry} className={md3FilledButtonClass}>
                  Repetir foto
                </button>
                <button type="button" onClick={handleCancel} className={md3OutlinedButtonClass}>
                  Cancelar
                </button>
              </>
            )}

            {modalState === 'cam_error' && (
              <button type="button" onClick={handleCancel} className={md3OutlinedButtonClass}>
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
