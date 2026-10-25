import { useContext, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PdfRenderContext } from "./AutoTextarea";

type Props = {
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  align?: "left" | "center" | "right";
  ariaLabel?: string;
};

/** Inline text/number field rendered as plain text until clicked. */
export function EditableField({
  value,
  onChange,
  type = "text",
  className,
  inputClassName,
  placeholder,
  align = "left",
  ariaLabel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value ?? ""));
  const ref = useRef<HTMLInputElement>(null);
  const isPdf = useContext(PdfRenderContext);

  useEffect(() => setLocal(String(value ?? "")), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (local !== String(value)) onChange(local);
  };

  const alignCls = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  if (isPdf) {
    return (
      <span
        aria-label={ariaLabel}
        className={cn("block w-full px-2", alignCls, className)}
        style={{
          lineHeight: 1.15,
          paddingTop: 1,
          paddingBottom: 0,
          marginTop: -2,
          verticalAlign: "top",
        }}
      >
        {String(value ?? "") || <span className="text-muted-foreground/60">{placeholder ?? "—"}</span>}
      </span>
    );
  }

  if (editing) {
    return (
      <Input
        ref={ref}
        type={type}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setLocal(String(value ?? "")); setEditing(false); }
        }}
        aria-label={ariaLabel}
        className={cn("h-7 px-2 py-0 bg-input/50 border-border", alignCls, inputClassName)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      className={cn(
        "min-h-7 w-full rounded-md px-2 py-0.5 transition-colors hover:bg-muted/40 cursor-text",
        alignCls,
        className,
      )}
    >
      {String(value ?? "") || <span className="text-muted-foreground/60">{placeholder ?? "—"}</span>}
    </button>
  );
}
