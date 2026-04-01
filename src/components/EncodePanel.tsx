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
      setError(err instanceof Error ? err.message : 'ENCODING_FAILED');
    } finally {
      setIsEncoding(false);
    }
  }, [coverImage, message, bitDepth, useEncryption, password, coverFile]);

  const handleClear = useCallback(() => {
    setCoverImage(null);
    setCoverPreview(null);
    setCoverFile(null);
    setMessage('');
    setPassword('');
    setError(null);
    setSuccess(false);
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left Column - Cover Image */}
      <div className="space-y-4">
        <h3 className="text-sm text-[#00FF41]">COVER_IMAGE:</h3>
        
        <ImageDropzone 
          onImageLoad={handleImageLoad}
          preview={coverPreview}
          label="DROP_COVER_IMAGE_HERE"
        />
        
        {coverImage && (
          <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#00aa2a]">RESOLUTION:</span>
              <span className="text-[#00FF41]">{coverImage.width} × {coverImage.height}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00aa2a]">FILE_SIZE:</span>
              <span className="text-[#00FF41]">
                {coverFile ? `${(coverFile.size / 1024).toFixed(1)} KB` : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#00aa2a]">CAPACITY:</span>
              <span className="text-[#00FF41]">{capacity.toLocaleString()} BYTES</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Message */}
      <div className="space-y-4">
        <h3 className="text-sm text-[#00FF41]">INPUT_DATA:</h3>
        
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ENTER_SECRET_MESSAGE..."
          className="w-full h-40 p-3 border border-[#00FF41] bg-[#0a0a0a] text-[#00FF41] 
            placeholder-[#00aa2a] resize-none font-mono text-sm focus:outline-none"
        />
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-[#00aa2a]">
              BYTES_USED: {messageBytes.toLocaleString()} / {capacity.toLocaleString()}
            </span>
            <span className={capacityPercent > 100 ? 'text-[#FF2200]' : 'text-[#00FF41]'}>
              {capacityPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-[#0a0a0a] border border-[#00aa2a]">
            <div 
              className={`h-full transition-all duration-300 ${
                capacityPercent > 100 ? 'bg-[#FF2200]' : 'bg-[#00FF41]'
              }`}
              style={{ width: `${Math.min(100, capacityPercent)}%` }}
            />
          </div>
        </div>

        {/* Encryption Toggle */}
        <div className="border border-[#00aa2a] p-3 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={useEncryption}
              onChange={(e) => setUseEncryption(e.target.checked)}
              className="w-4 h-4 accent-[#00FF41]"
            />
            <span className="text-[#00FF41]">ENABLE_AES256_ENCRYPTION</span>
          </label>
          
          {useEncryption && (
            <div>
              <label className="text-xs text-[#00aa2a] block mb-1">PASSWORD:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ENTER_ENCRYPTION_KEY..."
                className="w-full p-2 border border-[#00FF41] bg-[#0a0a0a] text-[#00FF41] 
                  placeholder-[#00aa2a] font-mono text-sm focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Bit Depth Selector */}
        <div className="space-y-2">
          <label className="text-xs text-[#00aa2a]">LSB_BIT_DEPTH:</label>
          <div className="flex gap-2">
            {([1, 2, 4] as BitDepth[]).map((depth) => (
              <button
                key={depth}
                onClick={() => setBitDepth(depth)}
                className={`flex-1 py-2 px-4 border text-sm transition-colors ${
                  bitDepth === depth
                    ? 'bg-[#00FF41] border-[#00FF41] text-[#0a0a0a]'
                    : 'border-[#00aa2a] text-[#00aa2a] hover:border-[#00FF41] hover:text-[#00FF41]'
                }`}
              >
                {depth}-BIT
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="border border-[#FF2200] p-3 text-[#FF2200] text-sm">
            ERROR: {error}
          </div>
        )}

        {success && (
          <div className="border border-[#00FF41] p-3 text-[#00FF41] text-sm">
            SUCCESS: IMAGE_ENCODED_AND_DOWNLOADED
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleEncode}
            disabled={!coverImage || !message || messageBytes > capacity || isEncoding}
            className="flex-1 py-2 px-4 border border-[#00FF41] text-[#00FF41] text-sm
              hover:bg-[#00FF41] hover:text-[#0a0a0a] transition-colors
              disabled:border-[#00aa2a] disabled:text-[#00aa2a] disabled:cursor-not-allowed
              disabled:hover:bg-transparent disabled:hover:text-[#00aa2a]"
          >
            {isEncoding ? 'ENCODING...' : 'ENCODE >>'}
          </button>
          <button
            onClick={handleClear}
            className="py-2 px-4 border border-[#FF2200] text-[#FF2200] text-sm
              hover:bg-[#FF2200] hover:text-[#0a0a0a] transition-colors"
          >
            CLEAR
          </button>
        </div>
      </div>
    </div>
  );
}
