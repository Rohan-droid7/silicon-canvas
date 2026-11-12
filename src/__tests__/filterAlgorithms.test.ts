import { describe, expect, it } from 'vitest';
import {
  applyBrightnessContrast,
  applyHistogramEqualization,
  applyInvert,
  applyOtsuThreshold,
  applySobel,
} from '../workers/filterAlgorithms';

describe('Filter Algorithms', () => {
  it('applyInvert is an involution: invert(invert(x)) == x', () => {
    const input = new Uint8ClampedArray([10, 50, 200, 255, 0, 128, 255, 255]);
    const inverted = applyInvert(input);

    expect(inverted[0]).toBe(245);
    expect(inverted[1]).toBe(205);
    expect(inverted[2]).toBe(55);
    expect(inverted[3]).toBe(255); // Alpha preserved

    const doubleInverted = applyInvert(inverted);
    expect(Array.from(doubleInverted)).toEqual(Array.from(input));
  });

  it('applyBrightnessContrast with 0, 0 is an identity transform', () => {
    const input = new Uint8ClampedArray([10, 50, 128, 255, 200, 220, 240, 255]);
    const output = applyBrightnessContrast(input, 0, 0);

    for (let i = 0; i < input.length; i++) {
      expect(output[i]).toBe(input[i]);
    }
  });

  it('applySobel produces zero response on a flat/uniform image', () => {
    const width = 5;
    const height = 5;
    const uniform = new Uint8ClampedArray(width * height * 4);
    // Fill with solid gray
    for (let i = 0; i < uniform.length; i += 4) {
      uniform[i] = 128;
      uniform[i + 1] = 128;
      uniform[i + 2] = 128;
      uniform[i + 3] = 255;
    }

    const edges = applySobel(uniform, width, height);
    // Interior pixels must have magnitude 0
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        expect(edges[idx]).toBe(0);
        expect(edges[idx + 1]).toBe(0);
        expect(edges[idx + 2]).toBe(0);
        expect(edges[idx + 3]).toBe(255);
      }
    }
  });

  it('applyOtsuThreshold separates bimodal pixel distribution', () => {
    // 4x4 image: left half dark (20), right half bright (220)
    const width = 4;
    const height = 4;
    const bimodal = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const val = x < 2 ? 20 : 220;
        bimodal[idx] = val;
        bimodal[idx + 1] = val;
        bimodal[idx + 2] = val;
        bimodal[idx + 3] = 255;
      }
    }

    const binarized = applyOtsuThreshold(bimodal, width, height);

    // Left half must be 0, right half must be 255
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const expected = x < 2 ? 0 : 255;
        expect(binarized[idx]).toBe(expected);
      }
    }
  });

  it('applyHistogramEqualization spans dynamic range across full contrast', () => {
    // Low-contrast image with values clustered tightly around 100-110
    const len = 16;
    const lowContrast = new Uint8ClampedArray(len * 4);
    for (let i = 0; i < len; i++) {
      const v = 100 + (i % 10);
      lowContrast[i * 4] = v;
      lowContrast[i * 4 + 1] = v;
      lowContrast[i * 4 + 2] = v;
      lowContrast[i * 4 + 3] = 255;
    }

    const equalized = applyHistogramEqualization(lowContrast);
    let minVal = 255;
    let maxVal = 0;

    for (let i = 0; i < len; i++) {
      const v = equalized[i * 4];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }

    // Dynamic range must expand significantly (maxVal should reach ~255)
    expect(maxVal).toBeGreaterThanOrEqual(240);
    expect(minVal).toBeLessThanOrEqual(30);
  });
});
