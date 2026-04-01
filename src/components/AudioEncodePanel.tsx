'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AudioDropzone } from './AudioDropzone';
import {
  encodeAudio,
  audioBufferToWav,
  calculateAudioCapacity,
  type AudioBitDepth,
} from '@/lib';
import { drawAudioWaveform } from '@/lib/audio-analyze';

export function AudioEncodePanel() {
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [useEncryption, setUseEncryption] = useState(false);
  const [bitDepth, setBitDepth] = useState<AudioBitDepth>(1);
  const [isEncoding, setIsEncoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ snr: number; bytes: number } | null>(null);

  const origCanvasRef = useRef<HTMLCanvasElement>(null);
  const stegoCanvasRef = useRef<HTMLCanvasElement>(null);
  const [stegoBuffer, setStegoBuffer] = useState<AudioBuffer | null>(null);

  const handleAudioLoad = useCallback((buffer: AudioBuffer, file: File) => {
    setAudioBuffer(buffer);
    setAudioFile(file);
    setStegoBuffer(null);
    setError(null);
    setSuccess(null);
  }, []);

  useEffect(() => {
    if (audioBuffer && origCanvasRef.current) {
      drawAudioWaveform(origCanvasRef.current, audioBuffer, '#00FF41');
    }
  }, [audioBuffer]);

  useEffect(() => {
    if (stegoBuffer && stegoCanvasRef.current) {
      drawAudioWaveform(stegoCanvasRef.current, stegoBuffer, '#00aa2a');
    }
  }, [stegoBuffer]);

  const capacity = useMemo(() => {
    if (!audioBuffer) return 0;
    return calculateAudioCapacity(
      audioBuffer.sampleRate,
      audioBuffer.duration,
      audioBuffer.numberOfChannels,
      bitDepth
    );
  }, [audioBuffer, bitDepth]);

  const messageBytes = useMemo(
    () => new TextEncoder().encode(message).length,
    [message]
  );

  const capacityPercent = useMemo(
    () => (capacity === 0 ? 0 : Math.min(100, (messageBytes / capacity) * 100)),
    [messageBytes, capacity]
  );

  const handleEncode = useCallback(async () => {
    if (!audioBuffer || !message) return;
    setIsEncoding(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await encodeAudio({
        message,
        audioBuffer,
        bitDepth,
        password: useEncryption && password ? password : undefined,
      });

      setStegoBuffer(result.stegoBuffer);

      const blob = audioBufferToWav(result.stegoBuffer);
      const baseName = audioFile?.name.replace(/\.[^/.]+$/, '') ?? 'audio';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${baseName}_stego.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess({ snr: result.snrDb, bytes: result.capacityUsed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ENCODING_FAILED');
    } finally {
      setIsEncoding(false);
    }
  }, [audioBuffer, message, bitDepth, useEncryption, password, audioFile]);

  const handleClear = useCallback(() => {
    setAudioBuffer(null);
    setAudioFile(null);
    setMessage('');
    setPassword('');
    setStegoBuffer(null);
    setError(null);
    setSuccess(null);
  }, []);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return `${m}:${s.padStart(4, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left — Audio input */}
        <div className="space-y-4">
          <h3 className="text-sm text-[#00FF41]">COVER_AUDIO:</h3>
          <AudioDropzone
            onAudioLoad={handleAudioLoad}
            label="DROP_LOSSLESS_AUDIO_HERE"
            fileName={audioFile?.name ?? null}
          />

          {audioBuffer && (
            <div className="border border-[#00aa2a] p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#00aa2a]">DURATION:</span>
                <span className="text-[#00FF41]">{formatDuration(audioBuffer.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#00aa2a]">SAMPLE_RATE:</span>
                <span className="text-[#00FF41]">{audioBuffer.sampleRate.toLocaleString()} Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#00aa2a]">CHANNELS:</span>
                <span className="text-[#00FF41]">
                  {audioBuffer.numberOfChannels === 1 ? 'MONO' : 'STEREO'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#00aa2a]">FILE_SIZE:</span>
                <span className="text-[#00FF41]">
                  {audioFile ? `${(audioFile.size / 1024).toFixed(1)} KB` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#00aa2a]">CAPACITY ({bitDepth}-BIT):</span>
                <span className="text-[#00FF41]">{capacity.toLocaleString()} BYTES</span>
              </div>
            </div>
          )}

          {audioBuffer && (
            <div className="space-y-1">
              <p className="text-xs text-[#00aa2a]">ORIGINAL_WAVEFORM:</p>
              <canvas ref={origCanvasRef} width={480} height={80}
                className="w-full border border-[#00aa2a]" />
            </div>
          )}

          {stegoBuffer && (
            <div className="space-y-1">
              <p className="text-xs text-[#00aa2a]">STEGO_WAVEFORM:</p>
              <canvas ref={stegoCanvasRef} width={480} height={80}
                className="w-full border border-[#00aa2a]" />
            </div>
          )}
        </div>

        {/* Right — Message + options */}
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
                BYTES: {messageBytes.toLocaleString()} / {capacity.toLocaleString()}
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

          <div className="space-y-2">
            <label className="text-xs text-[#00aa2a]">LSB_BIT_DEPTH:</label>
            <div className="flex gap-2">
              {([1, 2, 4] as AudioBitDepth[]).map((depth) => (
                <button
                  key={depth}
                  onClick={() => setBitDepth(depth)}
                  className={`flex-1 py-2 px-3 border text-sm transition-colors ${
                    bitDepth === depth
                      ? 'bg-[#00FF41] border-[#00FF41] text-[#0a0a0a]'
                      : 'border-[#00aa2a] text-[#00aa2a] hover:border-[#00FF41] hover:text-[#00FF41]'
                  }`}
                >
                  {depth}-BIT
                </button>
              ))}
            </div>
            <p className="text-xs text-[#00aa2a]">
              IMPERCEPTIBILITY: {bitDepth === 1
                ? 'EXCELLENT (~80dB SNR)'
                : bitDepth === 2
                ? 'VERY_GOOD (~74dB SNR)'
                : 'GOOD (~62dB SNR)'}
            </p>
          </div>

          {error && (
            <div className="border border-[#FF2200] p-3 text-[#FF2200] text-sm">
              ERROR: {error}
            </div>
          )}

          {success && (
            <div className="border border-[#00FF41] p-3 text-sm space-y-1">
              <p className="text-[#00FF41]">SUCCESS: AUDIO_ENCODED_AND_DOWNLOADED</p>
              <p className="text-[#00aa2a]">
                SNR: <span className="text-[#00FF41]">{success.snr.toFixed(1)} dB</span>
                &nbsp;|&nbsp;
                SIZE: <span className="text-[#00FF41]">{success.bytes.toLocaleString()} BYTES</span>
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleEncode}
              disabled={!audioBuffer || !message || messageBytes > capacity || isEncoding}
              className="flex-1 py-2 px-4 border border-[#00FF41] text-[#00FF41] text-sm
                hover:bg-[#00FF41] hover:text-[#0a0a0a] transition-colors
                disabled:border-[#00aa2a] disabled:text-[#00aa2a] disabled:cursor-not-allowed
                disabled:hover:bg-transparent disabled:hover:text-[#00aa2a]"
            >
              {isEncoding ? 'ENCODING...' : 'ENCODE_AUDIO >>'}
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
    </div>
  );
}
