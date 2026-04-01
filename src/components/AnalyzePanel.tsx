'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ImageDropzone } from './ImageDropzone';
import { 
  extractBitPlane, 
  calculateHistogram, 
  rsAnalysis,
  type RSAnalysisResult,
  type HistogramData 
} from '@/lib';

export function AnalyzePanel() {
  const [image, setImage] = useState<ImageData | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<'red' | 'green' | 'blue'>('red');
  const [selectedBit, setSelectedBit] = useState(0);
  const [bitPlanePreview, setBitPlanePreview] = useState<string | null>(null);
  const [histogram, setHistogram] = useState<HistogramData | null>(null);
  const [rsResult, setRsResult] = useState<RSAnalysisResult | null>(null);
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageLoad = useCallback((imageData: ImageData) => {
    setImage(imageData);
    
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    setImagePreview(canvas.toDataURL());
    
    setHistogram(calculateHistogram(imageData));
    setRsResult(rsAnalysis(imageData));
  }, []);

  useEffect(() => {
    if (!image) return;
    
    const bitPlane = extractBitPlane(image, selectedChannel, selectedBit);
    const canvas = document.createElement('canvas');
    canvas.width = bitPlane.width;
    canvas.height = bitPlane.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(bitPlane, 0, 0);
    setBitPlanePreview(canvas.toDataURL());
  }, [image, selectedChannel, selectedBit]);

  useEffect(() => {
    if (!histogram || !histogramCanvasRef.current) return;
    
    const canvas = histogramCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw border
    ctx.strokeStyle = '#00aa2a';
    ctx.strokeRect(0, 0, width, height);
    
    const maxVal = Math.max(
      ...histogram.red,
      ...histogram.green,
      ...histogram.blue
    );
    
    const barWidth = width / 256;
    
    // Draw green channel only for terminal aesthetic
    ctx.fillStyle = '#00FF41';
    histogram.green.forEach((val, i) => {
      const barHeight = (val / maxVal) * (height - 4);
      ctx.fillRect(i * barWidth, height - barHeight - 2, barWidth - 0.5, barHeight);
    });
  }, [histogram]);

  const handleClear = useCallback(() => {
    setImage(null);
    setImagePreview(null);
    setBitPlanePreview(null);
    setHistogram(null);
    setRsResult(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h3 className="text-sm text-[#00FF41] mb-2">INPUT_IMAGE:</h3>
        <ImageDropzone 
          onImageLoad={handleImageLoad}
          preview={imagePreview}
          label="DROP_IMAGE_TO_ANALYZE"
        />
      </div>

      {image && (
        <>
          {/* Bit Plane Visualization */}
          <div className="space-y-4">
            <h3 className="text-sm text-[#00FF41]">// BIT_PLANE_VISUALIZATION</h3>
            <div className="border-t border-[#00FF41] pt-4"></div>
            
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-xs text-[#00aa2a]">CHANNEL:</label>
                <div className="flex gap-2">
                  {(['red', 'green', 'blue'] as const).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={`py-1 px-3 border text-xs transition-colors ${
                        selectedChannel === channel
                          ? 'bg-[#00FF41] border-[#00FF41] text-[#0a0a0a]'
                          : 'border-[#00aa2a] text-[#00aa2a] hover:border-[#00FF41] hover:text-[#00FF41]'
                      }`}
                    >
                      {channel.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-[#00aa2a]">BIT_POSITION:</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((bit) => (
                    <button
                      key={bit}
                      onClick={() => setSelectedBit(bit)}
                      className={`py-1 px-3 border text-xs transition-colors ${
                        selectedBit === bit
                          ? 'bg-[#00FF41] border-[#00FF41] text-[#0a0a0a]'
                          : 'border-[#00aa2a] text-[#00aa2a] hover:border-[#00FF41] hover:text-[#00FF41]'
                      }`}
                    >
                      BIT_{bit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs text-[#00aa2a]">ORIGINAL_IMAGE:</h4>
                <div className="border border-[#00aa2a] p-2 bg-[#0a0a0a]">
                  {imagePreview && (
                    <img src={imagePreview} alt="ORIGINAL" className="max-w-full max-h-[200px] mx-auto" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs text-[#00aa2a]">
                  {selectedChannel.toUpperCase()}_CHANNEL_BIT_{selectedBit}:
                </h4>
                <div className="border border-[#00aa2a] p-2 bg-[#0a0a0a]">
                  {bitPlanePreview && (
                    <img src={bitPlanePreview} alt="BIT_PLANE" className="max-w-full max-h-[200px] mx-auto" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Histogram */}
          <div className="space-y-4">
            <h3 className="text-sm text-[#00FF41]">// PIXEL_HISTOGRAM</h3>
            <div className="border-t border-[#00FF41] pt-4"></div>
            <div className="max-w-2xl">
              <canvas 
                ref={histogramCanvasRef} 
                width={512} 
                height={150}
                className="w-full"
              />
            </div>
          </div>

          {/* RS Analysis */}
          {rsResult && (
            <div className="space-y-4">
              <h3 className="text-sm text-[#00FF41]">// RS_STEGANALYSIS</h3>
              <div className="border-t border-[#00FF41] pt-4"></div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">R_M:</span>
                    <span className="text-[#00FF41] font-mono">{rsResult.rm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">S_M:</span>
                    <span className="text-[#00FF41] font-mono">{rsResult.sm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">R_MINUS_M:</span>
                    <span className="text-[#00FF41] font-mono">{rsResult.rMinusM.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">S_MINUS_M:</span>
                    <span className="text-[#00FF41] font-mono">{rsResult.sMinusM.toFixed(4)}</span>
                  </div>
                </div>
                
                <div className="border border-[#00aa2a] p-3 space-y-4">
                  <div>
                    <p className="text-xs text-[#00aa2a] mb-2">ESTIMATED_EMBEDDING_RATE:</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#0a0a0a] border border-[#00aa2a]">
                        <div 
                          className="h-full bg-[#00FF41] transition-all duration-300"
                          style={{ width: `${rsResult.estimatedEmbeddingRate * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[#00FF41] text-sm">
                        {(rsResult.estimatedEmbeddingRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-[#00aa2a] mb-2">DETECTION_RISK:</p>
                    <span className={`
                      inline-block px-3 py-1 border text-sm
                      ${rsResult.detectionRisk === 'low' ? 'border-[#00FF41] text-[#00FF41]' :
                        rsResult.detectionRisk === 'medium' ? 'border-[#FFaa00] text-[#FFaa00]' :
                        'border-[#FF2200] text-[#FF2200]'}
                    `}>
                      {rsResult.detectionRisk.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clear Button */}
          <div className="pt-4">
            <button
              onClick={handleClear}
              className="py-2 px-6 border border-[#FF2200] text-[#FF2200] text-sm
                hover:bg-[#FF2200] hover:text-[#0a0a0a] transition-colors"
            >
              CLEAR
            </button>
          </div>
        </>
      )}
    </div>
  );
}
