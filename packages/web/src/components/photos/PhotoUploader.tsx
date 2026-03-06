import { useRef, useState, useCallback } from "react";
import { SUPPORTED_MIME_TYPES, MAX_FILE_SIZE } from "@str-renovator/shared";

interface Props {
  onUpload: (files: File[]) => void;
  isUploading?: boolean;
}

export function PhotoUploader({ onUpload, isUploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const valid = Array.from(fileList).filter(
        (f) =>
          SUPPORTED_MIME_TYPES.has(f.type) && f.size <= MAX_FILE_SIZE,
      );
      if (valid.length > 0) onUpload(valid);
    },
    [onUpload],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-150 ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />
      {isUploading ? (
        <div className="text-blue-600">
          <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
          <p className="text-sm font-medium">Uploading...</p>
        </div>
      ) : (
        <div className="text-gray-500">
          <p className="text-sm font-medium">
            Click or drag photos here to upload
          </p>
          <p className="text-xs mt-1">JPEG, PNG, or WebP (max 20MB each)</p>
        </div>
      )}
    </div>
  );
}
