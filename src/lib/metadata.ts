// Image and Audio Metadata Extraction Utilities

export interface ImageMetadata {
  fileName: string;
  fileSize: string;
  fileType: string;
  width: number;
  height: number;
  aspectRatio: string;
  colorDepth: string;
  totalPixels: string;
  lastModified: string;
  // EXIF data (if available)
  exif?: {
    make?: string;
    model?: string;
    dateTime?: string;
    exposureTime?: string;
    fNumber?: string;
    iso?: string;
    focalLength?: string;
    gpsLatitude?: string;
    gpsLongitude?: string;
    software?: string;
    orientation?: string;
  };
}

export interface AudioMetadata {
  fileName: string;
  fileSize: string;
  fileType: string;
  duration: string;
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  channelLayout: string;
  bitDepth: number;
  estimatedBitrate: string;
  totalSamples: number;
  lastModified: string;
}

/**
 * Format file size to human readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

/**
 * Format duration to MM:SS.ms
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins}:${secs.padStart(5, '0')}`;
}

/**
 * Calculate GCD for aspect ratio
 */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Extract metadata from an image file
 */
export function extractImageMetadata(
  file: File,
  imageData: ImageData
): ImageMetadata {
  const { width, height } = imageData;
  const divisor = gcd(width, height);
  
  const metadata: ImageMetadata = {
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    fileType: file.type || 'unknown',
    width,
    height,
    aspectRatio: `${width / divisor}:${height / divisor}`,
    colorDepth: '32-bit RGBA',
    totalPixels: `${(width * height).toLocaleString()} px`,
    lastModified: new Date(file.lastModified).toLocaleString(),
  };

  return metadata;
}

/**
 * Extract EXIF metadata from image file (basic extraction)
 */
export async function extractExifData(file: File): Promise<ImageMetadata['exif']> {
  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    
    // Check for JPEG SOI marker
    if (view.getUint16(0) !== 0xFFD8) {
      return undefined;
    }

    let offset = 2;
    while (offset < view.byteLength - 2) {
      const marker = view.getUint16(offset);
      
      // APP1 marker (EXIF)
      if (marker === 0xFFE1) {
        const length = view.getUint16(offset + 2);
        const exifData = new Uint8Array(buffer, offset + 4, length - 2);
        
        // Check for "Exif\0\0" header
        const exifHeader = String.fromCharCode(...exifData.slice(0, 4));
        if (exifHeader === 'Exif') {
          return parseExifData(new DataView(buffer, offset + 10, length - 8));
        }
      }
      
      // Move to next marker
      if (marker === 0xFFD9 || marker === 0xFFDA) break;
      const segmentLength = view.getUint16(offset + 2);
      offset += 2 + segmentLength;
    }
  } catch {
    // EXIF parsing failed, return undefined
  }
  return undefined;
}

/**
 * Parse EXIF IFD data
 */
function parseExifData(view: DataView): ImageMetadata['exif'] {
  const exif: ImageMetadata['exif'] = {};
  
  try {
    // Check byte order (II = little endian, MM = big endian)
    const byteOrder = view.getUint16(0);
    const littleEndian = byteOrder === 0x4949;
    
    // Get IFD0 offset
    const ifdOffset = view.getUint32(4, littleEndian);
    const numEntries = view.getUint16(ifdOffset, littleEndian);
    
    // EXIF tag IDs
    const tags: Record<number, keyof NonNullable<ImageMetadata['exif']>> = {
      0x010F: 'make',
      0x0110: 'model',
      0x0132: 'dateTime',
      0x829A: 'exposureTime',
      0x829D: 'fNumber',
      0x8827: 'iso',
      0x920A: 'focalLength',
      0x0131: 'software',
      0x0112: 'orientation',
    };
    
    for (let i = 0; i < numEntries; i++) {
      const entryOffset = ifdOffset + 2 + i * 12;
      const tag = view.getUint16(entryOffset, littleEndian);
      
      if (tags[tag]) {
        const type = view.getUint16(entryOffset + 2, littleEndian);
        const count = view.getUint32(entryOffset + 4, littleEndian);
        
        let value: string | undefined;
        
        if (type === 2) { // ASCII string
          const valueOffset = count > 4 
            ? view.getUint32(entryOffset + 8, littleEndian) 
            : entryOffset + 8;
          const bytes = new Uint8Array(view.buffer, view.byteOffset + valueOffset, count - 1);
          value = String.fromCharCode(...bytes);
        } else if (type === 3) { // SHORT
          value = view.getUint16(entryOffset + 8, littleEndian).toString();
        } else if (type === 4) { // LONG
          value = view.getUint32(entryOffset + 8, littleEndian).toString();
        } else if (type === 5) { // RATIONAL
          const valueOffset = view.getUint32(entryOffset + 8, littleEndian);
          const num = view.getUint32(valueOffset, littleEndian);
          const den = view.getUint32(valueOffset + 4, littleEndian);
          value = den !== 0 ? (num / den).toFixed(4) : 'N/A';
        }
        
        if (value) {
          exif[tags[tag]] = value;
        }
      }
    }
  } catch {
    // Parsing error, return partial data
  }
  
  return Object.keys(exif).length > 0 ? exif : undefined;
}

/**
 * Extract metadata from an audio file
 */
export function extractAudioMetadata(
  file: File,
  audioBuffer: AudioBuffer
): AudioMetadata {
  const durationSeconds = audioBuffer.duration;
  const estimatedBitrate = (file.size * 8) / durationSeconds / 1000;
  
  return {
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    fileType: file.type || getAudioTypeFromExtension(file.name),
    duration: formatDuration(durationSeconds),
    durationSeconds,
    sampleRate: audioBuffer.sampleRate,
    channels: audioBuffer.numberOfChannels,
    channelLayout: audioBuffer.numberOfChannels === 1 ? 'Mono' : 
                   audioBuffer.numberOfChannels === 2 ? 'Stereo' : 
                   `${audioBuffer.numberOfChannels} channels`,
    bitDepth: 16, // Web Audio API decodes to 32-bit float, original is typically 16-bit
    estimatedBitrate: `${estimatedBitrate.toFixed(0)} kbps`,
    totalSamples: audioBuffer.length,
    lastModified: new Date(file.lastModified).toLocaleString(),
  };
}

/**
 * Get audio type from file extension
 */
function getAudioTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    m4a: 'audio/mp4',
    aiff: 'audio/aiff',
    aif: 'audio/aiff',
  };
  return types[ext || ''] || 'audio/unknown';
}
