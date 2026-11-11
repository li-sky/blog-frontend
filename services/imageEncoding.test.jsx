import { expect, test } from 'bun:test';
import { imageVariantDimensions, MAX_PREVIEW_EDGE, MAX_PREVIEW_PIXELS } from './imageEncoding';

test('panorama previews fit the encoder while preserving the original aspect ratio', () => {
  const result = imageVariantDimensions(18121, 3633, 'full');
  expect(result).toEqual({ width: 8192, height: 1642 });
  expect(result.width / result.height).toBeCloseTo(18121 / 3633, 2);
});

test('portrait and large square previews respect edge and decoded-pixel budgets', () => {
  for (const [width, height] of [[3633,18121],[7008,4672],[32768,32768],[1,100000]]) {
    const result = imageVariantDimensions(width,height,'full');
    expect(Math.max(result.width,result.height)).toBeLessThanOrEqual(MAX_PREVIEW_EDGE);
    expect(result.width * result.height).toBeLessThanOrEqual(MAX_PREVIEW_PIXELS);
    expect(result.width).toBeLessThanOrEqual(width);
    expect(result.height).toBeLessThanOrEqual(height);
  }
});

test('ordinary small images are never upscaled and responsive sizes stay compatible', () => {
  expect(imageVariantDimensions(320,200,'full')).toEqual({width:320,height:200});
  expect(imageVariantDimensions(320,200,600)).toEqual({width:320,height:200});
  expect(imageVariantDimensions(18121,3633,1200)).toEqual({width:1200,height:241});
  expect(() => imageVariantDimensions(0,200,'full')).toThrow();
});
