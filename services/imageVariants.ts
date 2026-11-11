import { EncodedImageVariant } from '../types';

interface WorkerResponse {
  id: number;
  variants?: Array<{
    targetWidth: 600 | 1200 | 'full';
    buffer: ArrayBuffer;
  }>;
  error?: string;
}

let requestId = 0;

export const isAnimatedImage = (mimeType: string, filename = '') =>
  mimeType.toLowerCase() === 'image/gif'
  || filename.toLowerCase().split('?')[0].endsWith('.gif');

export const encodeImageVariants = (
  source: Blob,
  quality = 82,
): Promise<EncodedImageVariant[]> => {
  if (source.size > 50 * 1024 * 1024) {
    return Promise.reject(new Error('图片大小不能超过 50 MB。'));
  }
  if (isAnimatedImage(source.type)) {
    return Promise.resolve([]);
  }

  const id = ++requestId;
  const worker = new Worker(
    new URL('../workers/imageEncoder.worker.ts', import.meta.url),
    { type: 'module' },
  );

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('图片处理超时，请缩小图片后重试。'));
    }, 90000);
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      clearTimeout(timeout);
      worker.terminate();

      if (event.data.error) {
        reject(new Error(event.data.error));
        return;
      }

      resolve((event.data.variants || []).map((variant) => ({
        targetWidth: variant.targetWidth,
        blob: new Blob([variant.buffer], { type: 'image/webp' }),
      })));
    };

    worker.onerror = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message || 'Image encoding worker failed.'));
    };

    worker.postMessage({ id, source, quality });
  });
};

export const getStaticVariantUrl = (
  source: string,
  targetWidth: 600 | 1200 | 'full',
): string | null => {
  if (!source || isAnimatedImage('', source)) return null;

  try {
    const parsed = new URL(source, window.location.origin);
    const match = parsed.pathname.match(/^(.*)\.(jpe?g|png|webp)$/i);
    if (!match) return null;

    const suffix = targetWidth === 'full' ? 'full' : `w${targetWidth}`;
    parsed.pathname = `${match[1]}_${suffix}.webp`;
    parsed.search = '';
    parsed.hash = '';

    return source.startsWith('http://') || source.startsWith('https://')
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
};

export const getResponsiveImageProps = (source: string) => {
  const webp600 = getStaticVariantUrl(source, 600);
  const webp1200 = getStaticVariantUrl(source, 1200);

  if (!webp600 || !webp1200) {
    return { src: source, srcSet: undefined };
  }

  return {
    src: webp1200,
    srcSet: `${webp600} 600w, ${webp1200} 1200w`,
  };
};
