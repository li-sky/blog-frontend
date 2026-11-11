// Keep lightbox previews within WebP's dimension limit and mobile memory budgets.
// The original upload is retained separately for full-resolution downloads.
export const MAX_PREVIEW_EDGE = 8192;
export const MAX_PREVIEW_PIXELS = 16_000_000;

export function imageVariantDimensions(width: number, height: number, target: 600 | 1200 | 'full') {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效。');
  }
  if (target !== 'full') {
    const resultWidth = Math.min(target, width);
    return { width: resultWidth, height: Math.max(1, Math.round(height * resultWidth / width)) };
  }
  const scale = Math.min(1, MAX_PREVIEW_EDGE / Math.max(width, height), Math.sqrt(MAX_PREVIEW_PIXELS / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
