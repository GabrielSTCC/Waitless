"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Upload, X } from "lucide-react";
import { SettingsButton } from "./SettingsButton";
import { settingsInputClass } from "./SettingsField";
import { cn } from "@/lib/utils/cn";

interface LogoUploadZoneProps {
  logoUrl: string;
  uploading: boolean;
  canUpload?: boolean;
  onUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
}

export function LogoUploadZone({
  logoUrl,
  uploading,
  canUpload = true,
  onUpload,
  onUrlChange,
  onClear,
}: LogoUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!canUpload) return;
    const file = files?.[0];
    if (file?.type.startsWith("image/")) onUpload(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-3">
        {logoUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-high shadow-surface-card">
            <Image src={logoUrl} alt="Logo" fill className="object-cover" unoptimized />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-outline-variant bg-surface-container-low">
            <ImageIcon className="h-5 w-5 text-on-surface-variant" strokeWidth={1.75} />
          </div>
        )}

        <div
          className={cn(
            "flex min-h-[3.5rem] flex-1 items-center gap-3 rounded-xl border-2 border-dashed px-3 py-2 transition-colors",
            !canUpload && "cursor-not-allowed opacity-60",
            dragOver && canUpload
              ? "border-primary bg-primary/5"
              : "border-outline-variant/80 bg-surface-container-low",
            canUpload && "hover:border-primary/40",
          )}
          onDragOver={(e) => {
            if (!canUpload) return;
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
        >
          <Upload className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-on-surface">
              {uploading
                ? "Enviando..."
                : canUpload
                  ? "Arraste ou selecione a logo"
                  : "Upload restrito ao dono"}
            </p>
            <p className="text-[11px] text-on-surface-variant">
              {canUpload
                ? "PNG, JPG, WebP · máx. 4 MB"
                : "Use o campo de URL ou peça ao dono do estabelecimento"}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!canUpload}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <SettingsButton
            type="button"
            variant="secondary"
            size="sm"
            loading={uploading}
            disabled={!canUpload}
            onClick={() => canUpload && inputRef.current?.click()}
          >
            {logoUrl ? "Alterar" : "Enviar"}
          </SettingsButton>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="ou cole a URL da logo"
          className={cn(settingsInputClass, "h-10 text-sm")}
        />
        {logoUrl && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Remover logo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
