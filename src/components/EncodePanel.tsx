'use client';

import { useState, useCallback, useMemo } from 'react';
import { ImageDropzone } from './ImageDropzone';
import { 
  encode, 
  calculateCapacity, 
  imageDataToCanvas, 
  canvasToBlob, 
  downloadBlob,
  type BitDepth 
} from '@/lib';

export function EncodePanel() {
  const [coverImage, setCoverImage] = useState<ImageData | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(false);
  const [bitDepth, setBitDepth] = useState<BitDepth>(1);
  const [isEncoding, setIsEncoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImageLoad = useCallback((imageData: ImageData, file: File) => {
    setCoverImage(imageData);
    setCoverFile(file);
    setError(null);
    setSuccess(false);
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    setCoverPreview(canvas.toDataURL());
  }, []);

  const capacity = useMemo(() => {
    if (!coverImage) return 0;
    return calculateCapacity(coverImage.width, coverImage.height, bitDepth);
  }, [coverImage, bitDepth]);

  const messageBytes = useMemo(() => {
    return new TextEncoder().encode(message).length;
  }, [message]);

  const capacityPercent = useMemo(() => {
    if (capacity === 0) return 0;
    return Math.min(100, (messageBytes / capacity) * 100);
  }, [messageBytes, capacity]);

  const handleEncode = useCallback(async () => {
    if (!coverImage || !message) return;
    
    setIsEncoding(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await encode({
        message,
        coverImage,
        bitDepth,
        password: useEncryption && password ? password : undefined,
      });

      const canvas = imageDataToCanvas(result.stegoImage);
      const blob = await canvasToBlob(canvas);
      
      const originalName = coverFile?.name || 'image';
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      downloadBlob(blob, `${baseName}_stego.png`);
      
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encoding failed');
    } finally {
      setIsEncoding(false);
    }
  }, [coverImage, message, bitDepth, useEncryption, password, coverFile]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left Column - Cover Image */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Cover Image</h3>
        
        <ImageDropzone 
          onImageLoad={handleImageLoad}
          preview={coverPreview}
          label="Drop cover image here"
        />
        
        {coverImage && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Resolution</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {coverImage.width} × {coverImage.height}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">File Size</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {coverFile ? `${(coverFile.size / 1024).toFixed(1)} KB` : '-'}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Capacity</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {capacity.toLocaleString()} bytes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Message */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Secret Message</h3>
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter your secret message..."
          className="w-full h-40 p-4 border rounded-lg resize-none
            bg-white dark:bg-gray-800 
            border-gray-300 dark:border-gray-600
            text-gray-800 dark:text-gray-200
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              {messageBytes.toLocaleString()} / {capacity.toLocaleString()} bytes
            </span>
            <span className={`font-medium ${capacityPercent > 100 ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`}>
              {capacityPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                capacityPercent > 100 ? 'bg-red-500' : 
                capacityPercent > 75 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, capacityPercent)}%` }}
            />
          </div>
        </div>

        {/* Encryption Toggle */}
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useEncryption}
              onChange={(e) => setUseEncryption(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Enable AES-256 Encryption</span>
          </label>
          
          {useEncryption && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter encryption password"
              className="w-full p-3 border rounded-lg
                bg-white dark:bg-gray-800 
                border-gray-300 dark:border-gray-600
                text-gray-800 dark:text-gray-200
                placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
        </div>

        {/* Bit Depth Selector */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">LSB Bit Depth</label>
          <div className="flex gap-2">
            {([1, 2, 4] as BitDepth[]).map((depth) => (
              <button
                key={depth}
                onClick={() => setBitDepth(depth)}
                className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                  bitDepth === depth
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {depth}-bit
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Higher bit depth = more capacity but higher detectability
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-600 dark:text-green-400">
            ✓ Image encoded and downloaded successfully!
          </div>
        )}

        <button
          onClick={handleEncode}
          disabled={!coverImage || !message || messageBytes > capacity || isEncoding}
          className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
            text-white font-semibold rounded-lg transition-colors
            disabled:cursor-not-allowed"
        >
          {isEncoding ? 'Encoding...' : 'Encode & Download'}
        </button>
      </div>
    </div>
  );
}
