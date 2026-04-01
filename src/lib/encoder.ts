// LSB Steganography Encoder

import { encrypt, textToBytes } from './crypto';

export type BitDepth = 1 | 2 | 4;

export interface EncodeOptions {
  message: string;
  coverImage: ImageData;
  bitDepth?: BitDepth;
  password?: string;
}

export interface EncodeResult {
  stegoImage: ImageData;
  capacityUsed: number;
  totalCapacity: number;
}

function createBitMask(bitDepth: BitDepth): number {
  return (1 << bitDepth) - 1;
}

function clearLSBs(value: number, bitDepth: BitDepth): number {
  const mask = ~createBitMask(bitDepth) & 0xff;
  return value & mask;
}

export function calculateCapacity(width: number, height: number, bitDepth: BitDepth = 1): number {
  // 3 channels (RGB) per pixel, bitDepth bits per channel
  // Subtract 32 bits for length header
  const totalBits = width * height * 3 * bitDepth;
  return Math.floor((totalBits - 32) / 8);
}

export async function encode(options: EncodeOptions): Promise<EncodeResult> {
  const { message, coverImage, bitDepth = 1, password } = options;

  // Convert message to bytes
  let messageBytes = textToBytes(message);

  // Encrypt if password provided
  if (password) {
    messageBytes = await encrypt(messageBytes, password);
  }

  const totalCapacity = calculateCapacity(coverImage.width, coverImage.height, bitDepth);

  if (messageBytes.length > totalCapacity) {
    throw new Error(
      `Message too large. Capacity: ${totalCapacity} bytes, Message: ${messageBytes.length} bytes`
    );
  }

  // Create copy of image data
  const stegoData = new Uint8ClampedArray(coverImage.data);

  // Convert message length to 32-bit binary
  const lengthBits = messageBytes.length.toString(2).padStart(32, '0');

  // Convert message bytes to binary string
  let messageBits = '';
  for (const byte of messageBytes) {
    messageBits += byte.toString(2).padStart(8, '0');
  }

  const allBits = lengthBits + messageBits;
  const bitMask = createBitMask(bitDepth);

  let bitIndex = 0;
  let pixelIndex = 0;

  // Embed bits into pixel data
  while (bitIndex < allBits.length) {
    // Skip alpha channel (every 4th byte)
    if (pixelIndex % 4 === 3) {
      pixelIndex++;
      continue;
    }

    // Get bits to embed (bitDepth bits at a time)
    const bitsToEmbed = allBits.slice(bitIndex, bitIndex + bitDepth).padEnd(bitDepth, '0');
    const value = parseInt(bitsToEmbed, 2);

    // Clear LSBs and set new value
    stegoData[pixelIndex] = clearLSBs(stegoData[pixelIndex], bitDepth) | value;

    bitIndex += bitDepth;
    pixelIndex++;
  }

  const stegoImage = new ImageData(stegoData, coverImage.width, coverImage.height);

  return {
    stegoImage,
    capacityUsed: messageBytes.length,
    totalCapacity,
  };
}

export function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
