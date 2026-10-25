import type { AttrKey } from "./character";
import type { ShopItem, Purchase } from "./shop";

export function computeAttrBonuses(
  shopItems: ShopItem[],
  purchases: Purchase[],
): Record<AttrKey, number> {
  const out: Record<AttrKey, number> = { STR: 0, DES: 0, CON: 0, INT: 0, SAB: 0, CAR: 0 };
  const itemMap = new Map(shopItems.map((it) => [it.id, it]));
  for (const p of purchases) {
    const it = itemMap.get(p.item_id);
    if (!it || it.category !== "caracteristica" || !it.attribute_key) continue;
    out[it.attribute_key as AttrKey] += p.points || 0;
  }
  return out;
}
