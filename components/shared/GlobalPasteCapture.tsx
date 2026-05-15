"use client";

import { useEffect, useState } from "react";
import { X, Send, Image as ImageIcon, Camera } from "lucide-react";

export default function GlobalPasteCapture() {
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [pastedFile, setPastedFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const t = e.target as HTMLElement;
      // Skip if user is typing in an input/textarea
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
        return;
      }
      for (const item of Array.from(e.clipboardData.items)) {
        if (item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = () => {
              setPastedImage(reader.result as string);
              setPastedFile(f);
            };
            reader.readAsDataURL(f);
            return;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const close = () => {
    setPastedImage(null);
    setPastedFile(null);
  };

  const sendToAskChief = async () => {
    if (!pastedFile) return;
    setSending(true);
    try {
      // Store image in sessionStorage for ai-chat page to pick up
      sessionStorage.setItem("chief_pasted_image", pastedImage || "");
      window.location.href = "/dashboard/ai-chat?paste=1";
    } catch (e) {
      console.error(e);
      setSending(false);
    }
  };

  if (!pastedImage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0a0a0a] border border-[#f5c518] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <Camera className="text-[#f5c518]" size={18} />
            <h3 className="font-display text-lg text-[#f0f0f0]">Screenshot detected</h3>
          </div>
          <button onClick={close} className="text-[#666] hover:text-[#f0f0f0] transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <img src={pastedImage} alt="Pasted screenshot" className="w-full rounded border border-[#1a1a1a] mb-4" />
          <div className="text-xs text-[#888] mb-4">
            Send this screenshot to Chief for analysis, or close to dismiss.
          </div>
          <div className="flex gap-2">
            <button
              onClick={sendToAskChief}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 bg-[#f5c518] hover:bg-[#f5d518] text-black px-4 py-3 rounded font-display text-sm tracking-wide transition-colors disabled:opacity-50"
            >
              <Send size={14} />
              {sending ? "Sending..." : "Ask Chief about this"}
            </button>
            <button
              onClick={close}
              className="px-4 py-3 border border-[#333] text-[#888] hover:text-[#f0f0f0] hover:border-[#555] rounded text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="text-[10px] text-[#555] font-mono-chief uppercase tracking-wider mt-3 text-center">
            Tip: Ctrl+V anywhere on Chief Racing to upload a screenshot
          </div>
        </div>
      </div>
    </div>
  );
}