'use client';

import { useState, useRef } from 'react';

// Iconos SVG
const CloudUploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onImageSelected: (file: File | null) => void;
  disabled?: boolean;
  itemName?: string;
}

export default function ImageUploader({ 
  currentImageUrl, 
  onImageSelected, 
  disabled = false,
  itemName = 'item'
}: ImageUploaderProps) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Solo se permiten archivos JPG, PNG y WebP';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'El archivo debe ser menor a 5MB';
    }
    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploadError(null);
    
    // Crear preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    // Notificar al padre
    onImageSelected(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled) return;
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    onImageSelected(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Determinar qué imagen mostrar (preview nuevo o imagen existente)
  const displayImageUrl = previewUrl || currentImageUrl;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Imagen del Producto
      </label>
      
      {/* Vista previa de imagen */}
      {displayImageUrl && (
        <div className="relative inline-block">
          <img
            src={displayImageUrl}
            alt="Vista previa"
            className="h-24 w-24 object-cover rounded-lg border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled}
            className="absolute -top-2 -right-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 disabled:opacity-50"
            title="Eliminar imagen"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Área de subida */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-gray-50'}
          ${uploadError ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          name="image"
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="text-center">
          {uploadError ? (
            <div className="flex flex-col items-center">
              <XCircleIcon className="h-8 w-8 text-red-500 mb-2" />
              <p className="text-sm text-red-600">{uploadError}</p>
              <p className="text-xs text-gray-500 mt-1">Haz clic para intentar de nuevo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <CloudUploadIcon className="h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                <span className="font-medium">Haz clic para subir</span> o arrastra una imagen aquí
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, WebP hasta 5MB
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
