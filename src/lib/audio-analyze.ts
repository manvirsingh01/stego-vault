// Audio Steganalysis Toolkit
// Statistical analysis tools to detect potential steganographic content

import type { AudioBitDepth } from './audio-encoder';

export interface AudioAnalysisResult {
  snrDb: number | null;
  lsbZeroRatio: number;
  lsbOneRatio: number;
  chiSquareStat: number;
  estimatedEmbeddingRate: number;
  detectionRisk: 'low' | 'medium' | 'high';
  sampleCount: number;
  duration: number;
  sampleRate: number;
  channels: number;
  capacityBytes: { [key: string]: number };
}

/**
 * Run statistical steganalysis on an AudioBuffer.
 * Detects anomalous LSB distributions that indicate hidden data.
 */
export function analyzeAudio(buffer: AudioBuffer): AudioAnalysisResult {
  const data = buffer.getChannelData(0);
  const N = data.length;
  const analyzeSamples = Math.min(N, 50000);

  let lsbOnes = 0;
  let lsbZeros = 0;
  const pairCounts = new Array(4).fill(0); // 00, 01, 10, 11

  for (let i = 0; i < analyzeSamples; i++) {
    const sInt = clampInt16(data[i]);
    const lsb = sInt & 1;
    if (lsb === 1) lsbOnes++;
    else lsbZeros++;

    if (i + 1 < analyzeSamples) {
      const nextSInt = clampInt16(data[i + 1]);
      const nextLsb = nextSInt & 1;
      pairCounts[lsb * 2 + nextLsb]++;
    }
  }

  const lsbZeroRatio = lsbZeros / analyzeSamples;
  const lsbOneRatio = lsbOnes / analyzeSamples;

  // Chi-square test on LSB pair distribution
  // Natural audio has correlated LSBs; embedded data has independent random LSBs
  const totalPairs = pairCounts.reduce((a, b) => a + b, 0);
  const expectedPerBucket = totalPairs / 4;
  let chiSquare = 0;
  for (const count of pairCounts) {
    chiSquare += Math.pow(count - expectedPerBucket, 2) / expectedPerBucket;
  }

  // Normalize chi-square to embedding rate estimate (df=3, critical=7.815 at p=0.05)
  const normalizedChi = Math.max(0, 1 - chiSquare / 7.815);
  const estimatedEmbeddingRate = Math.min(
    1,
    normalizedChi * Math.abs(lsbOneRatio - 0.5) * 20 + normalizedChi * 0.3
  );

  let detectionRisk: 'low' | 'medium' | 'high';
  if (estimatedEmbeddingRate < 0.15) detectionRisk = 'low';
  else if (estimatedEmbeddingRate < 0.45) detectionRisk = 'medium';
  else detectionRisk = 'high';

  // Capacity at each bit depth
  const capacityBytes: { [key: string]: number } = {};
  for (const depth of [1, 2, 4] as AudioBitDepth[]) {
    const totalBits = N * buffer.numberOfChannels * depth;
    capacityBytes[`${depth}-bit`] = Math.max(0, Math.floor((totalBits - 32) / 8));
  }

  return {
    snrDb: null,
    lsbZeroRatio,
    lsbOneRatio,
    chiSquareStat: chiSquare,
    estimatedEmbeddingRate,
    detectionRisk,
    sampleCount: N,
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    capacityBytes,
  };
}

/**
 * Draw a waveform visualization to a canvas element.
 */
export function drawAudioWaveform(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer,
  color = '#00FF41',
  channelIndex = 0
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = buffer.getChannelData(channelIndex);
  const W = canvas.width;
  const H = canvas.height;
  const midY = H / 2;
  const step = Math.max(1, Math.ceil(data.length / W));

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(W, midY);
  ctx.stroke();

  ctx.strokeStyle = '#00aa2a';
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let x = 0; x < W; x++) {
    let min = 1.0;
    let max = -1.0;
    const start = x * step;
    for (let j = 0; j < step && start + j < data.length; j++) {
      const s = data[start + j];
      if (s < min) min = s;
      if (s > max) max = s;
    }
    const yTop = midY - max * midY * 0.9;
    const yBottom = midY - min * midY * 0.9;
    if (x === 0) ctx.moveTo(x, yTop);
    ctx.lineTo(x, yTop);
    ctx.lineTo(x, yBottom);
  }
  ctx.stroke();
}

/**
 * Draw a simple spectrogram (time vs frequency magnitude) to canvas.
 */
export function drawSpectrogram(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer,
  channelIndex = 0
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const data = buffer.getChannelData(channelIndex);
  const W = canvas.width;
  const H = canvas.height;
  const FFT_SIZE = 256;
  const hopSize = Math.max(1, Math.floor(data.length / W));

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#00aa2a';
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  for (let x = 0; x < W; x++) {
    const offset = x * hopSize;
    const frame = new Float32Array(FFT_SIZE);
    for (let i = 0; i < FFT_SIZE; i++) {
      const n = offset + i;
      const win = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1)));
      frame[i] = (n < data.length ? data[n] : 0) * win;
    }

    const magnitudes = dftMagnitudes(frame, FFT_SIZE / 2);
    const maxMag = Math.max(...magnitudes, 1e-10);

    for (let y = 0; y < H; y++) {
      const freqBin = Math.floor((y / H) * (FFT_SIZE / 2));
      const mag = magnitudes[freqBin] / maxMag;
      const intensity = Math.min(255, Math.floor(mag * 255));
      const g = Math.floor(intensity * 0.8 + 40);
      const r = Math.floor(intensity * 0.1);
      ctx.fillStyle = `rgb(${r},${g},${Math.floor(intensity * 0.2)})`;
      ctx.fillRect(x, H - y - 1, 1, 1);
    }
  }
}

function dftMagnitudes(frame: Float32Array, N: number): number[] {
  const mags = new Array(N).fill(0);
  for (let k = 0; k < N; k++) {
    let real = 0;
    let imag = 0;
    const twoPiKOverLen = (2 * Math.PI * k) / frame.length;
    for (let n = 0; n < frame.length; n++) {
      real += frame[n] * Math.cos(twoPiKOverLen * n);
      imag -= frame[n] * Math.sin(twoPiKOverLen * n);
    }
    mags[k] = Math.sqrt(real * real + imag * imag);
  }
  return mags;
}

function clampInt16(floatSample: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(floatSample * 32767)));
}
