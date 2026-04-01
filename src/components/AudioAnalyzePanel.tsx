'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioDropzone } from './AudioDropzone';
import { analyzeAudio, drawAudioWaveform, drawSpectrogram } from '@/lib/audio-analyze';
import { extractAudioMetadata, type AudioMetadata } from '@/lib/metadata';
import type { AudioAnalysisResult } from '@/lib/audio-analyze';

export function AudioAnalyzePanel() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [result, setResult] = useState<AudioAnalysisResult | null>(null);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);

  const waveformRef = useRef<HTMLCanvasElement>(null);
  const spectrogramRef = useRef<HTMLCanvasElement>(null);

  const handleAudioLoad = useCallback((buffer: AudioBuffer, file: File) => {
    setAudioBuffer(buffer);
    setAudioFile(file);
    setResult(analyzeAudio(buffer));
    setMetadata(extractAudioMetadata(file, buffer));
  }, []);

  useEffect(() => {
    if (!audioBuffer) return;
    if (waveformRef.current) drawAudioWaveform(waveformRef.current, audioBuffer, '#00FF41');
    if (spectrogramRef.current) drawSpectrogram(spectrogramRef.current, audioBuffer);
  }, [audioBuffer]);

  const handleClear = useCallback(() => {
    setAudioBuffer(null);
    setAudioFile(null);
    setResult(null);
    setMetadata(null);
  }, []);

  const formatBytes = (n: number) => {
    if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h3 className="text-sm text-[#00FF41] mb-2">INPUT_AUDIO:</h3>
        <AudioDropzone onAudioLoad={handleAudioLoad} label="DROP_AUDIO_TO_ANALYZE"
          fileName={audioFile?.name ?? null} />
      </div>

      {audioBuffer && result && (
        <>
          {/* File Metadata */}
          {metadata && (
            <div className="space-y-3">
              <h3 className="text-sm text-[#00FF41]">{"// FILE_METADATA"}</h3>
              <div className="border-t border-[#00FF41] pt-3"></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
                  <p className="text-[#00aa2a] text-xs mb-1">BASIC_INFO:</p>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">FILENAME:</span>
                    <span className="text-[#00FF41] text-xs truncate max-w-40">{metadata.fileName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">FILE_SIZE:</span>
                    <span className="text-[#00FF41]">{metadata.fileSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">FILE_TYPE:</span>
                    <span className="text-[#00FF41]">{metadata.fileType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">LAST_MODIFIED:</span>
                    <span className="text-[#00FF41] text-xs">{metadata.lastModified}</span>
                  </div>
                </div>
                <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
                  <p className="text-[#00aa2a] text-xs mb-1">AUDIO_INFO:</p>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">DURATION:</span>
                    <span className="text-[#00FF41]">{metadata.duration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">SAMPLE_RATE:</span>
                    <span className="text-[#00FF41]">{metadata.sampleRate.toLocaleString()} Hz</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">CHANNELS:</span>
                    <span className="text-[#00FF41]">{metadata.channelLayout}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">BIT_DEPTH:</span>
                    <span className="text-[#00FF41]">{metadata.bitDepth}-bit</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">EST_BITRATE:</span>
                    <span className="text-[#00FF41]">{metadata.estimatedBitrate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#00aa2a]">TOTAL_SAMPLES:</span>
                    <span className="text-[#00FF41]">{metadata.totalSamples.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm text-[#00FF41]">{"// WAVEFORM_VISUALIZATION"}</h3>
            <div className="border-t border-[#00FF41] pt-3"></div>
            <div className="space-y-1">
              <p className="text-xs text-[#00aa2a]">TIME_DOMAIN:</p>
              <canvas ref={waveformRef} width={700} height={100} className="w-full" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-[#00aa2a]">FREQUENCY_DOMAIN (SPECTROGRAM):</p>
              <canvas ref={spectrogramRef} width={700} height={120} className="w-full" />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm text-[#00FF41]">{"// AUDIO_PROPERTIES"}</h3>
            <div className="border-t border-[#00FF41] pt-3"></div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">FILENAME:</span>
                  <span className="text-[#00FF41] text-xs truncate max-w-32">{audioFile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">DURATION:</span>
                  <span className="text-[#00FF41]">{formatDuration(result.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">SAMPLE_RATE:</span>
                  <span className="text-[#00FF41]">{result.sampleRate.toLocaleString()} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">CHANNELS:</span>
                  <span className="text-[#00FF41]">{result.channels === 1 ? 'MONO' : 'STEREO'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">TOTAL_SAMPLES:</span>
                  <span className="text-[#00FF41]">{result.sampleCount.toLocaleString()}</span>
                </div>
              </div>

              <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
                <p className="text-[#00aa2a] text-xs mb-1">STEGANOGRAPHIC_CAPACITY:</p>
                {Object.entries(result.capacityBytes).map(([label, bytes]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-[#00aa2a]">{label.toUpperCase()} LSB:</span>
                    <span className="text-[#00FF41]">{formatBytes(bytes)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm text-[#00FF41]">{"// LSB_STEGANALYSIS"}</h3>
            <div className="border-t border-[#00FF41] pt-3"></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">LSB_ZERO_RATIO:</span>
                  <span className="text-[#00FF41] font-mono">{(result.lsbZeroRatio * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">LSB_ONE_RATIO:</span>
                  <span className="text-[#00FF41] font-mono">{(result.lsbOneRatio * 100).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#00aa2a]">CHI_SQUARE:</span>
                  <span className="text-[#00FF41] font-mono">{result.chiSquareStat.toFixed(4)}</span>
                </div>
              </div>

              <div className="border border-[#00aa2a] p-3 space-y-4">
                <div>
                  <p className="text-xs text-[#00aa2a] mb-2">ESTIMATED_EMBEDDING_RATE:</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-[#0a0a0a] border border-[#00aa2a]">
                      <div className="h-full bg-[#00FF41] transition-all duration-300"
                        style={{ width: `${result.estimatedEmbeddingRate * 100}%` }} />
                    </div>
                    <span className="font-mono text-[#00FF41] text-sm">
                      {(result.estimatedEmbeddingRate * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-[#00aa2a] mb-2">DETECTION_RISK:</p>
                  <span className={`inline-block px-3 py-1 border text-sm ${
                    result.detectionRisk === 'low'
                      ? 'border-[#00FF41] text-[#00FF41]'
                      : result.detectionRisk === 'medium'
                      ? 'border-[#FFaa00] text-[#FFaa00]'
                      : 'border-[#FF2200] text-[#FF2200]'
                  }`}>
                    {result.detectionRisk.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button onClick={handleClear}
              className="py-2 px-6 border border-[#FF2200] text-[#FF2200] text-sm
                hover:bg-[#FF2200] hover:text-[#0a0a0a] transition-colors">
              CLEAR
            </button>
          </div>
        </>
      )}
    </div>
  );
}
