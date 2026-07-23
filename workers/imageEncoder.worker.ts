/// <reference lib="webworker" />

import encode from '@jsquash/webp/encode.js';

interface EncodeRequest {
  id: number;
  source: Blob;
  quality: number;
}

interface EncodedVariant {
  targetWidth: 600 | 1200 | 'full';
  buffer: ArrayBuffer;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.onmessage = async (event: MessageEvent<EncodeRequest>) => {
  const { id, source, quality } = event.data;
  let bitmap: ImageBitmap | null = null;

  try {
    bitmap = await createImageBitmap(source, {
      imageOrientation: 'from-image',
      premultiplyAlpha: 'default',
      colorSpaceConversion: 'default',
    });

    const variants: EncodedVariant[] = [];
    for (const targetWidth of [600, 1200, 'full'] as const) {
      // Small originals are never enlarged. We still create every canonical
      // filename so rendering can use deterministic URLs without an API lookup.
      const width = targetWidth === 'full'
        ? bitmap.width
        : Math.min(targetWidth, bitmap.width);
      const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width));
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) {
        throw new Error('This browser cannot create an offscreen 2D canvas.');
      }

      context.drawImage(bitmap, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const encoded = await encode(imageData, {
        quality,
        method: 4,
      });

      variants.push({
        targetWidth,
        buffer: encoded,
      });
    }

    workerScope.postMessage(
      { id, variants },
      variants.map((variant) => variant.buffer),
    );
  } catch (error) {
    workerScope.postMessage({
      id,
      error: error instanceof Error ? error.message : 'Image encoding failed.',
    });
  } finally {
    bitmap?.close();
  }
};

export {};
