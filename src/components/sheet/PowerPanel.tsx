import type { CharacterData } from "@/lib/sheet/character";
import type { ShopItem, Purchase } from "@/lib/sheet/shop";
import { EditableField } from "./EditableField";
import { AutoTextarea } from "./AutoTextarea";
import { HelpIcon } from "./HelpIcon";

type Props = {
  data: CharacterData;
  update: (patch: Partial<CharacterData>) => void;
  shopItems: ShopItem[];
  purchases: Purchase[];
  powerColor?: string;
};

export function PowerPanel({ data, update, shopItems, purchases, powerColor = "#7c3aed" }: Props) {
  const p = data.poder;
  const setP = (patch: Partial<CharacterData["poder"]>) => update({ poder: { ...p, ...patch } });

  const purchasedIds = new Set(purchases.map((x) => x.item_id));
  const purchasedItems = shopItems.filter((it) => purchasedIds.has(it.id));

  const habKeys = [
    { num: 1, nameKey: "habilidad1Nombre", descKey: "habilidad1", cat: "hab1" as const },
    { num: 2, nameKey: "habilidad2Nombre", descKey: "habilidad2", cat: "hab2" as const },
    { num: 3, nameKey: "habilidad3Nombre", descKey: "habilidad3", cat: "hab3" as const },
  ];

  // Properties bought (from general "propiedad" category, excluding Anulación)
  const boughtProps = purchasedItems.filter(
    (it) => it.category === "propiedad" && it.name.trim().toLowerCase() !== "anulación",
  );

  const innerTintStyle = {
    background: `linear-gradient(135deg, ${powerColor}1f, ${powerColor}0a)`,
    borderColor: `${powerColor}55`,
  } as React.CSSProperties;
  const wrapperStyle = {
    background: `radial-gradient(circle at 20% 0%, ${powerColor}26, transparent 60%), radial-gradient(circle at 80% 100%, ${powerColor}1f, transparent 55%), ${powerColor}0d`,
    borderColor: `${powerColor}55`,
    boxShadow: `0 10px 40px -15px ${powerColor}66, inset 0 0 0 1px ${powerColor}22`,
  } as React.CSSProperties;
  const accent = { color: powerColor } as React.CSSProperties;

  return (
    <div
      className="space-y-5 rounded-2xl border p-4 md:p-5"
      id="power-panel-root"
      style={wrapperStyle}
    >
      <div className="sheet-panel p-5 border" style={innerTintStyle}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base font-semibold tracking-wide text-foreground/90">Poder</span>
          <HelpIcon field="Poder" />
        </div>
        <div style={accent}>
          <EditableField
            value={p.nombre}
            onChange={(v) => setP({ nombre: v })}
            placeholder="Nombre del poder"
            inputClassName="text-2xl md:text-3xl font-bold h-12"
            className="text-2xl md:text-3xl font-bold"
            ariaLabel="Nombre del poder"
          />
        </div>
      </div>

      <div className="sheet-panel p-5 border" style={innerTintStyle}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base font-semibold tracking-wide text-foreground/90">Descripción</span>
          <HelpIcon field="Descripción del poder" />
        </div>
        <AutoTextarea
          value={p.descripcion}
          onChange={(v) => setP({ descripcion: v })}
          placeholder="Describe el poder. El cuadro crece con el texto."
        />

        {boughtProps.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <div className="text-sm font-semibold text-primary mb-2">Propiedades adquiridas</div>
            <ul className="space-y-2">
              {boughtProps.map((b) => (
                <li key={b.id} className="text-sm bg-primary/5 border border-primary/30 rounded-md px-3 py-2">
                  <div className="font-semibold">{b.name}</div>
                  {b.description && <div className="text-muted-foreground">{b.description}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {habKeys.map(({ num, nameKey, descKey, cat }) => {
          const upgrades = purchasedItems.filter((it) => it.category === cat);
          return (
            <div key={num} className="sheet-panel p-4 border" style={innerTintStyle}>
              <div className="flex items-center gap-2 mb-2">
                <EditableField
                  value={(p as never)[nameKey]}
                  onChange={(v) => setP({ [nameKey]: v || `Habilidad ${num}` } as Partial<CharacterData["poder"]>)}
                  inputClassName="text-lg font-bold h-9"
                  className="text-lg font-bold text-foreground"
                  ariaLabel={`Nombre de habilidad ${num}`}
                />
                <HelpIcon field={`Habilidad ${num}`} />
              </div>
              <AutoTextarea
                value={(p as never)[descKey]}
                onChange={(v) => setP({ [descKey]: v } as Partial<CharacterData["poder"]>)}
                placeholder={`Describe la habilidad`}
              />

              {upgrades.length > 0 && (
                <div className="mt-3 border-t border-border pt-2 space-y-2">
                  <div className="text-xs uppercase tracking-wider text-primary font-semibold">
                    Mejoras compradas
                  </div>
                  {upgrades.map((u) => (
                    <div key={u.id} className="text-sm bg-primary/5 border border-primary/30 rounded-md px-2 py-1.5">
                      <div className="font-semibold">{u.name}</div>
                      {u.description && <div className="text-muted-foreground text-xs">{u.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
