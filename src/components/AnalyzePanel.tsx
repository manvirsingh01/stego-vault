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
    
    // Calculate histogram
    setHistogram(calculateHistogram(imageData));
    
    // Perform RS analysis
    setRsResult(rsAnalysis(imageData));
  }, []);

  // Update bit plane when channel or bit changes
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

  // Draw histogram
  useEffect(() => {
    if (!histogram || !histogramCanvasRef.current) return;
    
    const canvas = histogramCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);
    
    const maxVal = Math.max(
      ...histogram.red,
      ...histogram.green,
      ...histogram.blue
    );
    
    const barWidth = width / 256;
    
    // Draw each channel
    const channels: { data: number[]; color: string }[] = [
      { data: histogram.red, color: 'rgba(239, 68, 68, 0.7)' },
      { data: histogram.green, color: 'rgba(34, 197, 94, 0.7)' },
      { data: histogram.blue, color: 'rgba(59, 130, 246, 0.7)' },
    ];
    
    channels.forEach(({ data, color }) => {
      ctx.fillStyle = color;
      data.forEach((val, i) => {
        const barHeight = (val / maxVal) * height;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
      });
    });
  }, [histogram]);

  return (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Upload Image to Analyze
        </h3>
        <ImageDropzone 
          onImageLoad={handleImageLoad}
          preview={imagePreview}
          label="Drop image here to analyze"
        />
      </div>

      {image && (
        <>
          {/* Bit Plane Visualization */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              LSB Bit-Plane Visualization
            </h3>
            
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Channel</label>
                <div className="flex gap-2">
                  {(['red', 'green', 'blue'] as const).map((channel) => (
                    <button
                      key={channel}
                      onClick={() => setSelectedChannel(channel)}
                      className={`py-2 px-4 rounded-lg border transition-colors capitalize ${
                        selectedChannel === channel
                          ? channel === 'red' ? 'bg-red-500 border-red-500 text-white' :
                            channel === 'green' ? 'bg-green-500 border-green-500 text-white' :
                            'bg-blue-500 border-blue-500 text-white'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {channel}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Bit Position</label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3].map((bit) => (
                    <button
                      key={bit}
                      onClick={() => setSelectedBit(bit)}
                      className={`py-2 px-4 rounded-lg border transition-colors ${
                        selectedBit === bit
                          ? 'bg-gray-800 dark:bg-gray-200 border-gray-800 dark:border-gray-200 text-white dark:text-gray-800'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Bit {bit}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">Original Image</h4>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  {imagePreview && (
                    <img src={imagePreview} alt="Original" className="max-w-full max-h-[300px] mx-auto" />
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {selectedChannel.charAt(0).toUpperCase() + selectedChannel.slice(1)} Channel - Bit {selectedBit}
                </h4>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  {bitPlanePreview && (
                    <img src={bitPlanePreview} alt="Bit Plane" className="max-w-full max-h-[300px] mx-auto" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Histogram */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Pixel Value Histogram
            </h3>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
              <canvas 
                ref={histogramCanvasRef} 
                width={512} 
                height={200}
                className="w-full max-w-2xl mx-auto"
              />
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Red</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Green</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Blue</span>
                </div>
              </div>
            </div>
          </div>

          {/* RS Analysis */}
          {rsResult && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                RS Steganalysis
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">R<sub>M</sub></span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{rsResult.rm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">S<sub>M</sub></span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{rsResult.sm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">R<sub>-M</sub></span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{rsResult.rMinusM.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">S<sub>-M</sub></span>
                    <span className="font-mono text-gray-800 dark:text-gray-200">{rsResult.sMinusM.toFixed(4)}</span>
                  </div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Estimated Embedding Rate</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${rsResult.estimatedEmbeddingRate * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-gray-800 dark:text-gray-200">
                        {(rsResult.estimatedEmbeddingRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Detection Risk</p>
                    <span className={`
                      inline-block px-3 py-1 rounded-full text-sm font-medium
                      ${rsResult.detectionRisk === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        rsResult.detectionRisk === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}
                    `}>
                      {rsResult.detectionRisk.charAt(0).toUpperCase() + rsResult.detectionRisk.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
