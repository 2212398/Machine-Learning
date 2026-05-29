"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // Keep client validation aligned with backend and storage limits.

export interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone({ onFileSelect, disabled = false, className }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const pickerInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const dragStatusId = useId();

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const clearInputs = () => {
    if (pickerInputRef.current) {
      pickerInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const clearSelection = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setIsDragOver(false);
    clearInputs();
  };

  const validateAndSelect = (file?: File) => {
    if (!file || disabled) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t.diagnosis.invalidType);
      setSelectedFile(null);
      setPreview(null);
      clearInputs();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t.diagnosis.tooLarge);
      setSelectedFile(null);
      setPreview(null);
      clearInputs();
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(nextPreview);
    setSelectedFile(file);
    setError(null);
    onFileSelect(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    validateAndSelect(event.dataTransfer.files[0]);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    validateAndSelect(event.target.files?.[0]);
  };

  const openPicker = () => {
    if (!disabled) {
      pickerInputRef.current?.click();
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative min-h-[200px] overflow-hidden rounded-lg border-2 border-dashed border-neutral-400/50 bg-surface-raised p-6 text-center transition-all duration-150 sm:min-h-[280px]",
          !disabled && "cursor-pointer hover:border-primary",
          isDragOver && "scale-[1.01] border-solid border-primary bg-primary-pale",
          selectedFile && "border-solid border-success bg-surface",
          error && "border-solid border-danger",
          disabled && "cursor-not-allowed opacity-60",
        )}
        onClick={openPicker}
        onDragLeave={() => setIsDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragOver(true);
          }
        }}
        onDrop={handleDrop}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        aria-describedby={error ? errorId : dragStatusId}
        aria-label={t.diagnosis.uploadHint}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <input
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={handleFileChange}
          ref={pickerInputRef}
          type="file"
        />
        <input
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled}
          onChange={handleFileChange}
          ref={cameraInputRef}
          type="file"
        />

        {preview && selectedFile ? (
          <div className="relative mx-auto max-w-xl overflow-hidden rounded-lg border border-success/30">
            <img
              alt={`Preview ${selectedFile.name}`}
              className="max-h-60 w-full object-cover"
              src={preview}
            />
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-neutral-900/70 px-3 py-2 text-left text-sm text-white">
              <div className="min-w-0">
                <p className="truncate font-semibold">{selectedFile.name}</p>
                <p className="text-sm sm:text-xs text-white/80">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                aria-label={t.diagnosis.deleteImage}
                className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-white/90 text-neutral-900 transition hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  clearSelection();
                }}
                type="button"
              >
                x
              </button>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col items-center py-8">
            <svg
              aria-hidden="true"
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M5 19c8.5-.5 13-5 14-14-9 1-13.5 5.5-14 14Zm0 0c2.5-3.5 5.5-6.5 9-9"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
            <p className="mt-4 text-base font-semibold text-neutral-900">
              {t.diagnosis.uploadHint}
            </p>
            <p className="mt-1 text-sm text-neutral-700">{t.diagnosis.uploadSubHint}</p>
            <div
              className="mt-5 flex flex-wrap justify-center gap-3"
              onClick={(event) => event.stopPropagation()}
            >
              <Button
                disabled={disabled}
                onClick={() => pickerInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                {t.diagnosis.chooseFile}
              </Button>
              <Button
                className="block sm:hidden"
                disabled={disabled}
                onClick={() => cameraInputRef.current?.click()}
                type="button"
              >
                {t.diagnosis.takePhoto}
              </Button>
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-sm font-medium text-danger" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only" id={dragStatusId}>
        {isDragOver ? "Drop the image here" : "Upload zone ready"}
      </p>
    </div>
  );
}
