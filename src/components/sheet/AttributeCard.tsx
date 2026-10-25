import { ATTRIBUTES, formatMod, modifier, type AttrKey } from "@/lib/sheet/character";
import { EditableField } from "./EditableField";
import { HelpIcon } from "./HelpIcon";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Props = {
  attrKey: AttrKey;
  score: number;
  proficiencies: Record<string, boolean>;
  onScoreChange: (v: number) => void;
  onProfChange: (sub: string, val: boolean) => void;
  highlighted?: boolean;
  canHighlight?: boolean;
  onToggleHighlight?: () => void;
};

export function AttributeCard({ attrKey, score, proficiencies, onScoreChange, onProfChange, highlighted, canHighlight, onToggleHighlight }: Props) {
  const def = ATTRIBUTES.find((a) => a.key === attrKey)!;
  const mod = modifier(score);

  const canClick = !!onToggleHighlight && (highlighted || canHighlight);
  return (
    <div
      className={cn(
        "sheet-panel relative p-4 pt-7 flex flex-col items-stretch gap-3 overflow-hidden transition-all",
        canClick && !highlighted && "cursor-pointer hover:shadow-[0_0_18px_-6px_hsl(var(--primary))]",
      )}
      style={
        highlighted
          ? {
              border: "3px solid hsl(var(--primary))",
              boxShadow:
                "0 0 0 4px color-mix(in oklab, hsl(var(--primary)) 35%, transparent), 0 0 40px -4px hsl(var(--primary))",
              background:
                "color-mix(in oklab, hsl(var(--primary)) 10%, hsl(var(--card)))",
            }
          : undefined
      }
    >
      {onToggleHighlight && (
        <button
          type="button"
          onClick={onToggleHighlight}
          disabled={!highlighted && !canHighlight}
          aria-pressed={highlighted}
          title={highlighted ? "Quitar destacado" : "Destacar atributo"}
          className={cn(
            "absolute top-2 left-2 z-10 w-6 h-6 flex items-center justify-center rounded-md border text-sm transition-colors",
            highlighted
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card/60 border-border text-muted-foreground hover:text-primary hover:border-primary/60 disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {highlighted ? "★" : "☆"}
        </button>
      )}
      {/* Decorative top accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl md:text-2xl font-extrabold tracking-wide text-foreground uppercase">
            {def.full}
          </span>
          <HelpIcon field={def.full} />
        </div>

        {/* Big modifier centered, score below */}
        <div className="relative flex flex-col items-center justify-center">
          <div
            className="w-24 h-24 flex items-center justify-center rounded-full bg-card/80 border-2 border-primary/60 shadow-[0_0_24px_-6px_hsl(var(--primary))]"
          >
            <span className="text-4xl font-extrabold text-primary leading-none">
              {formatMod(mod)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">Valor</span>
            <div className="w-16">
              <EditableField
                value={score}
                type="number"
                align="center"
                inputClassName="text-lg font-bold h-8"
                ariaLabel={`Valor ${def.full}`}
                onChange={(v) => {
                  const n = Math.max(1, Math.min(30, parseInt(v || "10", 10) || 10));
                  onScoreChange(n);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 mt-1">
        {def.subs.map((sub) => {
          const checked = !!proficiencies[sub];
          return (
            <li key={sub} className={cn(
              "flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm",
              "bg-muted/30 hover:bg-muted/50 transition-colors",
              checked && "border-primary/60 bg-primary/10",
            )}>
              <Checkbox
                checked={checked}
                onCheckedChange={(v) => onProfChange(sub, !!v)}
                className="h-4 w-4 rounded-full data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground border-border"
                aria-label={`Proficiencia ${sub}`}
              />
              <span className="font-medium flex-1">{sub}</span>
              <HelpIcon field={sub} />
              {checked && (
                <span className="text-primary font-semibold">{formatMod(mod + 2)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
