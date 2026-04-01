'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { AudioDropzone } from './AudioDropzone';
import { decodeAudio, detectAudioHiddenData, type AudioBitDepth } from '@/lib';
import { drawAudioWaveform } from '@/lib/audio-analyze';

export function AudioDecodePanel() {
  const [stegoBuffer, setStegoBuffer] = useState<AudioBuffer | null>(null);
  const [stegoFile, setStegoFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [bitDepth, setBitDepth] = useState<AudioBitDepth>(1);
  const [decodedMessage, setDecodedMessage] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [estimatedLength, setEstimatedLength] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleAudioLoad = useCallback(
    (buffer: AudioBuffer, file: File) => {
      setStegoBuffer(buffer);
      setStegoFile(file);
      setDecodedMessage(null);
      setError(null);
      const detection = detectAudioHiddenData(buffer, bitDepth);
      setConfidence(detection.confidence);
      setEstimatedLength(detection.hasData ? detection.estimatedLength : null);
    },
    [bitDepth]
  );

  useEffect(() => {
    if (stegoBuffer && canvasRef.current) {
      drawAudioWaveform(canvasRef.current, stegoBuffer, '#00FF41');
    }
  }, [stegoBuffer]);

  useEffect(() => {
    if (stegoBuffer) {
      const detection = detectAudioHiddenData(stegoBuffer, bitDepth);
      setConfidence(detection.confidence);
      setEstimatedLength(detection.hasData ? detection.estimatedLength : null);
    }
  }, [stegoBuffer, bitDepth]);

  const handleDecode = useCallback(async () => {
    if (!stegoBuffer) return;
    setIsDecoding(true);
    setError(null);
    setDecodedMessage(null);
    try {
      const result = await decodeAudio({
        stegoBuffer,
        bitDepth,
        password: password || undefined,
      });
      setDecodedMessage(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'DECODING_FAILED');
    } finally {
      setIsDecoding(false);
    }
  }, [stegoBuffer, bitDepth, password]);

  const handleCopy = useCallback(() => {
    if (decodedMessage) {
      navigator.clipboard.writeText(decodedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [decodedMessage]);

  const handleClear = useCallback(() => {
    setStegoBuffer(null);
    setStegoFile(null);
    setPassword('');
    setDecodedMessage(null);
    setError(null);
    setConfidence(null);
    setEstimatedLength(null);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-sm text-[#00FF41] mb-2">INPUT_AUDIO:</h3>
        <AudioDropzone
          onAudioLoad={handleAudioLoad}
          label="DROP_STEGO_AUDIO_TO_DECODE"
          fileName={stegoFile?.name ?? null}
        />
      </div>

      {stegoBuffer && (
        <div className="space-y-1">
          <p className="text-xs text-[#00aa2a]">AUDIO_WAVEFORM:</p>
          <canvas ref={canvasRef} width={600} height={80}
            className="w-full border border-[#00aa2a]" />
          <div className="flex gap-6 text-xs text-[#00aa2a] mt-1">
            <span>DURATION: <span className="text-[#00FF41]">{formatDuration(stegoBuffer.duration)}</span></span>
            <span>RATE: <span className="text-[#00FF41]">{stegoBuffer.sampleRate.toLocaleString()} Hz</span></span>
            <span>CH: <span className="text-[#00FF41]">{stegoBuffer.numberOfChannels === 1 ? 'MONO' : 'STEREO'}</span></span>
          </div>
        </div>
      )}

      {confidence !== null && stegoBuffer && (
        <div className="border border-[#00aa2a] p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[#00aa2a]">DETECTION_CONFIDENCE:</span>
            <span className="text-[#00FF41]">{(confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-[#0a0a0a] border border-[#00aa2a]">
            <div className="h-full bg-[#00FF41] transition-all duration-300"
              style={{ width: `${confidence * 100}%` }} />
          </div>
          {estimatedLength !== null && (
            <p className="text-xs text-[#00aa2a]">
              ESTIMATED_PAYLOAD: <span className="text-[#00FF41]">{estimatedLength.toLocaleString()} BYTES</span>
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs text-[#00aa2a]">LSB_BIT_DEPTH:</label>
        <div className="flex gap-2">
          {([1, 2, 4] as AudioBitDepth[]).map((depth) => (
            <button key={depth} onClick={() => setBitDepth(depth)}
              className={`flex-1 py-2 px-4 border text-sm transition-colors ${
                bitDepth === depth
                  ? 'bg-[#00FF41] border-[#00FF41] text-[#0a0a0a]'
                  : 'border-[#00aa2a] text-[#00aa2a] hover:border-[#00FF41] hover:text-[#00FF41]'
              }`}>
              {depth}-BIT
            </button>
          ))}
        </div>
        <p className="text-xs text-[#00aa2a]">MUST_MATCH_THE_DEPTH_USED_DURING_ENCODING</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-[#00aa2a]">DECRYPTION_PASSWORD:</label>
        <input type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ENTER_PASSWORD_IF_ENCRYPTED..."
          className="w-full p-2 border border-[#00FF41] bg-[#0a0a0a] text-[#00FF41]
            placeholder-[#00aa2a] font-mono text-sm focus:outline-none" />
      </div>

      <div className="flex gap-3">
        <button onClick={handleDecode} disabled={!stegoBuffer || isDecoding}
          className="flex-1 py-2 px-4 border border-[#00FF41] text-[#00FF41] text-sm
            hover:bg-[#00FF41] hover:text-[#0a0a0a] transition-colors
            disabled:border-[#00aa2a] disabled:text-[#00aa2a] disabled:cursor-not-allowed
            disabled:hover:bg-transparent disabled:hover:text-[#00aa2a]">
          {isDecoding ? 'DECODING...' : '<< DECODE_AUDIO'}
        </button>
        <button onClick={handleClear}
          className="py-2 px-4 border border-[#FF2200] text-[#FF2200] text-sm
            hover:bg-[#FF2200] hover:text-[#0a0a0a] transition-colors">
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
            <button onClick={handleCopy}
              className="text-xs text-[#00aa2a] hover:text-[#00FF41] transition-colors">
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
