'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

// Iconos SVG
const CloudUploadIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

interface ImageUploaderProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string | null) => void;
  disabled?: boolean;
  instructorName?: string;
}

export default function ImageUploader({ 
  currentImageUrl, 
  onImageUploaded, 
  disabled = false,
  instructorName = 'instructor'
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const BUCKET_NAME = 'instructors';
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

  const generateFileName = (file: File): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = file.name.split('.').pop();
    const safeName = instructorName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    return `${safeName}-${timestamp}-${random}.${extension}`;
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const fileName = generateFileName(file);
      
      // Subir archivo a Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Error al subir: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      onImageUploaded(publicUrl);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : 'Error desconocido al subir la imagen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (disabled || isUploading) return;
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveImage = () => {
    onImageUploaded(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[#5d241d]">
        Foto de Perfil
      </label>
      
      {/* Vista previa de imagen actual */}
      {currentImageUrl && (
        <div className="relative inline-block">
          <img
            src={currentImageUrl}
            alt="Vista previa"
            className="h-24 w-24 object-cover rounded-lg border border-[#d4bfad]"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            disabled={disabled || isUploading}
            className="absolute -top-2 -right-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-1 disabled:opacity-50"
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
          ${dragActive ? 'border-[#a75a4a] bg-[#e7ceb9]' : 'border-[#d4bfad]'}
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#a75a4a] hover:bg-[#f5ebe3]'}
          ${uploadError ? 'border-[#8b372d] bg-[#f5ebe3]' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading}
        />

        <div className="text-center">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 border-2 border-[#a75a4a] border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-sm text-[#5d241d]">Subiendo imagen...</p>
            </div>
          ) : uploadError ? (
            <div className="flex flex-col items-center">
              <XCircleIcon className="h-8 w-8 text-[#8b372d] mb-2" />
              <p className="text-sm text-[#5d241d]">{uploadError}</p>
              <p className="text-xs text-[#8a6b63] mt-1">Haz clic para intentar de nuevo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <CloudUploadIcon className="h-8 w-8 text-[#8a6b63] mb-2" />
              <p className="text-sm text-[#5d241d]">
                <span className="font-medium">Haz clic para subir</span> o arrastra una imagen aquí
              </p>
              <p className="text-xs text-[#8a6b63] mt-1">
                PNG, JPG, WebP hasta 5MB
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Input oculto para el formulario */}
      <input
        type="hidden"
        name="profile_picture_url"
        value={currentImageUrl || ''}
      />
    </div>
  );
} 