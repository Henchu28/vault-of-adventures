import { ATTRIBUTES, ATTRIBUTE_ORDER, formatMod, modifier, type CharacterData } from "@/lib/sheet/character";
import { AttributeCard } from "./AttributeCard";
import { EditableField } from "./EditableField";
import { HelpIcon } from "./HelpIcon";
import { StatBox } from "./StatBox";
import { inventoryCountMap, inventoryDeltaMap, type InventoryItem } from "@/lib/sheet/inventory";

type Props = {
  data: CharacterData;
  update: (patch: Partial<CharacterData>) => void;
  items?: InventoryItem[];
};

export function CharacterSheet({ data, update, items = [] }: Props) {
  const modCar = modifier(data.attrs.CAR);
  const modDes = modifier(data.attrs.DES);
  const modSab = modifier(data.attrs.SAB);
  const modInt = modifier(data.attrs.INT);

  const counts = inventoryCountMap(items);
  const deltas = inventoryDeltaMap(items);
  const noteFor = (key: string) => {
    const n = counts[key] || 0;
    if (!n) return undefined;
    const d = deltas[key] || 0;
    const sign = d >= 0 ? "+" : "";
    return `${sign}${n} Obj.`;
  };
  const mana = 15 + 5 * modCar + (deltas["mana"] || 0);
  const init = modDes + (deltas["init"] || 0);
  const accAdic = 1 + modSab + (deltas["acc_adic"] || 0);
  const rango = 15 + 5 * modDes + (deltas["rango"] || 0);
  const cd = 8 + Math.max(modSab, modInt) + (Number(data.bonif) || 0) + (deltas["cd"] || 0);
  const area = 1 + modInt + (deltas["area"] || 0);

  const orderedAttrs = ATTRIBUTE_ORDER.map((k) => ATTRIBUTES.find((a) => a.key === k)!);

  return (
    <div className="space-y-6">
      {/* Header: Nombre + Nivel */}
      <div className="sheet-panel p-5 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_auto_1fr] gap-4 items-end">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold tracking-wide text-foreground/90">Nombre</span>
            <HelpIcon field="Nombre" />
            <div className="flex-1">
              <EditableField
                value={data.nombre}
                onChange={(v) => update({ nombre: v })}
                inputClassName="text-3xl md:text-4xl font-bold h-12"
                className="text-3xl md:text-4xl font-bold text-foreground"
                ariaLabel="Nombre del personaje"
              />
            </div>
          </div>

          <div className="hidden md:block w-px h-10 bg-border mx-auto" />

          <div className="flex items-center gap-3 justify-end">
            <span className="text-base font-semibold tracking-wide text-foreground/90">Nivel</span>
            <HelpIcon field="Nivel" />
            <div className="w-20">
              <EditableField
                value={data.nivel}
                type="number"
                align="center"
                onChange={(v) => update({ nivel: Math.max(1, parseInt(v || "1", 10) || 1) })}
                inputClassName="text-2xl font-bold h-10 text-center"
                className="text-2xl font-bold text-primary"
                ariaLabel="Nivel"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vida-centric layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="grid grid-rows-2 gap-3">
          <StatBox label="Raza" value={data.raza} onChange={(v) => update({ raza: v })} />
          <StatBox label="Velocidad" value={data.velocidad} onChange={(v) => update({ velocidad: v })} objNote={noteFor("velocidad")} />
        </div>

        <div className="md:col-span-2">
          <StatBox label="Vida" value={data.vida} onChange={(v) => update({ vida: v })} size="xl" objNote={noteFor("vida")} />
        </div>

        <div className="grid grid-rows-2 gap-3">
          <StatBox label="CA" value={data.ca} onChange={(v) => update({ ca: v })} objNote={noteFor("ca")} />
          <StatBox label="Maná" value={mana} computed hint={`15 + 5 × ${formatMod(modCar)} CAR`} objNote={noteFor("mana")} />
        </div>
      </div>

      {/* DDG, Bonif, INIT */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="DDG" value={data.ddg} onChange={(v) => update({ ddg: v })} />
        <StatBox label="Bonif" value={data.bonif} onChange={(v) => update({ bonif: parseInt(v || "0", 10) || 0 })} objNote={noteFor("bonif")} />
        <StatBox label="INIT" value={formatMod(init)} computed hint={`= bonif. DES`} objNote={noteFor("init")} />
      </div>

      {/* Atributos — destacados */}
      <div>
        <div className="flex items-center justify-center mb-4">
          <div className="rune-chip px-5 py-2 rounded-full text-sm">Atributos</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {orderedAttrs.map((a) => {
            const highlighted = (data.highlightedAttrs ?? []).includes(a.key);
            const canHighlight = (data.highlightedAttrs ?? []).length < 2;
            return (
              <AttributeCard
                key={a.key}
                attrKey={a.key}
                score={data.attrs[a.key]}
                proficiencies={data.proficiencies}
                highlighted={highlighted}
                canHighlight={canHighlight}
                onToggleHighlight={() => {
                  const cur = data.highlightedAttrs ?? [];
                  const next = cur.includes(a.key)
                    ? cur.filter((k) => k !== a.key)
                    : cur.length >= 2
                      ? cur
                      : [...cur, a.key];
                  update({ highlightedAttrs: next });
                }}
                onScoreChange={(v) => update({ attrs: { ...data.attrs, [a.key]: v } })}
                onProfChange={(sub, val) =>
                  update({ proficiencies: { ...data.proficiencies, [sub]: val } })
                }
              />
            );
          })}
        </div>
      </div>

      {/* Resto: Acción adicional, Rango, CD, Área */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Acción adicional" value={accAdic} computed hint={`1 + ${formatMod(modSab)} SAB`} objNote={noteFor("acc_adic")} />
        <StatBox label="Rango" value={rango} computed hint={`15 + 5 × ${formatMod(modDes)} DES`} objNote={noteFor("rango")} />
        <StatBox label="CD" value={cd} computed hint={`8 + max(SAB,INT) + Bonif`} objNote={noteFor("cd")} />
        <StatBox label="Área" value={`${area}x${area}`} computed hint={`1 + ${formatMod(modInt)} INT`} objNote={noteFor("area")} />
      </div>
    </div>
  );
}
