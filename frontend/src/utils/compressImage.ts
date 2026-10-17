/**
 * Shrinks a picked photo to a JPEG data URL before it's uploaded. Phone photos are 3–8MB; the
 * menu reader only needs enough pixels to read text, and several photos have to fit in one
 * request. Falls back to the original file when the browser can't decode it (e.g. HEIC outside
 * Safari) — the server then decides whether it's acceptable.
 */
import { readFileAsDataUrl } from './readFileAsDataUrl';

export const compressImage = async (file: File, maxEdge = 1600, quality = 0.8): Promise<string> => {
  const original = await readFileAsDataUrl(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('decode failed'));
      img.src = original;
    });
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.fillStyle = '#ffffff'; // transparent PNG areas would otherwise turn black in JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const compressed = canvas.toDataURL('image/jpeg', quality);
    return compressed.length < original.length ? compressed : original;
  } catch {
    return original;
  }
};
