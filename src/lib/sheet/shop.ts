import { sheetDb as supabase } from "@/lib/sheet/db";
import type { AttrKey } from "./character";

export type ShopCategory = "hab1" | "hab2" | "hab3" | "propiedad" | "caracteristica";
export type Currency = "xp" | "evo";

export type ShopItem = {
  id: string;
  owner_character_id: string | null;
  category: ShopCategory;
  level: number;
  name: string;
  description: string;
  cost: number;
  currency: Currency;
  locked: boolean;
  required_anulaciones: number;
  attribute_key: AttrKey | null;
  sort_order: number;
};

export type Purchase = {
  id: string;
  user_id: string;
  character_id: string;
  item_id: string;
  points: number;
};

export type CharacterCurrency = {
  character_id: string;
  xp: number;
  evo: number;
  power_color: string;
};

export type UserPropertyLock = {
  id: string;
  user_id: string;
  character_id: string;
  item_id: string;
  required_anulaciones: number;
};

export async function fetchPropertyLocks(characterId: string) {
  const { data, error } = await supabase
    .from("sheet_property_locks")
    .select("*")
    .eq("character_id", characterId);
  if (error) throw error;
  return (data ?? []) as UserPropertyLock[];
}

export async function fetchShopForCharacter(characterId: string) {
  const { data, error } = await supabase
    .from("sheet_shop_items")
    .select("*")
    .or(`owner_character_id.is.null,owner_character_id.eq.${characterId}`)
    .order("category")
    .order("level")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ShopItem[];
}

export async function fetchPurchases(characterId: string) {
  const { data, error } = await supabase
    .from("sheet_purchases")
    .select("*")
    .eq("character_id", characterId);
  if (error) throw error;
  return (data ?? []) as Purchase[];
}

export async function fetchCurrency(characterId: string) {
  const { data, error } = await supabase
    .from("sheet_character_currency")
    .select("*")
    .eq("character_id", characterId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? { character_id: characterId, xp: 0, evo: 0, power_color: "#7c3aed" }) as CharacterCurrency;
}

export function isAnulacion(item: ShopItem) {
  return item.category === "propiedad" && item.name.trim().toLowerCase() === "anulación";
}
