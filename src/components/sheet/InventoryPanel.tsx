import { useEffect, useState } from "react";
import { sheetDb as supabase } from "@/lib/sheet/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Plus, Trash2, Pencil, Skull, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  fetchInventory, STAT_TARGETS, getEffects, type InventoryItem, type StatEffect,
} from "@/lib/sheet/inventory";
import type { CharacterData } from "@/lib/sheet/character";

type Props = {
  characterId: string;
  data: CharacterData;
  update: (patch: Partial<CharacterData>) => void;
  canEdit: boolean;
  onItemsChange: () => void;
};

const emptyItem = {
  name: "",
  quantity: 1,
  description: "",
  attributes_text: "",
  stat_effects: [] as StatEffect[],
};

export function InventoryPanel({ characterId, data, update, canEdit, onItemsChange }: Props) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ ...emptyItem });

  const reload = async () => {
    try {
      const list = await fetchInventory(characterId);
      setItems(list);
      onItemsChange();
    } catch (e) {
      toast.error("Error cargando inventario");
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId]);

  const openCreate = () => {
    setDraft({ ...emptyItem });
    setCreating(true);
  };
  const openEdit = (it: InventoryItem) => {
    setDraft({
      name: it.name,
      quantity: it.quantity,
      description: it.description,
      attributes_text: it.attributes_text,
      stat_effects: getEffects(it),
    });
    setEditing(it);
  };

  const saveItem = async () => {
    const cleanEffects = (draft.stat_effects || []).filter((e) => e.target && e.delta);
    const first = cleanEffects[0];
    const payload = {
      character_id: characterId,
      name: draft.name,
      quantity: draft.quantity || 0,
      description: draft.description,
      attributes_text: draft.attributes_text,
      stat_effects: cleanEffects,
      // keep legacy single fields in sync (first effect) for back-compat
      stat_target: first ? first.target : null,
      stat_delta: first ? first.delta : 0,
    };
    if (editing) {
      const { error } = await (supabase as any)
        .from("sheet_inventory_items").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      setEditing(null);
    } else {
      const { error } = await (supabase as any).from("sheet_inventory_items").insert(payload);
      if (error) return toast.error(error.message);
      setCreating(false);
    }
    reload();
  };

  const deleteItem = async (id: string) => {
    const { error } = await (supabase as any).from("sheet_inventory_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    reload();
  };

  // Saves indicator
  const saves = data.saves ?? { fail: 0, success: 0 };
  const setSaves = (s: { fail: number; success: number }) => update({ saves: s });
  const incFail = () => setSaves({ ...saves, fail: Math.min(3, saves.fail + 1) });
  const incSuccess = () => setSaves({ ...saves, success: Math.min(3, saves.success + 1) });
  const resetSaves = () => setSaves({ fail: 0, success: 0 });

  // Circle sizes from edge to center: large -> small -> small -> large
  // Order on screen: [fail3, fail2, fail1, success1, success2, success3]
  const circleSizes = ["h-7 w-7", "h-5 w-5", "h-4 w-4", "h-4 w-4", "h-5 w-5", "h-7 w-7"];

  const failFilled = (idxFromCenter: number) => idxFromCenter < saves.fail; // idx 0=center
  const successFilled = (idxFromCenter: number) => idxFromCenter < saves.success;

  // Weaknesses / Resistances
  const weaknesses = data.weaknesses ?? [];
  const resistances = data.resistances ?? [];

  const updateList = (key: "weaknesses" | "resistances", list: { name: string; mod: string }[]) =>
    update({ [key]: list } as any);

  return (
    <div className="space-y-6">
      {/* Top: Weaknesses | Saves indicator | Resistances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <ModTable
          title="Debilidades"
          items={weaknesses}
          canEdit={canEdit}
          onChange={(l) => updateList("weaknesses", l)}
          accent="text-destructive"
        />

        <div className="sheet-panel p-4 flex flex-col items-center justify-center gap-3">
          <div className="text-sm font-semibold tracking-wide text-foreground/80">
            Tiradas de salvación
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={incFail}
              disabled={!canEdit}
              className="text-destructive hover:scale-110 transition-transform disabled:opacity-50"
              title="Sumar fallo"
              aria-label="Sumar fallo"
            >
              <Skull className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={incSuccess}
              disabled={!canEdit}
              className="text-emerald-400 hover:scale-110 transition-transform disabled:opacity-50"
              title="Sumar éxito"
              aria-label="Sumar éxito"
            >
              <Sparkles className="h-6 w-6" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* fail side: indices from center outward = 0,1,2 → render reversed */}
            {[2, 1, 0].map((i) => (
              <span
                key={`f${i}`}
                className={`rounded-full border-2 ${circleSizes[2 - i]} ${
                  failFilled(i) ? "bg-destructive border-destructive" : "border-destructive/50"
                }`}
              />
            ))}
            <span className="w-2" />
            {[0, 1, 2].map((i) => (
              <span
                key={`s${i}`}
                className={`rounded-full border-2 ${circleSizes[3 + i]} ${
                  successFilled(i) ? "bg-emerald-500 border-emerald-500" : "border-emerald-500/50"
                }`}
              />
            ))}
          </div>
          {canEdit && (
            <button
              onClick={resetSaves}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Resetear
            </button>
          )}
        </div>

        <ModTable
          title="Resistencias"
          items={resistances}
          canEdit={canEdit}
          onChange={(l) => updateList("resistances", l)}
          accent="text-emerald-400"
        />
      </div>

      {/* Inventory table */}
      <div className="sheet-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-base font-semibold">Inventario</div>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Añadir
            </Button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-y-1">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1 w-[18%]">Nombre</th>
                <th className="px-2 py-1 w-[8%] text-center">Cantidad</th>
                <th className="px-2 py-1">Descripción</th>
                <th className="px-2 py-1">Atributos</th>
                {canEdit && <th className="px-2 py-1 w-[80px] text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground py-4">
                    Sin objetos.
                  </td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.id} className="bg-card/40">
                  <td className="px-2 py-2 align-top font-medium">{it.name || "—"}</td>
                  <td className="px-2 py-2 align-top text-center">{it.quantity}</td>
                  <td className="px-2 py-2 align-top whitespace-pre-wrap break-words">
                    {it.description}
                  </td>
                  <td className="px-2 py-2 align-top whitespace-pre-wrap break-words">
                    {it.attributes_text}
                  </td>
                  {canEdit && (
                    <td className="px-2 py-2 align-top text-right">
                      <div className="inline-flex gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(it)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteItem(it.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={creating || !!editing} onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar objeto" : "Nuevo objeto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                type="number"
                value={draft.quantity}
                onChange={(e) => setDraft({ ...draft, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div>
              <Label>Atributos</Label>
              <Textarea value={draft.attributes_text} onChange={(e) => setDraft({ ...draft, attributes_text: e.target.value })} />
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label>Modifica características</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      stat_effects: [...(draft.stat_effects || []), { target: "", delta: 0 }],
                    })
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir efecto
                </Button>
              </div>
              {(draft.stat_effects || []).length === 0 && (
                <div className="text-xs text-muted-foreground italic">Sin efectos.</div>
              )}
              {(draft.stat_effects || []).map((eff, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_90px_36px] gap-2 items-end">
                  <Select
                    value={eff.target || "__none"}
                    onValueChange={(v) => {
                      const list = [...draft.stat_effects];
                      list[idx] = { ...list[idx], target: v === "__none" ? "" : v };
                      setDraft({ ...draft, stat_effects: list });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Característica" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Ninguna</SelectItem>
                      {STAT_TARGETS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={eff.delta}
                    onChange={(e) => {
                      const list = [...draft.stat_effects];
                      list[idx] = { ...list[idx], delta: parseInt(e.target.value) || 0 };
                      setDraft({ ...draft, stat_effects: list });
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-9 w-9 p-0"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        stat_effects: draft.stat_effects.filter((_, i) => i !== idx),
                      })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setCreating(false); setEditing(null); }}>Cancelar</Button>
            <Button onClick={saveItem}>{editing ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ModTable({
  title, items, canEdit, onChange, accent,
}: {
  title: string;
  items: { name: string; mod: string }[];
  canEdit: boolean;
  onChange: (list: { name: string; mod: string }[]) => void;
  accent: string;
}) {
  const [name, setName] = useState("");
  const [mod, setMod] = useState("");

  const add = () => {
    if (!name.trim()) return;
    onChange([...items, { name: name.trim(), mod: mod.trim() }]);
    setName(""); setMod("");
  };
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const updateAt = (i: number, patch: Partial<{ name: string; mod: string }>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  return (
    <div className="sheet-panel p-3 space-y-2">
      <div className={`text-sm font-semibold tracking-wide ${accent}`}>{title}</div>
      <div className="space-y-1">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground italic">Sin entradas</div>
        )}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1">
            {canEdit ? (
              <>
                <Input
                  className="h-7 text-xs flex-1"
                  value={it.name}
                  onChange={(e) => updateAt(i, { name: e.target.value })}
                />
                <Input
                  className="h-7 text-xs w-20"
                  value={it.mod}
                  onChange={(e) => updateAt(i, { mod: e.target.value })}
                />
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(i)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </>
            ) : (
              <div className="text-sm flex-1 flex justify-between">
                <span>{it.name}</span>
                <span className="text-muted-foreground">{it.mod}</span>
              </div>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          <Input
            className="h-7 text-xs flex-1"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            className="h-7 text-xs w-20"
            placeholder="x2"
            value={mod}
            onChange={(e) => setMod(e.target.value)}
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={add}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
