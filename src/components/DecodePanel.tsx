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
      setError(err instanceof Error ? err.message : 'DECODING_FAILED');
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

  const handleClear = useCallback(() => {
    setStegoImage(null);
    setStegoPreview(null);
    setPassword('');
    setDecodedMessage(null);
    setError(null);
    setConfidence(null);
  }, []);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-sm text-[#00FF41] mb-2">INPUT_IMAGE:</h3>
        <ImageDropzone 
          onImageLoad={handleImageLoad}
          preview={stegoPreview}
          label="DROP_STEGO_IMAGE_TO_DECODE"
        />
      </div>
      
      {confidence !== null && stegoImage && (
        <div className="border border-[#00aa2a] p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#00aa2a]">DETECTION_CONFIDENCE:</span>
            <span className="text-[#00FF41]">{(confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[#0a0a0a] border border-[#00aa2a]">
            <div 
              className="h-full bg-[#00FF41] transition-all duration-300"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      )}

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

      {/* Password Field */}
      <div className="space-y-2">
        <label className="text-xs text-[#00aa2a]">DECRYPTION_PASSWORD:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ENTER_PASSWORD_IF_ENCRYPTED..."
          className="w-full p-2 border border-[#00FF41] bg-[#0a0a0a] text-[#00FF41] 
            placeholder-[#00aa2a] font-mono text-sm focus:outline-none"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDecode}
          disabled={!stegoImage || isDecoding}
          className="flex-1 py-2 px-4 border border-[#00FF41] text-[#00FF41] text-sm
            hover:bg-[#00FF41] hover:text-[#0a0a0a] transition-colors
            disabled:border-[#00aa2a] disabled:text-[#00aa2a] disabled:cursor-not-allowed
            disabled:hover:bg-transparent disabled:hover:text-[#00aa2a]"
        >
          {isDecoding ? 'DECODING...' : '<< DECODE'}
        </button>
        <button
          onClick={handleClear}
          className="py-2 px-4 border border-[#FF2200] text-[#FF2200] text-sm
            hover:bg-[#FF2200] hover:text-[#0a0a0a] transition-colors"
        >
          CLEAR
        </button>
      </div>

      {error && (
        <div className="border border-[#FF2200] p-3 text-[#FF2200] text-sm">
          ERROR: {error}
        </div>
      )}

      {decodedMessage !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm text-[#00FF41]">OUTPUT_DATA:</h4>
            <button
              onClick={handleCopy}
              className="text-xs text-[#00aa2a] hover:text-[#00FF41] transition-colors"
            >
              {copied ? '[COPIED]' : '[COPY]'}
            </button>
          </div>
          <div className="border border-[#00FF41] p-3 bg-[#0a0a0a] min-h-[100px]">
            <pre className="whitespace-pre-wrap text-[#00FF41] font-mono text-sm normal-case">
              {decodedMessage}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
