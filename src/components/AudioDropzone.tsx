'use client';

import { useCallback, useState } from 'react';

interface AudioDropzoneProps {
  onAudioLoad: (buffer: AudioBuffer, file: File) => void;
  label?: string;
  fileName?: string | null;
}

export function AudioDropzone({
  onAudioLoad,
  label = 'DROP_AUDIO_FILE_OR_CLICK_TO_UPLOAD',
  fileName,
}: AudioDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);

      if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|flac|aiff|mp3|ogg|m4a)$/i)) {
        setError('ERROR: INVALID_FILE_TYPE — audio files only');
        setLoading(false);
        return;
      }

      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioCtx = new AudioContext();
        const buffer = await audioCtx.decodeAudioData(arrayBuffer);
        await audioCtx.close();
        onAudioLoad(buffer, file);
      } catch {
        setError('ERROR: FAILED_TO_DECODE_AUDIO — try WAV or FLAC format');
      } finally {
        setLoading(false);
      }
    },
    [onAudioLoad]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div
      className={`
        relative border cursor-pointer min-h-[140px] flex flex-col items-center justify-center
        transition-all duration-100 p-6
        ${isDragging
          ? 'border-[#00FF41] bg-[#00FF41]/10'
          : 'border-[#00aa2a] hover:border-[#00FF41]'
        }
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="audio/*,.wav,.flac,.aiff,.aif"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {loading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-[#00FF41] text-2xl animate-pulse">[~]</div>
          <p className="text-[#00FF41] text-sm">DECODING_AUDIO...</p>
        </div>
      ) : fileName ? (
        <div className="flex flex-col items-center gap-2">
          <div className="text-[#00FF41] text-3xl">[♪]</div>
          <p className="text-[#00FF41] text-sm font-bold">{fileName}</p>
          <p className="text-[#00aa2a] text-xs">CLICK_TO_REPLACE</p>
        </div>
      ) : (
        <>
          <div className="text-[#00FF41] text-4xl mb-3">[♪]</div>
          <p className="text-[#00FF41] text-sm text-center">{label}</p>
          <p className="text-[#00aa2a] text-xs mt-2">SUPPORTED: WAV · FLAC · AIFF · MP3*</p>
          <p className="text-[#00aa2a] text-xs">*ENCODE ONLY WORKS WITH LOSSLESS FORMATS</p>
        </>
      )}

      {error && (
        <p className="text-[#FF2200] text-xs mt-3 text-center">{error}</p>
      )}
    </div>
  );
}
