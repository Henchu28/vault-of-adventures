import { EditableField } from "./EditableField";
import { HelpIcon } from "./HelpIcon";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  helpField?: string;
  value: string | number;
  onChange?: (v: string) => void;
  computed?: boolean;
  hint?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  objNote?: string;
};

export function StatBox({ label, helpField, value, onChange, computed, hint, className, size = "md", objNote }: Props) {
  const valueClass =
    size === "xl" ? "text-5xl md:text-6xl" :
    size === "lg" ? "text-3xl md:text-4xl" :
    size === "sm" ? "text-xl" : "text-2xl";
  const labelClass =
    size === "xl" ? "text-lg" :
    size === "lg" ? "text-base" : "text-base";
  const inputClass =
    size === "xl" ? "text-5xl md:text-6xl font-bold h-16 md:h-20" :
    size === "lg" ? "text-3xl md:text-4xl font-bold h-12" :
    size === "sm" ? "text-xl font-bold h-9" :
    "text-2xl font-bold h-10";

  const fullHint = hint && objNote ? `${hint} ${objNote}` : (hint ?? (objNote || ""));

  return (
    <div className={cn("sheet-panel p-3 flex flex-col gap-1.5 h-full", size === "xl" && "p-5 items-center justify-center text-center", className)}>
      <div className={cn("flex items-center justify-between", size === "xl" && "justify-center gap-2")}>
        <span className={cn("font-semibold tracking-wide text-foreground/90 uppercase", labelClass, size === "xl" && "tracking-[0.2em]")}>
          {label}
        </span>
        <HelpIcon field={helpField ?? label} />
      </div>
      <div className={cn("font-bold", valueClass, computed && "text-primary")}>
        {computed || !onChange ? (
          <span className="px-1 block">{value}</span>
        ) : (
          <EditableField
            value={value}
            onChange={onChange}
            ariaLabel={label}
            inputClassName={inputClass}
            align={size === "xl" ? "center" : "left"}
          />
        )}
      </div>
      {fullHint && (
        <span className={cn("text-xs", objNote ? "text-primary" : "text-muted-foreground/70")}>
          {fullHint}
        </span>
      )}
    </div>
  );
}
