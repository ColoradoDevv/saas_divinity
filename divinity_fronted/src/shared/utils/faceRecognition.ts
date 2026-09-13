import * as faceapi from 'face-api.js';

// Pesos servidos como estáticos desde public/models (self-hosted, sin depender
// de un CDN externo en tiempo de ejecución).
const MODEL_URL = '/models';

let loadingPromise: Promise<void> | null = null;

/** Carga (una sola vez) los modelos necesarios para detectar y describir un rostro. */
export const loadFaceModels = (): Promise<void> => {
  if (!loadingPromise) {
    loadingPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined);
  }
  return loadingPromise;
};

/**
 * Calcula el descriptor facial (128 floats) de la imagen dada.
 * Devuelve null si no se detectó ningún rostro.
 */
export const computeFaceDescriptor = async (
  input: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement,
): Promise<number[] | null> => {
  await loadFaceModels();
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return Array.from(detection.descriptor);
};

/** Umbral recomendado por face-api.js para considerar que dos descriptores son la misma persona. */
export const FACE_MATCH_THRESHOLD = 0.6;

const faceDistance = (a: number[], b: number[]): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/** Verificación 1:1 — ¿el descriptor en vivo corresponde al descriptor guardado de un miembro puntual? */
export const isFaceMatch = (a: number[], b: number[]): boolean => faceDistance(a, b) < FACE_MATCH_THRESHOLD;
