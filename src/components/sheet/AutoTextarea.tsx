import { useContext, createContext, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const PdfRenderContext = createContext(false);

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
};

export function AutoTextarea({ value, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isPdf = useContext(PdfRenderContext);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => { resize(); }, [value]);

  if (isPdf) {
    return (
      <div
        className={cn(
          "w-full bg-input/40 border border-border rounded-md whitespace-pre-wrap break-words",
          className,
        )}
        style={{
          padding: "4px 8px",
          fontSize: "12px",
          lineHeight: 1.35,
          minHeight: "1.6rem",
        }}
      >
        {value || <span className="text-muted-foreground/60">{placeholder ?? ""}</span>}
      </div>
    );
  }

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={cn(
        "w-full resize-none overflow-hidden bg-input/40 border border-border rounded-md p-3 text-sm leading-relaxed",
        "focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60",
        className,
      )}
    />
  );
}
