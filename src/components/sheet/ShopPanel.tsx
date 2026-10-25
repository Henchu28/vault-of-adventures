import { useMemo, useState } from "react";
import { sheetDb as supabase } from "@/lib/sheet/db";
import type { ShopItem, Purchase, CharacterCurrency, ShopCategory, UserPropertyLock } from "@/lib/sheet/shop";
import { isAnulacion } from "@/lib/sheet/shop";
import { ATTRIBUTES, type AttrKey } from "@/lib/sheet/character";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Circle, Star, Lock, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  characterId: string;
  characterLevel: number;
  shopItems: ShopItem[];
  purchases: Purchase[];
  propertyLocks: UserPropertyLock[];
  currency: CharacterCurrency;
  onChange: () => void;
  habNames: { hab1: string; hab2: string; hab3: string };
  isAdmin?: boolean;
};

const HAB_KEYS = ["hab1", "hab2", "hab3"] as const;
type HabKey = (typeof HAB_KEYS)[number];

export function ShopPanel({
  characterId,
  characterLevel,
  shopItems,
  purchases,
  propertyLocks,
  currency,
  onChange,
  habNames,
  isAdmin = false,
}: Props) {
  const purchasedIds = useMemo(() => new Set(purchases.map((p) => p.item_id)), [purchases]);

  const anulacionesCount = useMemo(() => {
    const ids = new Set(shopItems.filter((it) => isAnulacion(it)).map((it) => it.id));
    return purchases.filter((p) => ids.has(p.item_id)).reduce((s, p) => s + (p.points || 1), 0);
  }, [shopItems, purchases]);

  const lockByItem = useMemo(() => {
    const m = new Map<string, UserPropertyLock>();
    for (const l of propertyLocks) m.set(l.item_id, l);
    return m;
  }, [propertyLocks]);

  const requiredAnulFor = (item: ShopItem) => {
    const l = lockByItem.get(item.id);
    return l ? l.required_anulaciones : 0;
  };

  const togglePurchase = async (item: ShopItem, current: boolean) => {
    if (current) {
      // Only properties (non-Anulación) can be removed, and only by spending 1 Anulación.
      if (item.category !== "propiedad" || isAnulacion(item)) {
        toast.error("Esta compra no se puede deshacer");
        return;
      }
      const anulItem = shopItems.find(
        (it) => it.category === "propiedad" && it.owner_character_id === null && isAnulacion(it),
      );
      const anulPurchase = anulItem ? purchases.find((p) => p.item_id === anulItem.id) : undefined;
      const anulPts = anulPurchase?.points ?? 0;
      if (!anulItem || anulPts < 1) {
        toast.error("Necesitas al menos 1 Anulación para eliminar una propiedad");
        return;
      }
      const existing = purchases.find((p) => p.item_id === item.id);
      if (!existing) return;
      // Consume one Anulación
      if (anulPts === 1) {
        const r = await supabase.from("sheet_purchases").delete().eq("id", anulPurchase!.id);
        if (r.error) { toast.error("Error consumiendo Anulación: " + r.error.message); return; }
      } else {
        const r = await supabase.from("sheet_purchases").update({ points: anulPts - 1 }).eq("id", anulPurchase!.id);
        if (r.error) { toast.error("Error consumiendo Anulación: " + r.error.message); return; }
      }
      const { error } = await supabase.from("sheet_purchases").delete().eq("id", existing.id);
      if (error) { toast.error("No se pudo deshacer la compra: " + error.message); return; }
      toast.success("Propiedad eliminada (−1 Anulación)");
      onChange();
      return;
    }

    const required = requiredAnulFor(item);
    if (required > 0 && anulacionesCount < required) {
      toast.error(`Necesitas ${required} Anulación(es) para comprar esto`);
      return;
    }
    const balance = item.currency === "xp" ? currency.xp : currency.evo;
    if (balance < item.cost) {
      toast.error(`No tienes suficientes ${item.currency.toUpperCase()}`);
      return;
    }

    const { error } = await supabase.from("sheet_purchases").insert({ character_id: characterId, item_id: item.id, points: 1 });
    if (error) { toast.error("Error al comprar: " + error.message); return; }
    const newField = item.currency === "xp" ? { xp: currency.xp - item.cost } : { evo: currency.evo - item.cost };
    const { error: e2 } = await supabase.from("sheet_character_currency").update(newField).eq("character_id", characterId);
    if (e2) toast.error("Error al cobrar: " + e2.message);

    // Consume Anulaciones if this property required them
    if (required > 0) {
      const anulItem = shopItems.find(
        (it) => it.category === "propiedad" && it.owner_character_id === null && isAnulacion(it),
      );
      const anulPurchase = anulItem ? purchases.find((p) => p.item_id === anulItem.id) : undefined;
      if (anulItem && anulPurchase) {
        const remaining = (anulPurchase.points || 0) - required;
        if (remaining <= 0) {
          await supabase.from("sheet_purchases").delete().eq("id", anulPurchase.id);
        } else {
          await supabase.from("sheet_purchases").update({ points: remaining }).eq("id", anulPurchase.id);
        }
        toast.success(`Propiedad comprada (−${required} Anulación)`);
      }
    }

    onChange();
  };

  const resetCharacteristicAndAnulaciones = async () => {
    if (!confirm("¿Resetear puntos de característica y anulaciones de este usuario? Esta acción no se puede deshacer.")) return;
    const caracIds = shopItems.filter((it) => it.category === "caracteristica" && it.owner_character_id === null).map((it) => it.id);
    const anulItem = shopItems.find(
      (it) => it.category === "propiedad" && it.owner_character_id === null && isAnulacion(it),
    );
    const idsToDelete = [...caracIds];
    if (anulItem) idsToDelete.push(anulItem.id);
    if (idsToDelete.length === 0) { toast.message("Nada que resetear"); return; }
    const { error } = await supabase
      .from("sheet_purchases")
      .delete()
      .eq("character_id", characterId)
      .in("item_id", idsToDelete);
    if (error) { toast.error(error.message); return; }
    toast.success("Reseteado");
    onChange();
  };

  const setLockForUser = async (item: ShopItem, required: number) => {
    if (required <= 0) {
      const existing = lockByItem.get(item.id);
      if (existing) {
        const { error } = await supabase.from("sheet_property_locks").delete().eq("id", existing.id);
        if (error) { toast.error(error.message); return; }
      }
      onChange();
      return;
    }
    const existing = lockByItem.get(item.id);
    if (existing) {
      const { error } = await supabase
        .from("sheet_property_locks")
        .update({ required_anulaciones: required })
        .eq("id", existing.id);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase
        .from("sheet_property_locks")
        .insert({ character_id: characterId, item_id: item.id, required_anulaciones: required });
      if (error) { toast.error(error.message); return; }
    }
    onChange();
  };

  // ---- Admin helpers ----
  const addItem = async (preset: Partial<ShopItem>) => {
    const owner = preset.category === "propiedad" || preset.category === "caracteristica" ? null : characterId;
    const { error } = await supabase.from("sheet_shop_items").insert({
      owner_character_id: owner,
      category: preset.category!,
      level: preset.level ?? 1,
      name: preset.name ?? "Nuevo item",
      description: "",
      cost: 1,
      currency: preset.currency ?? "xp",
      locked: false,
      required_anulaciones: 0,
      attribute_key: preset.attribute_key ?? null,
      sort_order: 0,
    });
    if (error) toast.error(error.message);
    else { toast.success("Añadido"); onChange(); }
  };

  // ---- Personal shop: outer = LEVEL, inner = the 3 habilidades ----
  const personalItems = shopItems.filter(
    (it) => HAB_KEYS.includes(it.category as HabKey) && it.owner_character_id === characterId,
  );
  const levels = Array.from(new Set(personalItems.map((it) => it.level))).sort((a, b) => a - b);
  // If admin and no levels yet, show level 1 as a starting point
  const displayLevels = levels.length === 0 && isAdmin ? [1] : levels;

  return (
    <div className="space-y-8">
      {/* PERSONAL SHOP */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold">Tienda personal</h2>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const next = (Math.max(0, ...displayLevels) || 0) + 1;
                addItem({ category: "hab1", level: next, name: `Mejora nivel ${next}` });
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Añadir nivel
            </Button>
          )}
        </div>

        {displayLevels.length === 0 && (
          <div className="sheet-panel p-4 text-sm text-muted-foreground">
            Aún no hay mejoras personales. {isAdmin && "Pulsa “Añadir nivel” para empezar."}
          </div>
        )}

        <Accordion type="multiple" className="w-full space-y-2">
          {displayLevels.map((lvl) => {
            const canBuy = characterLevel >= lvl;
            return (
              <AccordionItem key={lvl} value={`lvl-${lvl}`} className="sheet-panel px-4 border-none">
                <AccordionTrigger className="text-base font-bold">
                  Nivel {lvl}
                  {!canBuy && <span className="text-xs text-muted-foreground ml-2 font-normal">(solo lectura)</span>}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                    {HAB_KEYS.map((hk) => {
                      const items = personalItems.filter((it) => it.category === hk && it.level === lvl);
                      const title = habNames[hk] || hk;
                      return (
                        <div key={hk} className="rounded-md border border-border/60 p-3 bg-muted/10">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">{title}</h4>
                            {isAdmin && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => addItem({ category: hk, level: lvl, name: "Nueva mejora" })}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                          {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Sin mejoras.</p>
                          ) : (
                            <ul className="space-y-1.5">
                              {items.map((it) => (
                                <ItemRow
                                  key={it.id}
                                  item={it}
                                  checked={purchasedIds.has(it.id)}
                                  disabled={!canBuy}
                                  onToggle={togglePurchase}
                                  isAdmin={isAdmin}
                                  onChanged={onChange}
                                />
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </section>

      {/* GENERAL SHOP */}
      <section>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xl font-bold">Tienda general</h2>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={resetCharacteristicAndAnulaciones}>
              <Trash2 className="h-4 w-4 mr-1" /> Reset característica + anulaciones
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Properties */}
          <div className="sheet-panel p-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold">Propiedades</h3>
              {isAdmin && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const exists = shopItems.find(
                        (it) => it.category === "propiedad" && it.owner_character_id === null && isAnulacion(it),
                      );
                      if (exists) { toast.message("Ya existe el item Anulación"); return; }
                      addItem({ category: "propiedad", level: 1, name: "Anulación", currency: "xp" });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Anulación
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addItem({ category: "propiedad", level: 1, name: "Nueva propiedad" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Propiedad
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Anulaciones disponibles: <span className="text-primary font-bold">{anulacionesCount}</span>
            </p>

            {/* Anulación stepper (like Puntos de Característica) */}
            <AnulacionStepper
              characterId={characterId}
              shopItems={shopItems}
              purchases={purchases}
              currency={currency}
              onChange={onChange}
              isAdmin={isAdmin}
            />

            {(() => {
              const props = shopItems.filter(
                (it) => it.category === "propiedad" && it.owner_character_id === null && !isAnulacion(it),
              );
              if (props.length === 0) {
                return <p className="text-xs text-muted-foreground mt-2">Aún no hay propiedades.</p>;
              }
              return (
                <ul className="space-y-1.5 mt-3">
                  {props.map((it) => (
                    <ItemRow
                      key={it.id}
                      item={it}
                      checked={purchasedIds.has(it.id)}
                      onToggle={togglePurchase}
                      anulacionesCount={anulacionesCount}
                      userRequiredAnul={requiredAnulFor(it)}
                      onSetUserLock={(req) => setLockForUser(it, req)}
                      isAdmin={isAdmin}
                      onChanged={onChange}
                    />
                  ))}
                </ul>
              );
            })()}
          </div>

          {/* Characteristic points */}
          <div className="sheet-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold">Puntos de Característica</h3>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Find first attribute without an item set up
                    const existing = new Set(
                      shopItems
                        .filter((it) => it.category === "caracteristica" && it.owner_character_id === null)
                        .map((it) => it.attribute_key),
                    );
                    const free = ATTRIBUTES.find((a) => !existing.has(a.key));
                    if (!free) { toast.message("Ya hay coste configurado para todos los atributos"); return; }
                    addItem({ category: "caracteristica", level: 1, name: `Coste +1 ${free.key}`, currency: "evo", attribute_key: free.key });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Configurar coste
                </Button>
              )}
            </div>
            <CharacteristicPoints
              characterId={characterId}
              shopItems={shopItems}
              purchases={purchases}
              currency={currency}
              onChange={onChange}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ItemRow({
  item,
  checked,
  disabled,
  onToggle,
  anulacionesCount = 0,
  userRequiredAnul = 0,
  onSetUserLock,
  isAdmin,
  onChanged,
}: {
  item: ShopItem;
  checked: boolean;
  disabled?: boolean;
  onToggle: (item: ShopItem, current: boolean) => void;
  anulacionesCount?: number;
  userRequiredAnul?: number;
  onSetUserLock?: (required: number) => void | Promise<void>;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: item.name,
    description: item.description,
    cost: item.cost,
    currency: item.currency,
  });

  const isProperty = item.category === "propiedad" && !isAnulacion(item);
  const lockedByAnul = isProperty && userRequiredAnul > 0 && anulacionesCount < userRequiredAnul;
  const cantBuy = !!disabled || (!checked && lockedByAnul);

  const save = async () => {
    const { error } = await supabase.from("sheet_shop_items").update(draft).eq("id", item.id);
    if (error) toast.error(error.message);
    else { setEditing(false); onChanged(); }
  };
  const remove = async () => {
    const { error } = await supabase.from("sheet_shop_items").delete().eq("id", item.id);
    if (error) toast.error(error.message);
    else onChanged();
  };

  if (editing) {
    return (
      <li className="rounded-md border border-primary/40 bg-muted/20 p-2 space-y-2">
        <Input className="h-8" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nombre" />
        <Input className="h-8" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Descripción" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="flex items-center gap-1">
            Coste
            <Input type="number" className="h-7 w-16" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: parseInt(e.target.value) || 0 })} />
          </label>
          <Select value={draft.currency} onValueChange={(v) => setDraft({ ...draft, currency: v as "xp" | "evo" })}>
            <SelectTrigger className="h-7 w-20"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="xp">XP</SelectItem>
              <SelectItem value="evo">EVO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
          <Button size="sm" onClick={save}><Check className="h-4 w-4" /></Button>
        </div>
      </li>
    );
  }

  const showLockHint = isProperty && userRequiredAnul > 0 && !checked;

  return (
    <li
      className={cn(
        "flex items-center gap-2 text-sm rounded-md px-2 py-1.5 border border-transparent",
        checked && "opacity-60 bg-muted/40",
        !checked && "hover:bg-muted/30",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={cantBuy}
        onCheckedChange={() => onToggle(item, checked)}
        className="rounded-full"
        aria-label={item.name}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium flex items-center gap-1.5">
          {showLockHint && <Lock className="h-3 w-3 text-muted-foreground" />}
          {item.name}
        </div>
        {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
        {showLockHint && (
          <div className="text-[11px] text-muted-foreground">Requiere {userRequiredAnul} Anulación(es) para ti</div>
        )}
      </div>
      <span className="text-xs flex items-center gap-1 text-muted-foreground">
        {item.cost}
        {item.currency === "xp" ? (
          <Circle className="h-3 w-3 text-primary fill-primary/40" />
        ) : (
          <Star className="h-3 w-3 text-primary fill-primary/40" />
        )}
      </span>
      {isAdmin && isProperty && onSetUserLock && (
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground" title="Anulaciones requeridas para este usuario">
          <Lock className="h-3 w-3" />
          <Input
            type="number"
            min={0}
            className="h-7 w-12 text-xs"
            defaultValue={userRequiredAnul}
            key={userRequiredAnul}
            onBlur={(e) => {
              const v = parseInt(e.target.value);
              const next = Number.isFinite(v) && v > 0 ? v : 0;
              if (next !== userRequiredAnul) onSetUserLock(next);
            }}
          />
        </label>
      )}
      {isAdmin && (
        <div className="flex items-center">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={remove}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      )}
    </li>
  );
}

function CharacteristicPoints({
  characterId,
  shopItems,
  purchases,
  currency,
  onChange,
  isAdmin,
}: {
  characterId: string;
  shopItems: ShopItem[];
  purchases: Purchase[];
  currency: CharacterCurrency;
  onChange: () => void;
  isAdmin: boolean;
}) {
  const items = shopItems.filter((it) => it.category === "caracteristica" && it.owner_character_id === null);
  const itemByAttr: Partial<Record<AttrKey, ShopItem>> = {};
  for (const it of items) if (it.attribute_key) itemByAttr[it.attribute_key as AttrKey] = it;

  const purchaseByItem: Record<string, Purchase> = {};
  for (const p of purchases) purchaseByItem[p.item_id] = p;

  const [busy, setBusy] = useState(false);

  const change = async (attr: AttrKey, delta: number) => {
    const item = itemByAttr[attr];
    if (!item) {
      toast.error(`El admin no ha configurado el coste de +1 a ${attr}`);
      return;
    }
    setBusy(true);
    const existing = purchaseByItem[item.id];
    const currentPts = existing?.points ?? 0;
    const newPts = currentPts + delta;
    if (newPts < 0) { setBusy(false); return; }

    if (delta > 0 && currency.evo < item.cost) {
      toast.error("No tienes suficientes EVO");
      setBusy(false);
      return;
    }

    let pErr: { message: string } | null = null;
    if (existing && newPts === 0) {
      const r = await supabase.from("sheet_purchases").delete().eq("id", existing.id);
      pErr = r.error;
    } else if (existing) {
      const r = await supabase.from("sheet_purchases").update({ points: newPts }).eq("id", existing.id);
      pErr = r.error;
    } else {
      const r = await supabase.from("sheet_purchases").insert({ character_id: characterId, item_id: item.id, points: newPts });
      pErr = r.error;
    }
    if (pErr) { toast.error("Compra fallida: " + pErr.message); setBusy(false); return; }

    const { error: cErr } = await supabase
      .from("sheet_character_currency")
      .update({ evo: currency.evo - delta * item.cost })
      .eq("character_id", characterId);
    if (cErr) toast.error("Cobro fallido: " + cErr.message);

    setBusy(false);
    onChange();
  };

  const updateCost = async (attr: AttrKey, cost: number) => {
    const item = itemByAttr[attr];
    if (!item) return;
    const { error } = await supabase.from("sheet_shop_items").update({ cost }).eq("id", item.id);
    if (error) toast.error(error.message);
    else onChange();
  };

  return (
    <ul className="space-y-2">
      {ATTRIBUTES.map((a) => {
        const item = itemByAttr[a.key];
        const points = item ? purchaseByItem[item.id]?.points ?? 0 : 0;
        return (
          <li key={a.key} className="flex items-center gap-3 text-sm">
            <span className="font-semibold flex-1">{a.full}</span>
            <button
              type="button"
              disabled
              title="Las compras de característica no se pueden deshacer"
              className="h-7 w-7 rounded-md border border-border opacity-30 cursor-not-allowed"
            >
              −
            </button>
            <span className="w-8 text-center font-bold text-primary">{points}</span>
            <button
              type="button"
              disabled={busy || !item}
              onClick={() => change(a.key, +1)}
              className="h-7 w-7 rounded-md border border-border hover:bg-muted/40 disabled:opacity-30"
            >
              +
            </button>
            {isAdmin && item ? (
              <Input
                type="number"
                className="h-7 w-16 text-xs"
                defaultValue={item.cost}
                onBlur={(e) => updateCost(a.key, parseInt(e.target.value) || 0)}
              />
            ) : (
              <span className="text-xs text-muted-foreground flex items-center gap-1 w-14 justify-end">
                {item ? `${item.cost}` : "–"}
                {item && <Star className="h-3 w-3 text-primary fill-primary/40" />}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function AnulacionStepper({
  characterId,
  shopItems,
  purchases,
  currency,
  onChange,
  isAdmin,
}: {
  characterId: string;
  shopItems: ShopItem[];
  purchases: Purchase[];
  currency: CharacterCurrency;
  onChange: () => void;
  isAdmin: boolean;
}) {
  const item = shopItems.find(
    (it) => it.category === "propiedad" && it.owner_character_id === null && isAnulacion(it),
  );
  const existing = item ? purchases.find((p) => p.item_id === item.id) : undefined;
  const points = existing?.points ?? 0;
  const [busy, setBusy] = useState(false);

  const change = async (delta: number) => {
    if (!item) {
      toast.error("El admin aún no ha configurado el coste de Anulación");
      return;
    }
    const newPts = points + delta;
    if (newPts < 0) return;
    const balance = item.currency === "xp" ? currency.xp : currency.evo;
    if (delta > 0 && balance < item.cost) {
      toast.error(`No tienes suficientes ${item.currency.toUpperCase()}`);
      return;
    }
    setBusy(true);
    let pErr: { message: string } | null = null;
    if (existing && newPts === 0) {
      const r = await supabase.from("sheet_purchases").delete().eq("id", existing.id);
      pErr = r.error;
    } else if (existing) {
      const r = await supabase.from("sheet_purchases").update({ points: newPts }).eq("id", existing.id);
      pErr = r.error;
    } else {
      const r = await supabase.from("sheet_purchases").insert({ character_id: characterId, item_id: item.id, points: newPts });
      pErr = r.error;
    }
    if (pErr) { toast.error(pErr.message); setBusy(false); return; }

    const field = item.currency === "xp"
      ? { xp: currency.xp - delta * item.cost }
      : { evo: currency.evo - delta * item.cost };
    const { error: cErr } = await supabase.from("sheet_character_currency").update(field).eq("character_id", characterId);
    if (cErr) toast.error(cErr.message);
    setBusy(false);
    onChange();
  };

  const updateCost = async (cost: number) => {
    if (!item) return;
    const { error } = await supabase.from("sheet_shop_items").update({ cost }).eq("id", item.id);
    if (error) toast.error(error.message);
    else onChange();
  };

  const updateCurrency = async (cur: "xp" | "evo") => {
    if (!item) return;
    const { error } = await supabase.from("sheet_shop_items").update({ currency: cur }).eq("id", item.id);
    if (error) toast.error(error.message);
    else onChange();
  };

  if (!item && !isAdmin) return null;

  return (
    <div className="flex items-center gap-2 text-sm rounded-md border border-border/60 bg-muted/10 px-2 py-1.5">
      <Lock className="h-3.5 w-3.5 text-primary" />
      <span className="font-semibold flex-1">Anulación</span>
      <span className="w-8 text-center font-bold text-primary">{points}</span>
      <button
        type="button"
        disabled={busy || !item}
        onClick={() => change(+1)}
        className="h-7 w-7 rounded-md border border-border hover:bg-muted/40 disabled:opacity-30"
      >+</button>
      {isAdmin && item ? (
        <>
          <Input
            type="number"
            className="h-7 w-14 text-xs"
            defaultValue={item.cost}
            onBlur={(e) => updateCost(parseInt(e.target.value) || 0)}
          />
          <Select value={item.currency} onValueChange={(v) => updateCurrency(v as "xp" | "evo")}>
            <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="xp">XP</SelectItem>
              <SelectItem value="evo">EVO</SelectItem>
            </SelectContent>
          </Select>
        </>
      ) : item ? (
        <span className="text-xs text-muted-foreground flex items-center gap-1 w-14 justify-end">
          {item.cost}
          {item.currency === "xp"
            ? <Circle className="h-3 w-3 text-primary fill-primary/40" />
            : <Star className="h-3 w-3 text-primary fill-primary/40" />}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">sin configurar</span>
      )}
    </div>
  );
}

