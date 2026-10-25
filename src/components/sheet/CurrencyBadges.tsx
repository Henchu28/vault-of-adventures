import { Circle, Star } from "lucide-react";

type Props = { xp: number; evo: number };

export function CurrencyBadges({ xp, evo }: Props) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-primary/40"
        title="Puntos de Experiencia"
      >
        <Circle className="h-4 w-4 text-primary fill-primary/30" />
        <span className="font-bold text-primary tabular-nums">{xp}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">XP</span>
      </div>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-primary/40"
        title="Puntos de Evolución"
      >
        <Star className="h-4 w-4 text-primary fill-primary/40" />
        <span className="font-bold text-primary tabular-nums">{evo}</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider">EVO</span>
      </div>
    </div>
  );
}
