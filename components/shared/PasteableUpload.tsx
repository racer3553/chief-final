"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Image as ImageIcon, X, Clipboard } from "lucide-react";

interface Props {
  onFile?: (file: File) => void;
  onUrl?: (dataUrl: string) => void;
  accept?: string;
  label?: string;
  className?: string;
}

export default function PasteableUpload({
  onFile, onUrl, accept = "image/*",
  label = "Drop, click, or paste (Ctrl+V) an image", className = "",
}: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file) return;
    onFile?.(file);
    const r = new FileReader();
    r.onload = () => {
      setPreview(r.result as string);
      onUrl?.(r.result as string);
      setFlash("Pasted!");
      setTimeout(() => setFlash(null), 1200);
    };
    r.readAsDataURL(file);
  }, [onFile, onUrl]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) { e.preventDefault(); handleFile(f); return; }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [handleFile]);

  return (
    <div className={`relative ${className}`}>
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all flex flex-col items-center justify-center gap-3 min-h-[200px] ${
          dragOver ? "border-[#f5c518] bg-[#f5c51811]" : "border-[#333] hover:border-[#555] bg-[#0a0a0a]"
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" className="max-h-48 rounded" />
            <button onClick={(e) => { e.stopPropagation(); setPreview(null); }} className="text-xs text-[#888] hover:text-[#ff2d2d] flex items-center gap-1">
              <X size={12} /> Remove
            </button>
          </>
        ) : (
          <>
            {dragOver ? <Upload size={32} className="text-[#f5c518]" /> : <ImageIcon size={32} className="text-[#555]" />}
            <div className="text-sm text-[#999] text-center">{label}</div>
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <Clipboard size={12} /> <span>Ctrl+V to paste a screenshot</span>
            </div>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="hidden"
      />
      {flash && (
        <div className="absolute top-2 right-2 bg-[#f5c518] text-black text-xs px-2 py-1 rounded font-mono-chief">{flash}</div>
      )}
    </div>
  );
}