import React, { useState, useRef } from "react";
import { UploadCloud, X, Image as ImageIcon } from "lucide-react";

interface ImageDropZoneProps {
  value?: string; // Base64 or image URL
  onChange: (value: string) => void;
  label?: string;
  maxSizeMB?: number;
}

export const ImageDropZone: React.FC<ImageDropZoneProps> = ({
  value,
  onChange,
  label = "Imagen del Plato",
  maxSizeMB = 2,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setError(null);

    // Validate type
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecciona solo archivos de imagen (PNG, JPG, JPEG, WEBP)");
      return;
    }

    // Validate size (e.g., max 2MB to prevent large Base64 loads in localStorage)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`La imagen es demasiado grande. El tamaño máximo permitido es ${maxSizeMB}MB`);
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      onChange(base64);
    } catch (err) {
      console.error("Error reading file:", err);
      setError("Ocurrió un error al procesar la imagen.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
    });
  };

  const onZoneClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onZoneClick}
        className={`relative w-full rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[160px] ${
          value
            ? "border-zinc-300 bg-zinc-50"
            : isDragActive
            ? "border-red-500 bg-red-50/40"
            : "border-border bg-white hover:border-accent/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileInput}
        />

        {value ? (
          // Image Preview State
          <div className="relative w-full h-full min-h-[140px] flex items-center justify-center group">
            <img
              src={value}
              alt="Preview"
              className="max-h-[160px] rounded-lg object-contain"
            />
            {/* Overlay Hover Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
              <button
                type="button"
                onClick={removeImage}
                className="bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 transition-colors shadow-lg active:scale-95"
                title="Eliminar imagen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Quick X button always visible */}
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-1 right-1 bg-zinc-900/80 text-white p-1 rounded-full hover:bg-red-650 transition-colors z-10 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          // Upload Prompt State
          <div className="space-y-2 pointer-events-none select-none">
            <div className="mx-auto w-12 h-12 rounded-full bg-zinc-50 border flex items-center justify-center text-text-secondary group-hover:scale-105 transition-transform duration-200">
              <UploadCloud className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-accent hover:underline">
                Haz clic para subir
              </span>{" "}
              o arrastra y suelta tu archivo
            </div>
            <p className="text-xs text-text-secondary">
              Soporta PNG, JPG, JPEG, WEBP (Máx. {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};
