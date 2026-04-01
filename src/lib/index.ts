// ─── Image Steganography ──────────────────────────────────────────────────────
export { encode, calculateCapacity, imageDataToCanvas, canvasToBlob, downloadBlob } from './encoder';
export type { EncodeOptions, EncodeResult, BitDepth } from './encoder';

export { decode, detectHiddenData } from './decoder';
export type { DecodeOptions, DecodeResult } from './decoder';

// ─── Image Analysis ───────────────────────────────────────────────────────────
export {
  extractBitPlane,
  calculateHistogram,
  rsAnalysis,
  compareImages,
} from './analyze';
export type { BitPlaneData, HistogramData, RSAnalysisResult } from './analyze';

// ─── Cryptography (shared) ────────────────────────────────────────────────────
export { encrypt, decrypt, textToBytes, bytesToText } from './crypto';

// ─── Audio Steganography ──────────────────────────────────────────────────────
export {
  encodeAudio,
  calculateAudioCapacity,
  audioBufferToWav,
  calculateSNR,
  fileToAudioBuffer,
  getAudioInfo,
} from './audio-encoder';
export type { AudioEncodeOptions, AudioEncodeResult, AudioBitDepth, AudioAlgorithm } from './audio-encoder';

export { decodeAudio, detectAudioHiddenData } from './audio-decoder';
export type { AudioDecodeOptions, AudioDecodeResult } from './audio-decoder';

// ─── Audio Analysis ───────────────────────────────────────────────────────────
export { analyzeAudio, drawAudioWaveform, drawSpectrogram } from './audio-analyze';
export type { AudioAnalysisResult } from './audio-analyze';
