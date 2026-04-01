'use client';

import { useState, useCallback } from 'react';
import { ImageDropzone } from './ImageDropzone';
import { decode, detectHiddenData, type BitDepth } from '@/lib';

export function DecodePanel() {
  const [stegoImage, setStegoImage] = useState<ImageData | null>(null);
  const [stegoPreview, setStegoPreview] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [bitDepth, setBitDepth] = useState<BitDepth>(1);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleImageLoad = useCallback((imageData: ImageData) => {
    setStegoImage(imageData);
    setDecodedMessage(null);
    setError(null);
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    setStegoPreview(canvas.toDataURL());
    
    // Try to detect hidden data
    const detection = detectHiddenData(imageData, bitDepth);
    setConfidence(detection.confidence);
  }, [bitDepth]);

  const handleDecode = useCallback(async () => {
    if (!stegoImage) return;
    
    setIsDecoding(true);
    setError(null);
    setDecodedMessage(null);

    try {
      const result = await decode({
        stegoImage,
        bitDepth,
        password: password || undefined,
      });
      
      setDecodedMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decoding failed');
    } finally {
      setIsDecoding(false);
    }
  }, [stegoImage, bitDepth, password]);

  const handleCopy = useCallback(() => {
    if (decodedMessage) {
      navigator.clipboard.writeText(decodedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [decodedMessage]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Upload Stego Image</h3>
      
      <ImageDropzone 
        onImageLoad={handleImageLoad}
        preview={stegoPreview}
        label="Drop stego image here to decode"
      />
      
      {confidence !== null && stegoImage && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-gray-600 dark:text-gray-400">Detection confidence:</span>
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                confidence > 0.7 ? 'bg-green-500' : 
                confidence > 0.4 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
          <span className="font-medium text-gray-800 dark:text-gray-200">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      )}

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
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600 dark:text-gray-400">
          Decryption Password (optional)
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password if message is encrypted"
          className="w-full p-3 border rounded-lg
            bg-white dark:bg-gray-800 
            border-gray-300 dark:border-gray-600
            text-gray-800 dark:text-gray-200
            placeholder-gray-400 dark:placeholder-gray-500
            focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={handleDecode}
        disabled={!stegoImage || isDecoding}
        className="w-full py-3 px-6 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 
          text-white font-semibold rounded-lg transition-colors
          disabled:cursor-not-allowed"
      >
        {isDecoding ? 'Decoding...' : 'Decode Message'}
      </button>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {decodedMessage !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 dark:text-gray-200">Decoded Message</h4>
            <button
              onClick={handleCopy}
              className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <pre className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 font-mono text-sm">
              {decodedMessage}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
