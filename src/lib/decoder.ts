// LSB Steganography Decoder

import { decrypt, bytesToText } from './crypto';
import type { BitDepth } from './encoder';

export interface DecodeOptions {
  stegoImage: ImageData;
  bitDepth?: BitDepth;
  password?: string;
}

export interface DecodeResult {
  message: string;
  encrypted: boolean;
  byteLength: number;
}

function createBitMask(bitDepth: BitDepth): number {
  return (1 << bitDepth) - 1;
}

function extractBits(data: Uint8ClampedArray, startBit: number, numBits: number, bitDepth: BitDepth): string {
  const bitMask = createBitMask(bitDepth);
  let bits = '';
  let bitIndex = startBit;
  let pixelIndex = Math.floor(startBit / bitDepth);

  // Adjust for skipped alpha channels
  pixelIndex = Math.floor(pixelIndex / 3) * 4 + (pixelIndex % 3);

  while (bits.length < numBits) {
    // Skip alpha channel
    if (pixelIndex % 4 === 3) {
      pixelIndex++;
      continue;
    }

    const extractedValue = data[pixelIndex] & bitMask;
    bits += extractedValue.toString(2).padStart(bitDepth, '0');
    pixelIndex++;
    bitIndex += bitDepth;
  }

  return bits.slice(0, numBits);
}

export async function decode(options: DecodeOptions): Promise<DecodeResult> {
  const { stegoImage, bitDepth = 1, password } = options;
  const data = stegoImage.data;

  // Extract 32-bit length header
  const lengthBits = extractBits(data, 0, 32, bitDepth);
  const messageLength = parseInt(lengthBits, 2);

  if (messageLength <= 0 || messageLength > stegoImage.width * stegoImage.height) {
    throw new Error('Invalid or no hidden message found');
  }

  // Extract message bits
  const messageBits = extractBits(data, 32, messageLength * 8, bitDepth);

  // Convert bits to bytes
  const messageBytes = new Uint8Array(messageLength);
  for (let i = 0; i < messageLength; i++) {
    const byteBits = messageBits.slice(i * 8, (i + 1) * 8);
    messageBytes[i] = parseInt(byteBits, 2);
  }

  // Try to decrypt if password provided
  let decryptedBytes: Uint8Array = messageBytes;
  let encrypted = false;

  if (password) {
    try {
      decryptedBytes = await decrypt(new Uint8Array(messageBytes), password);
      encrypted = true;
    } catch {
      throw new Error('Decryption failed. Wrong password or message is not encrypted.');
    }
  }

  const message = bytesToText(decryptedBytes);

  return {
    message,
    encrypted,
    byteLength: messageLength,
  };
}

export function detectHiddenData(stegoImage: ImageData, bitDepth: BitDepth = 1): { 
  hasData: boolean; 
  estimatedLength: number;
  confidence: number;
} {
  const data = stegoImage.data;
  
  // Extract 32-bit length header
  const lengthBits = extractBits(data, 0, 32, bitDepth);
  const estimatedLength = parseInt(lengthBits, 2);
  
  const maxCapacity = Math.floor((stegoImage.width * stegoImage.height * 3 * bitDepth - 32) / 8);
  
  // Check if length is plausible
  const hasData = estimatedLength > 0 && estimatedLength <= maxCapacity;
  
  // Calculate confidence based on LSB distribution
  let lsbSum = 0;
  let count = 0;
  for (let i = 0; i < Math.min(data.length, 10000); i++) {
    if (i % 4 !== 3) { // Skip alpha
      lsbSum += data[i] & 1;
      count++;
    }
  }
  
  // Ideal random LSB distribution is 50%
  const lsbRatio = lsbSum / count;
  const deviation = Math.abs(lsbRatio - 0.5);
  const confidence = hasData ? Math.max(0, 1 - deviation * 4) : 0;
  
  return { hasData, estimatedLength, confidence };
}
