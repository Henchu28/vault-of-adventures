import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { sheetDb as supabase } from "@/lib/sheet/db";
import { mergeCharacter, type AttrKey, type CharacterData, ATTRIBUTES } from "@/lib/sheet/character";
import {
  fetchCurrency,
  fetchPurchases,
  fetchShopForCharacter,
  fetchPropertyLocks,
  type Purchase,
  type ShopItem,
  type CharacterCurrency,
  type UserPropertyLock,
} from "@/lib/sheet/shop";
import { computeAttrBonuses } from "@/lib/sheet/derived";
import { fetchInventory, applyInventoryToCharacter, inventoryDeltaMap, type InventoryItem } from "@/lib/sheet/inventory";
import { HelpTextsProvider } from "@/lib/sheet/help-texts-context";
import { CharacterSheet } from "./CharacterSheet";
import { PowerPanel } from "./PowerPanel";
import { ShopPanel } from "./ShopPanel";
import { InventoryPanel } from "./InventoryPanel";
import { PdfRenderContext } from "./AutoTextarea";
import { CurrencyBadges } from "./CurrencyBadges";
import { PowerIdeaDialog } from "./PowerIdeaDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Pencil, Check, Download, Palette } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

const PDF_PAGE_WIDTH = 900;

async function capturePdfPage(element: HTMLElement) {
  return html2canvas(element, { backgroundColor: "#ffffff", scale: 2, useCORS: true, logging: false });
}

type Props = { characterId: string; onBack: () => void; initialTab?: string; openPowerIdea?: boolean };

