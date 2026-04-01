'use client';

import { useCallback, useState } from 'react';

interface ImageDropzoneProps {
  onImageLoad: (imageData: ImageData, file: File) => void;
  accept?: string;
  label?: string;
  preview?: string | null;
}

export function ImageDropzone({ 
  onImageLoad, 
  accept = 'image/png,image/bmp,image/tiff',
  label = 'DROP_IMAGE_HERE_OR_CLICK_TO_UPLOAD',
  preview
}: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = useCallback((file: File) => {
    setError(null);
    
    if (!file.type.startsWith('image/')) {
      setError('ERROR: INVALID_FILE_TYPE');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        onImageLoad(imageData, file);
      };
      img.onerror = () => setError('ERROR: FAILED_TO_LOAD_IMAGE');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => setError('ERROR: FAILED_TO_READ_FILE');
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  return (
    <div
      className={`
        relative border cursor-pointer min-h-[200px] flex flex-col items-center justify-center
        transition-all duration-100
        ${isDragging 
          ? 'border-[#00FF41] bg-[#00FF41]/10' 
          : 'border-[#00aa2a] hover:border-[#00FF41]'
        }
        ${preview ? 'p-2' : 'p-6'}
      `}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      
      {preview ? (
        <img 
          src={preview} 
          alt="PREVIEW" 
          className="max-w-full max-h-[250px] object-contain border border-[#00aa2a]"
        />
      ) : (
        <>
          <div className="text-[#00FF41] text-4xl mb-4">[+]</div>
          <p className="text-[#00FF41] text-sm">{label}</p>
          <p className="text-[#00aa2a] text-xs mt-2">SUPPORTED: PNG, BMP, TIFF</p>
        </>
      )}
      
      {error && (
        <p className="text-[#FF2200] text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
