// Steganalysis and visualization utilities

export interface BitPlaneData {
  plane: ImageData;
  channel: 'red' | 'green' | 'blue';
  bit: number;
}

export interface HistogramData {
  red: number[];
  green: number[];
  blue: number[];
}

export interface RSAnalysisResult {
  rm: number;
  sm: number;
  rMinusM: number;
  sMinusM: number;
  estimatedEmbeddingRate: number;
  detectionRisk: 'low' | 'medium' | 'high';
}

export function extractBitPlane(imageData: ImageData, channel: 'red' | 'green' | 'blue', bit: number = 0): ImageData {
  const { width, height, data } = imageData;
  const result = new Uint8ClampedArray(data.length);
  
  const channelOffset = channel === 'red' ? 0 : channel === 'green' ? 1 : 2;
  const bitMask = 1 << bit;
  
  for (let i = 0; i < data.length; i += 4) {
    const bitValue = (data[i + channelOffset] & bitMask) ? 255 : 0;
    result[i] = bitValue;     // R
    result[i + 1] = bitValue; // G
    result[i + 2] = bitValue; // B
    result[i + 3] = 255;      // A
  }
  
  return new ImageData(result, width, height);
}

export function calculateHistogram(imageData: ImageData): HistogramData {
  const red = new Array(256).fill(0);
  const green = new Array(256).fill(0);
  const blue = new Array(256).fill(0);
  
  const { data } = imageData;
  
  for (let i = 0; i < data.length; i += 4) {
    red[data[i]]++;
    green[data[i + 1]]++;
    blue[data[i + 2]]++;
  }
  
  return { red, green, blue };
}

// RS Steganalysis implementation
// Based on the paper: "Reliable Detection of LSB Steganography in Color and Grayscale Images"
export function rsAnalysis(imageData: ImageData): RSAnalysisResult {
  const { width, height, data } = imageData;
  
  // Flipping functions
  const f1 = (x: number) => x ^ 1; // flip LSB
  const fMinus1 = (x: number) => {
    if (x % 2 === 0) return x + 1;
    return x - 1;
  };
  
  // Discrimination function - variance of differences
  const discriminate = (pixels: number[]): number => {
    let sum = 0;
    for (let i = 1; i < pixels.length; i++) {
      sum += Math.abs(pixels[i] - pixels[i - 1]);
    }
    return sum;
  };
  
  // Apply mask and flip
  const applyMask = (pixels: number[], mask: number[], flipFn: (x: number) => number): number[] => {
    return pixels.map((p, i) => mask[i] === 1 ? flipFn(p) : mask[i] === -1 ? flipFn(p) : p);
  };
  
  // Count regular and singular groups
  let rm = 0, sm = 0, rMinusM = 0, sMinusM = 0;
  let totalGroups = 0;
  
  const blockSize = 4;
  const mask = [0, 1, 1, 0]; // Simple mask pattern
  const minusMask = mask.map(m => -m);
  
  // Analyze red channel only for simplicity
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      const pixels: number[] = [];
      for (let i = 0; i < blockSize; i++) {
        const idx = (y * width + x + i) * 4;
        pixels.push(data[idx]); // Red channel
      }
      
      const original = discriminate(pixels);
      const flipped = discriminate(applyMask(pixels, mask, f1));
      const flippedMinus = discriminate(applyMask(pixels, minusMask, fMinus1));
      
      // Classify groups
      if (flipped > original) rm++;
      else if (flipped < original) sm++;
      
      if (flippedMinus > original) rMinusM++;
      else if (flippedMinus < original) sMinusM++;
      
      totalGroups++;
    }
  }
  
  // Normalize
  rm /= totalGroups;
  sm /= totalGroups;
  rMinusM /= totalGroups;
  sMinusM /= totalGroups;
  
  // Estimate embedding rate using RS equations
  const d0 = rm - sm;
  const dMinus0 = rMinusM - sMinusM;
  
  let estimatedEmbeddingRate = 0;
  if (d0 !== dMinus0) {
    // Simplified estimation
    estimatedEmbeddingRate = Math.abs((d0 - dMinus0) / (d0 + dMinus0 + 0.001));
  }
  
  // Determine detection risk
  let detectionRisk: 'low' | 'medium' | 'high';
  if (estimatedEmbeddingRate < 0.1) {
    detectionRisk = 'low';
  } else if (estimatedEmbeddingRate < 0.3) {
    detectionRisk = 'medium';
  } else {
    detectionRisk = 'high';
  }
  
  return {
    rm,
    sm,
    rMinusM,
    sMinusM,
    estimatedEmbeddingRate,
    detectionRisk,
  };
}

export function compareImages(original: ImageData, stego: ImageData): {
  mse: number;
  psnr: number;
  changedPixels: number;
  totalPixels: number;
} {
  if (original.width !== stego.width || original.height !== stego.height) {
    throw new Error('Images must have the same dimensions');
  }
  
  let sumSquaredError = 0;
  let changedPixels = 0;
  const totalPixels = original.width * original.height;
  
  for (let i = 0; i < original.data.length; i += 4) {
    let pixelChanged = false;
    for (let c = 0; c < 3; c++) { // RGB channels
      const diff = original.data[i + c] - stego.data[i + c];
      sumSquaredError += diff * diff;
      if (diff !== 0) pixelChanged = true;
    }
    if (pixelChanged) changedPixels++;
  }
  
  const mse = sumSquaredError / (totalPixels * 3);
  const psnr = mse > 0 ? 10 * Math.log10((255 * 255) / mse) : Infinity;
  
  return { mse, psnr, changedPixels, totalPixels };
}
