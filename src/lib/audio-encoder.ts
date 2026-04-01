// Audio LSB Steganography Encoder
// Hides secret data in the Least Significant Bits of PCM audio samples
// Uses Web Audio API — no external dependencies required

import { encrypt, textToBytes } from './crypto';

export type AudioBitDepth = 1 | 2 | 4;
export type AudioAlgorithm = 'lsb' | 'phase' | 'echo';

export interface AudioEncodeOptions {
  message: string;
  audioBuffer: AudioBuffer;
  bitDepth?: AudioBitDepth;
  algorithm?: AudioAlgorithm;
  password?: string;
}

export interface AudioEncodeResult {
  stegoBuffer: AudioBuffer;
  capacityUsed: number;
  totalCapacity: number;
  snrDb: number;
}

/**
 * Calculate how many bytes can be hidden in a given audio buffer.
 * Formula: (samples × channels × bitDepth − 32 header bits) / 8
 */
export function calculateAudioCapacity(
  sampleRate: number,
  duration: number,
  channels: number,
  bitDepth: AudioBitDepth = 1
): number {
  const totalSamples = Math.floor(sampleRate * duration) * channels;
  const totalBits = totalSamples * bitDepth;
  return Math.max(0, Math.floor((totalBits - 32) / 8));
}

/**
 * Encode a secret message into an AudioBuffer using LSB steganography.
 * Optionally encrypts the message with AES-256-GCM before embedding.
 */
export async function encodeAudio(
  options: AudioEncodeOptions
): Promise<AudioEncodeResult> {
  const { message, audioBuffer, bitDepth = 1, password } = options;

  // Step 1 — convert message to bytes, optionally encrypt
  let messageBytes = textToBytes(message);
  if (password) {
    messageBytes = await encrypt(messageBytes, password);
  }

  const totalCapacity = calculateAudioCapacity(
    audioBuffer.sampleRate,
    audioBuffer.duration,
    audioBuffer.numberOfChannels,
    bitDepth
  );

  if (messageBytes.length > totalCapacity) {
    throw new Error(
      `Message too large. Capacity: ${totalCapacity.toLocaleString()} bytes, ` +
        `Message: ${messageBytes.length.toLocaleString()} bytes`
    );
  }

  // Step 2 — build bit stream: [32-bit length header] + [message bits]
  const lengthBits = messageBytes.length.toString(2).padStart(32, '0');
  let messageBits = '';
  for (const byte of messageBytes) {
    messageBits += byte.toString(2).padStart(8, '0');
  }
  const allBits = lengthBits + messageBits;

  // Step 3 — create output AudioBuffer
  const numChannels = audioBuffer.numberOfChannels;
  const numSamples = audioBuffer.length;
  const sampleRate = audioBuffer.sampleRate;

  const offlineCtx = new OfflineAudioContext(numChannels, numSamples, sampleRate);
  const stegoBuffer = offlineCtx.createBuffer(numChannels, numSamples, sampleRate);

  const bitMask = (1 << bitDepth) - 1;
  let bitIndex = 0;

  // Step 4 — embed bits across all channels interleaved
  for (let ch = 0; ch < numChannels; ch++) {
    const inputData = audioBuffer.getChannelData(ch);
    const outputData = stegoBuffer.getChannelData(ch);

    for (let i = 0; i < numSamples; i++) {
      // Float32 [-1.0, +1.0] → Int16 [-32768, +32767]
      let sampleInt = Math.round(inputData[i] * 32767);
      sampleInt = Math.max(-32768, Math.min(32767, sampleInt));

      if (bitIndex < allBits.length) {
        const chunk = allBits.slice(bitIndex, bitIndex + bitDepth).padEnd(bitDepth, '0');
        const bitsToEmbed = parseInt(chunk, 2);
        // Clear N LSBs and insert new bits
        sampleInt = (sampleInt & ~bitMask) | (bitsToEmbed & bitMask);
        bitIndex += bitDepth;
      }

      // Int16 → Float32
      outputData[i] = sampleInt / 32767;
    }
  }

  // Step 5 — calculate SNR to measure imperceptibility
  const snrDb = calculateSNR(audioBuffer, stegoBuffer);

  return {
    stegoBuffer,
    capacityUsed: messageBytes.length,
    totalCapacity,
    snrDb,
  };
}

/**
 * Calculate Signal-to-Noise Ratio in dB between original and stego audio.
 * Higher SNR = more imperceptible. Typical 1-bit LSB gives ~80+ dB.
 */
export function calculateSNR(original: AudioBuffer, stego: AudioBuffer): number {
  const orig = original.getChannelData(0);
  const steg = stego.getChannelData(0);
  let signalPower = 0;
  let noisePower = 0;

  for (let i = 0; i < orig.length; i++) {
    signalPower += orig[i] * orig[i];
    const noise = orig[i] - steg[i];
    noisePower += noise * noise;
  }

  if (noisePower === 0) return Infinity;
  return 10 * Math.log10(signalPower / noisePower);
}

/**
 * Convert an AudioBuffer to a WAV Blob for download.
 * Always exports 16-bit PCM WAV — lossless, preserves LSBs exactly.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = numSamples * numChannels * 2;
  const wavBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(wavBuffer);

  // RIFF/WAVE header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);           // PCM = 1
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleaved sample data
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const floatSample = buffer.getChannelData(ch)[i];
      const int16 = Math.max(-32768, Math.min(32767, Math.round(floatSample * 32767)));
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Load an audio file into an AudioBuffer using Web Audio API.
 */
export async function fileToAudioBuffer(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  try {
    return await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close();
  }
}

/**
 * Get human-readable file info from an AudioBuffer + File.
 */
export function getAudioInfo(buffer: AudioBuffer, file: File) {
  return {
    name: file.name,
    sizeKb: (file.size / 1024).toFixed(1),
    duration: buffer.duration.toFixed(2),
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    channelLabel: buffer.numberOfChannels === 1 ? 'Mono' : 'Stereo',
    bitDepth: 16,
  };
}