export function SheetView({ characterId, onBack, initialTab, openPowerIdea }: Props) {
  const { user, isMaster } = useAuth();
  const [data, setData] = useState<CharacterData | null>(null);
  const [characterOwnerId, setCharacterOwnerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [currency, setCurrency] = useState<CharacterCurrency | null>(null);
  const [propertyLocks, setPropertyLocks] = useState<UserPropertyLock[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [notFound, setNotFound] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const loadedRef = useRef(false);
  const pdfFichaRef = useRef<HTMLDivElement>(null);
  const pdfPoderRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadedRef.current = false;
    setData(null);
    setNotFound(false);
    (async () => {
      const { data: row, error } = await supabase
        .from("sheet_characters").select("user_id,data").eq("id", characterId).maybeSingle();
      if (cancelled) return;
      if (error || !row) {
        setNotFound(true);
        return;
      }
      setCharacterOwnerId(row.user_id);
      setData(mergeCharacter(row.data as Partial<CharacterData>));
    })();
    return () => { cancelled = true; };
  }, [characterId]);

  const refreshShop = useCallback(async () => {
    const [items, purs, cur, locks] = await Promise.all([
      fetchShopForCharacter(characterId),
      fetchPurchases(characterId),
      fetchCurrency(characterId),
      fetchPropertyLocks(characterId),
    ]);
    setShopItems(items);
    setPurchases(purs);
    setCurrency(cur);
    setPropertyLocks(locks);
  }, [characterId]);

  const refreshInventory = useCallback(async () => {
    try { setInventory(await fetchInventory(characterId)); } catch { /* ignore */ }
  }, [characterId]);

  useEffect(() => { refreshShop(); refreshInventory(); }, [refreshShop, refreshInventory]);

  const isOwner = !!user && !!characterOwnerId && user.id === characterOwnerId;
  const canEdit = isOwner || isMaster;

  useEffect(() => {
    if (!data || !canEdit) return;
    // The first run after loading only reflects the fetched data, so it is not saved.
    if (!loadedRef.current) { loadedRef.current = true; return; }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("sheet_characters")
        .update({ data, name: data.nombre || "Personaje" })
        .eq("id", characterId);
      setSaving(false);
      if (error) toast.error("Error al guardar");
    }, 700);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [data, characterId, canEdit]);

  const update = (patch: Partial<CharacterData>) => setData((d) => (d ? { ...d, ...patch } : d));

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-lg">Ficha no encontrada o sin acceso.</p>
        <Button variant="outline" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
      </div>
    );
  }

  if (!data) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const bonuses = computeAttrBonuses(shopItems, purchases);
  const dataWithShopBonuses: CharacterData = {
    ...data,
    attrs: ATTRIBUTES.reduce((acc, a) => {
      acc[a.key] = data.attrs[a.key] + (bonuses[a.key as AttrKey] || 0);
      return acc;
    }, { ...data.attrs }),
  };
  const dataWithBonuses = applyInventoryToCharacter(dataWithShopBonuses, inventory);

  const invDeltas = inventoryDeltaMap(inventory);
  const invAttrDelta: Partial<Record<AttrKey, number>> = {};
  for (const k of ["STR", "DES", "CON", "INT", "SAB", "CAR"] as AttrKey[]) {
    if (invDeltas[k]) invAttrDelta[k] = invDeltas[k];
  }

  const updateWithBase = (patch: Partial<CharacterData>) => {
    if (patch.attrs) {
      const baseAttrs = { ...data.attrs };
      for (const k of Object.keys(patch.attrs) as AttrKey[]) {
        baseAttrs[k] = patch.attrs[k] - (bonuses[k] || 0) - (invAttrDelta[k] || 0);
      }
      update({ ...patch, attrs: baseAttrs });
      return;
    }
    update(patch);
  };

  const powerColor = currency?.power_color ?? "#7c3aed";

  const updatePowerColor = async (color: string) => {
    const { error } = await supabase.from("sheet_character_currency").update({ power_color: color }).eq("character_id", characterId);
    if (error) toast.error(error.message); else refreshShop();
  };

  const exportPDF = async () => {
    if (!pdfFichaRef.current || !pdfPoderRef.current) return;
    setExporting(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const c1 = await capturePdfPage(pdfFichaRef.current);
      const c2 = await capturePdfPage(pdfPoderRef.current);
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const addPage = (canvas: HTMLCanvasElement, isFirst: boolean) => {
        if (!isFirst) pdf.addPage();
        const scale = Math.min(pageW / canvas.width, pageH / canvas.height);
        const w = canvas.width * scale, h = canvas.height * scale;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pageW - w) / 2, (pageH - h) / 2, w, h);
      };
      addPage(c1, true);
      addPage(c2, false);
      const fileName = `${(data.nombre || "personaje").replace(/[\\/:*?"<>|]/g, "_")}.pdf`;
      if (Capacitor.isNativePlatform()) {
        // WebViews ignore blob downloads, so hand the file to the system share sheet instead.
        const written = await Filesystem.writeFile({
          path: fileName,
          data: pdf.output("datauristring").split(",")[1],
          directory: Directory.Cache,
        });
        await Share.share({ title: fileName, url: written.uri });
      } else {
        pdf.save(fileName);
      }
    } catch (e) {
      toast.error("Error generando PDF: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <HelpTextsProvider isAdmin={isMaster}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Fichas</Button>
          <span className="text-xs text-muted-foreground">
            {!canEdit ? "Solo lectura" : saving ? "Guardando…" : "Guardado"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {currency && (
            <>
              <CurrencyBadges xp={currency.xp} evo={currency.evo} />
              {isMaster && <CurrencyEditor currency={currency} characterId={characterId} onSaved={refreshShop} />}
            </>
          )}
          <PowerIdeaDialog characterId={characterId} isOwner={isOwner} defaultOpen={openPowerIdea} />
          <Button variant="outline" size="sm" onClick={exportPDF} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" /> {exporting ? "Generando…" : "PDF"}
          </Button>
          {isMaster && currency && (
            <label className="flex items-center gap-1 text-xs sheet-panel px-2 py-1 cursor-pointer" title="Color del Poder">
              <Palette className="h-3.5 w-3.5" />
              <input
                type="color"
                value={powerColor}
                onChange={(e) => updatePowerColor(e.target.value)}
                className="h-6 w-8 rounded cursor-pointer bg-transparent border-0"
              />
            </label>
          )}
        </div>

        <Tabs defaultValue={initialTab && ["ficha", "poder", "inventario", "tienda"].includes(initialTab) ? initialTab : "ficha"} className="w-full">
          <TabsList className="grid grid-cols-4 w-full mb-4">
            <TabsTrigger value="ficha">Ficha</TabsTrigger>
            <TabsTrigger value="poder">Poder</TabsTrigger>
            <TabsTrigger value="inventario" className="px-1 sm:px-3">Inventario</TabsTrigger>
            <TabsTrigger value="tienda">Tienda</TabsTrigger>
          </TabsList>
          <TabsContent value="ficha">
            <CharacterSheet data={dataWithBonuses} update={updateWithBase} items={inventory} />
          </TabsContent>
          <TabsContent value="poder">
            <PowerPanel data={data} update={update} shopItems={shopItems} purchases={purchases} powerColor={powerColor} />
          </TabsContent>
          <TabsContent value="inventario">
            <InventoryPanel
              characterId={characterId}
              data={data}
              update={update}
              canEdit={canEdit}
              onItemsChange={refreshInventory}
            />
          </TabsContent>
          <TabsContent value="tienda">
            {currency && (
              <ShopPanel
                characterId={characterId}
                characterLevel={data.nivel}
                shopItems={shopItems}
                purchases={purchases}
                propertyLocks={propertyLocks}
                currency={currency}
                onChange={refreshShop}
                habNames={{
                  hab1: data.poder.habilidad1Nombre,
                  hab2: data.poder.habilidad2Nombre,
                  hab3: data.poder.habilidad3Nombre,
                }}
                isAdmin={isMaster}
              />
            )}
          </TabsContent>
        </Tabs>

        <PdfRenderContext.Provider value={true}>
          <div style={{ position: "fixed", left: -10000, top: 0, width: PDF_PAGE_WIDTH, pointerEvents: "none" }} aria-hidden>
            <div ref={pdfFichaRef} style={{ width: PDF_PAGE_WIDTH, padding: 20, background: "#ffffff" }}>
              <CharacterSheet data={dataWithBonuses} update={() => {}} />
            </div>
            <div ref={pdfPoderRef} style={{ width: PDF_PAGE_WIDTH, padding: 20, background: "#ffffff" }}>
              <PowerPanel data={data} update={() => {}} shopItems={shopItems} purchases={purchases} powerColor={powerColor} />
            </div>
          </div>
        </PdfRenderContext.Provider>
      </div>
    </HelpTextsProvider>
  );
}

function CurrencyEditor({
  currency, characterId, onSaved,
}: { currency: CharacterCurrency; characterId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [xp, setXp] = useState(currency.xp);
  const [evo, setEvo] = useState(currency.evo);
  useEffect(() => { setXp(currency.xp); setEvo(currency.evo); }, [currency]);

  const save = async () => {
    const { error } = await supabase.from("sheet_character_currency").update({ xp, evo }).eq("character_id", characterId);
    if (error) toast.error(error.message);
    else { toast.success("Currency actualizada"); setOpen(false); onSaved(); }
  };

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setOpen(true)} title="Editar currency">
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1 sheet-panel px-2 py-1">
      <span className="text-xs text-muted-foreground">XP</span>
      <Input type="number" value={xp} onChange={(e) => setXp(parseInt(e.target.value) || 0)} className="h-7 w-16 text-xs" />
      <span className="text-xs text-muted-foreground">EVO</span>
      <Input type="number" value={evo} onChange={(e) => setEvo(parseInt(e.target.value) || 0)} className="h-7 w-16 text-xs" />
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={save}><Check className="h-3.5 w-3.5" /></Button>
    </div>
  );
}
