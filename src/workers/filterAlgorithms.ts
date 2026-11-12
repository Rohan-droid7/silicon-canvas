/** Convert RGBA pixel data to grayscale array (normalized length = total pixels) */
export function toGrayscale(data: Uint8ClampedArray): Float32Array {
  const gray = new Float32Array(data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/** 3x3 Sobel edge detection highlighting wafer boundaries and micro-fractures */
export function applySobel(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const gray = toGrayscale(data);
  const out = new Uint8ClampedArray(data.length);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      const gx =
        -1 * gray[idx - width - 1] + 1 * gray[idx - width + 1] +
        -2 * gray[idx - 1]         + 2 * gray[idx + 1] +
        -1 * gray[idx + width - 1] + 1 * gray[idx + width + 1];

      const gy =
        -1 * gray[idx - width - 1] - 2 * gray[idx - width] - 1 * gray[idx - width + 1] +
         1 * gray[idx + width - 1] + 2 * gray[idx + width] + 1 * gray[idx + width + 1];

      const mag = Math.min(255, Math.hypot(gx, gy));
      const oi = idx * 4;
      out[oi] = mag;
      out[oi + 1] = mag;
      out[oi + 2] = mag;
      out[oi + 3] = 255;
    }
  }

  // Preserve edge borders with zero magnitude
  for (let x = 0; x < width; x++) {
    const topIdx = x * 4;
    const botIdx = ((height - 1) * width + x) * 4;
    out[topIdx + 3] = 255;
    out[botIdx + 3] = 255;
  }
  for (let y = 0; y < height; y++) {
    const leftIdx = (y * width) * 4;
    const rightIdx = (y * width + (width - 1)) * 4;
    out[leftIdx + 3] = 255;
    out[rightIdx + 3] = 255;
  }

  return out;
}

/** Histogram equalization for electron microscopy scans with low contrast */
export function applyHistogramEqualization(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  const totalPixels = data.length / 4;

  if (totalPixels === 0) return out;

  for (let ch = 0; ch < 3; ch++) {
    const hist = new Uint32Array(256);
    for (let i = ch; i < data.length; i += 4) {
      hist[data[i]]++;
    }

    // Cumulative Distribution Function (CDF)
    const cdf = new Uint32Array(256);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + hist[i];
    }

    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] > 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    const denom = Math.max(totalPixels - cdfMin, 1);

    for (let i = ch; i < data.length; i += 4) {
      out[i] = Math.round(((cdf[data[i]] - cdfMin) / denom) * 255);
    }
  }

  // Copy alpha channel unmodified
  for (let i = 3; i < data.length; i += 4) {
    out[i] = data[i];
  }

  return out;
}

/** Otsu automated binarization separating defects from substrate */
export function applyOtsuThreshold(
  data: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const gray = toGrayscale(data);
  const totalPixels = width * height;

  if (totalPixels === 0) return new Uint8ClampedArray(data.length);

  const hist = new Uint32Array(256);
  for (let i = 0; i < totalPixels; i++) {
    const v = Math.min(255, Math.max(0, Math.round(gray[i])));
    hist[v]++;
  }

  let sumTotal = 0;
  for (let i = 0; i < 256; i++) {
    sumTotal += i * hist[i];
  }

  let sumBg = 0;
  let wBg = 0;
  let bestThresh = 128;
  let bestVar = -1;

  for (let t = 0; t < 256; t++) {
    wBg += hist[t];
    if (wBg === 0) continue;
    const wFg = totalPixels - wBg;
    if (wFg === 0) break;

    sumBg += t * hist[t];
    const meanBg = sumBg / wBg;
    const meanFg = (sumTotal - sumBg) / wFg;
    const variance = wBg * wFg * (meanBg - meanFg) ** 2;

    if (variance > bestVar) {
      bestVar = variance;
      bestThresh = t;
    }
  }

  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < totalPixels; i++) {
    const val = gray[i] > bestThresh ? 255 : 0;
    const oi = i * 4;
    out[oi] = val;
    out[oi + 1] = val;
    out[oi + 2] = val;
    out[oi + 3] = 255;
  }

  return out;
}

/** Real-time brightness & contrast adjustment using lookup table */
export function applyBrightnessContrast(
  data: Uint8ClampedArray,
  brightness: number,
  contrast: number
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  // Contrast factor: map [-100, +100] to [0.0, 3.0] with 0 = normal
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  // Build precomputed LUT for speed
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const adjusted = factor * (i - 128) + 128 + brightness;
    lut[i] = Math.max(0, Math.min(255, Math.round(adjusted)));
  }

  for (let i = 0; i < data.length; i += 4) {
    out[i] = lut[data[i]];
    out[i + 1] = lut[data[i + 1]];
    out[i + 2] = lut[data[i + 2]];
    out[i + 3] = data[i + 3];
  }

  return out;
}

/** Inverts RGB channels (negative SEM view) */
export function applyInvert(data: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    out[i] = 255 - data[i];
    out[i + 1] = 255 - data[i + 1];
    out[i + 2] = 255 - data[i + 2];
    out[i + 3] = data[i + 3]; // Alpha unchanged
  }
  return out;
}
