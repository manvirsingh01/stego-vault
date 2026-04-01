// Audio LSB Steganography Decoder
// Extracts hidden data from the Least Significant Bits of PCM audio samples

import { decrypt, bytesToText } from './crypto';
import type { AudioBitDepth } from './audio-encoder';

export interface AudioDecodeOptions {
  stegoBuffer: AudioBuffer;
  bitDepth?: AudioBitDepth;
  password?: string;
}

export interface AudioDecodeResult {
  message: string;
  encrypted: boolean;
  byteLength: number;
}

/**
 * Decode a hidden message from a stego AudioBuffer.
 * Bit depth and password MUST match what was used during encoding.
 */
export async function decodeAudio(
  options: AudioDecodeOptions
): Promise<AudioDecodeResult> {
  const { stegoBuffer, bitDepth = 1, password } = options;

  const bitMask = (1 << bitDepth) - 1;
  const data = stegoBuffer.getChannelData(0);

  // Helper: extract `needed` bits starting at sample-bit position `startBitPos`
  function extractBitString(startBitPos: number, needed: number): string {
    let bits = '';
    let pos = startBitPos;
    while (bits.length < needed) {
      const sampleIdx = Math.floor(pos / bitDepth);
      if (sampleIdx >= data.length) break;
      const sampleInt = clampInt16(data[sampleIdx]);
      bits += (sampleInt & bitMask).toString(2).padStart(bitDepth, '0');
      pos += bitDepth;
    }
    return bits.slice(0, needed);
  }

  // Step 1 — extract 32-bit length header
  const headerBits = extractBitString(0, 32);
  const messageLength = parseInt(headerBits, 2);

  // Sanity check
  const maxCapacity = Math.floor((data.length * bitDepth - 32) / 8);
  if (messageLength <= 0 || messageLength > maxCapacity || isNaN(messageLength)) {
    throw new Error(
      'No valid hidden message detected. ' +
        'Check that the bit depth matches what was used during encoding.'
    );
  }

  // Step 2 — extract message bits (after 32-bit header)
  const messageBits = extractBitString(32, messageLength * 8);

  // Step 3 — reconstruct bytes
  const messageBytes = new Uint8Array(messageLength);
  for (let i = 0; i < messageLength; i++) {
    const chunk = messageBits.slice(i * 8, (i + 1) * 8);
    messageBytes[i] = parseInt(chunk, 2);
  }

  // Step 4 — decrypt if password provided
  let decryptedBytes: Uint8Array = messageBytes;
  let encrypted = false;

  if (password) {
    try {
      decryptedBytes = await decrypt(messageBytes, password);
      encrypted = true;
    } catch {
      throw new Error(
        'Decryption failed. Wrong password or the message was not encrypted.'
      );
    }
  }

  // Step 5 — decode UTF-8 text
  let message: string;
  try {
    message = bytesToText(decryptedBytes);
  } catch {
    throw new Error('Failed to decode message. The data may be corrupt.');
  }

  return { message, encrypted, byteLength: messageLength };
}

/**
 * Quick detection: check if an AudioBuffer likely contains hidden data.
 * Returns confidence 0–1 and estimated byte length.
 */
export function detectAudioHiddenData(
  buffer: AudioBuffer,
  bitDepth: AudioBitDepth = 1
): { hasData: boolean; estimatedLength: number; confidence: number } {
  const data = buffer.getChannelData(0);
  const bitMask = (1 << bitDepth) - 1;

  // Extract 32-bit header
  let headerBits = '';
  for (let i = 0; headerBits.length < 32 && i < data.length; i++) {
    const sInt = clampInt16(data[i]);
    headerBits += (sInt & bitMask).toString(2).padStart(bitDepth, '0');
  }

  const estimatedLength = parseInt(headerBits.slice(0, 32), 2);
  const maxCapacity = Math.floor((data.length * bitDepth - 32) / 8);
  const hasData =
    estimatedLength > 0 && estimatedLength <= maxCapacity && !isNaN(estimatedLength);

  // LSB entropy analysis
  let lsbOnes = 0;
  const sampleCount = Math.min(data.length, 8000);
  for (let i = 0; i < sampleCount; i++) {
    lsbOnes += clampInt16(data[i]) & 1;
  }
  const ratio = lsbOnes / sampleCount;
  const deviation = Math.abs(ratio - 0.5);
  const confidence = hasData ? Math.max(0, Math.min(1, 1 - deviation * 5)) : 0;

  return { hasData, estimatedLength, confidence };
}

function clampInt16(floatSample: number): number {
  return Math.max(-32768, Math.min(32767, Math.round(floatSample * 32767)));
}
