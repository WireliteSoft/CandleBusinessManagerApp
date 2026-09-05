export function readFileAsDataUrl(file: File): Promise<string> {
  if (file.size > 1_500_000) {
    return Promise.reject(new Error('Images must be 1.5 MB or smaller on the free Cloudflare plan.'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

export function optimizeImageDataUrl(
  sourceDataUrl: string,
  maxDimension = 1000,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(sourceDataUrl);
        return;
      }
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const targetW = Math.max(1, Math.round(width * scale));
      const targetH = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetW, targetH);
      const jpegData = canvas.toDataURL('image/jpeg', quality);
      if (jpegData.length < sourceDataUrl.length) {
        resolve(jpegData);
      } else {
        resolve(sourceDataUrl);
      }
    };
    img.onerror = () => resolve(sourceDataUrl);
    img.src = sourceDataUrl;
  });
}

export async function readFileAsOptimizedDataUrl(file: File): Promise<string> {
  const original = await readFileAsDataUrl(file);
  return optimizeImageDataUrl(original, 1000, 0.78);
}
