import { sheetDb as supabase } from "@/lib/sheet/db";
import type { CharacterData, AttrKey } from "./character";

export type StatEffect = { target: string; delta: number };

export type InventoryItem = {
  id: string;
  character_id: string;
  name: string;
  quantity: number;
  description: string;
  attributes_text: string;
  stat_target: string | null;
  stat_delta: number;
  stat_effects: StatEffect[];
  sort_order: number;
};

export const STAT_TARGETS = [
  { value: "ca", label: "CA" },
  { value: "vida", label: "Vida" },
  { value: "velocidad", label: "Velocidad" },
  { value: "bonif", label: "Bonificador" },
  { value: "mana", label: "Maná" },
  { value: "init", label: "INIT" },
  { value: "acc_adic", label: "Acción adicional" },
  { value: "cd", label: "CD" },
  { value: "rango", label: "Rango" },
  { value: "area", label: "Área" },
  { value: "STR", label: "Fuerza (STR)" },
  { value: "DES", label: "Destreza (DES)" },
  { value: "CON", label: "Constitución (CON)" },
  { value: "INT", label: "Inteligencia (INT)" },
  { value: "SAB", label: "Sabiduría (SAB)" },
  { value: "CAR", label: "Carisma (CAR)" },
] as const;

/** Normalize an item to its list of stat effects (new field first, fallback to legacy single field). */
export function getEffects(item: InventoryItem): StatEffect[] {
  if (Array.isArray(item.stat_effects) && item.stat_effects.length > 0) {
    return item.stat_effects.filter((e) => e && e.target);
  }
  if (item.stat_target) {
    return [{ target: item.stat_target, delta: item.stat_delta || 0 }];
  }
  return [];
}

/** Sum of (stat_delta × quantity) per target across items. */
export function inventoryDeltaMap(items: InventoryItem[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const it of items) {
    const qty = Math.max(0, it.quantity || 0);
    if (!qty) continue;
    for (const eff of getEffects(it)) {
      if (!eff.target || !eff.delta) continue;
      m[eff.target] = (m[eff.target] || 0) + eff.delta * qty;
    }
  }
  return m;
}

/** Number of objects (sum of quantities) affecting each target. */
export function inventoryCountMap(items: InventoryItem[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const it of items) {
    const qty = Math.max(0, it.quantity || 0);
    if (!qty) continue;
    for (const eff of getEffects(it)) {
      if (!eff.target || !eff.delta) continue;
      m[eff.target] = (m[eff.target] || 0) + qty;
    }
  }
  return m;
}

const ATTR_KEYS: AttrKey[] = ["STR", "DES", "CON", "INT", "SAB", "CAR"];

export async function fetchInventory(characterId: string): Promise<InventoryItem[]> {
  const { data, error } = await (supabase as any)
    .from("sheet_inventory_items")
    .select("*")
    .eq("character_id", characterId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as InventoryItem[];
}

function applyStringDelta(current: string | number, delta: number): string {
  const s = String(current ?? "");
  const n = parseFloat(s);
  if (!Number.isNaN(n) && /^-?\d+(\.\d+)?/.test(s.trim())) {
    return String(n + delta);
  }
  return delta === 0 ? s : `${s} (${delta > 0 ? "+" : ""}${delta})`;
}

export function applyInventoryToCharacter(
  data: CharacterData,
  items: InventoryItem[],
): CharacterData {
  const next: CharacterData = {
    ...data,
    attrs: { ...data.attrs },
  };
  const deltas = inventoryDeltaMap(items);
  for (const [t, d] of Object.entries(deltas)) {
    if (!d) continue;
    if ((ATTR_KEYS as string[]).includes(t)) {
      next.attrs[t as AttrKey] = (next.attrs[t as AttrKey] ?? 0) + d;
    } else if (t === "bonif") {
      next.bonif = (next.bonif ?? 0) + d;
    } else if (t === "ca") {
      next.ca = applyStringDelta(next.ca, d);
    } else if (t === "vida") {
      next.vida = applyStringDelta(next.vida, d);
    } else if (t === "velocidad") {
      next.velocidad = applyStringDelta(next.velocidad, d);
    }
  }
  return next;
}
