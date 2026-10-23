import { ReactNode, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CombatSnapshot, emptyCombat, restoreCombat, stableStringify } from '@/lib/combat-state';
import { useAppSync } from '@/hooks/useAppSync';
import { AUTOSAVE_DELAY_MS, shouldShareCombat } from '@/lib/live-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, FolderOpen, X, Trash2, Radio } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

// `mount` changes force the tracker to re-initialise; `synced` is the last state known to be on the server.
type CombatTab = { id: string; mount: string; name: string; savedId?: string; synced?: string; state: CombatSnapshot };
type SavedCombat = { id: string; name: string; state: unknown };
export function CombatWorkspace({ renderTracker }: { renderTracker: (state: CombatSnapshot, onChange: (state: CombatSnapshot) => void) => ReactNode }) {
  const [tabs, setTabs] = useState<CombatTab[]>([{ id: 'initial', mount: 'initial', name: 'Combate 1', state: emptyCombat() }]);
  const [active, setActive] = useState('initial');
  const [saved, setSaved] = useState<SavedCombat[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const writing = useRef(new Set<string>());
  const current = tabs.find(tab => tab.id === active);

  const loadSaved = async () => {
    const { data, error } = await supabase.from('saved_combats').select('*').order('name');
    if (error) { toast({ title: 'No se pudieron cargar los combates', description: error.message, variant: 'destructive' }); return; }
    const list = data || [];
    setSaved(list);
    // Apply other masters' live changes to open saved tabs that have no pending local edits.
    setTabs(previous => previous.map(tab => {
      if (!tab.savedId || timers.current.has(tab.id) || writing.current.has(tab.id) || stableStringify(tab.state) !== tab.synced) return tab;
      const remote = list.find(item => item.id === tab.savedId);
      if (!remote) return { ...tab, savedId: undefined, synced: undefined };
      const state = restoreCombat(remote.state);
      const text = stableStringify(state);
      if (text === tab.synced && remote.name === tab.name) return tab;
      return { ...tab, name: remote.name, state, synced: text, mount: crypto.randomUUID() };
    }));
  };
  useEffect(() => { void loadSaved(); }, []);
  useAppSync(['saved_combats'], () => void loadSaved());
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const updateTabs = (update: (previous: CombatTab[]) => CombatTab[]) => {
    tabsRef.current = update(tabsRef.current);
    setTabs(tabsRef.current);
  };

  const scheduleSave = (tabId: string) => {
    clearTimeout(timers.current.get(tabId));
    timers.current.set(tabId, setTimeout(async () => {
      timers.current.delete(tabId);
      if (writing.current.has(tabId)) { scheduleSave(tabId); return; }
      const latest = tabsRef.current.find(item => item.id === tabId);
      if (!latest || !shouldShareCombat(latest.state, latest.savedId)) return;
      const body = stableStringify(latest.state);
      if (body === latest.synced) return;
      writing.current.add(tabId);
      const payload = { state: JSON.parse(body) };
      const result = latest.savedId
        ? await supabase.from('saved_combats').update(payload).eq('id', latest.savedId).select('id').single()
        : await supabase.from('saved_combats').insert({ ...payload, name: latest.name }).select('id').single();
      writing.current.delete(tabId);
      if (result.error) {
        toast({ title: 'No se pudo sincronizar el combate', description: result.error.message, variant: 'destructive' });
        scheduleSave(tabId);
        return;
      }
      updateTabs(previous => previous.map(item => item.id === tabId ? { ...item, savedId: result.data.id, synced: body } : item));
      const updated = tabsRef.current.find(item => item.id === tabId);
      if (updated && stableStringify(updated.state) !== body) scheduleSave(tabId);
    }, AUTOSAVE_DELAY_MS));
  };

  const onTrackerChange = (tabId: string, state: CombatSnapshot) => {
    updateTabs(previous => previous.map(item => item.id === tabId ? { ...item, state } : item));
    const tab = tabsRef.current.find(item => item.id === tabId);
    if (!tab || !shouldShareCombat(state, tab.savedId) || stableStringify(state) === tab.synced) return;
    scheduleSave(tabId);
  };

  const save = async () => {
    if (!current || !name.trim()) return;
    if (writing.current.has(current.id)) return;
    clearTimeout(timers.current.get(current.id));
    timers.current.delete(current.id);
    writing.current.add(current.id);
    setBusy(true);
    const latest = tabsRef.current.find(item => item.id === current.id);
    const body = stableStringify(latest?.state || current.state);
    const payload = { name: name.trim(), state: JSON.parse(body) };
    const result = current.savedId
      ? await supabase.from('saved_combats').update(payload).eq('id', current.savedId).select().single()
      : await supabase.from('saved_combats').insert(payload).select().single();
    setBusy(false);
    writing.current.delete(current.id);
    if (result.error) { toast({ title: 'No se pudo guardar', description: result.error.message, variant: 'destructive' }); return; }
    updateTabs(previous => previous.map(tab => tab.id === current.id ? { ...tab, name: payload.name, savedId: result.data.id, synced: body } : tab));
    const updated = tabsRef.current.find(item => item.id === current.id);
    if (updated && stableStringify(updated.state) !== body) scheduleSave(current.id);
    setSaveOpen(false);
    toast({ title: 'Combate guardado', description: 'Los cambios de esta pestaña se compartirán en vivo.' });
    void loadSaved();
  };
  return <section className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Tabs value={active} onValueChange={setActive} className="min-w-0 max-w-full">
        <TabsList className="h-auto flex-wrap justify-start">
          {tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id} className="gap-1">
            {tab.savedId && <Radio className="h-3 w-3 text-primary" aria-label="En vivo" />}{tab.name}
          </TabsTrigger>)}
        </TabsList>
      </Tabs>
      <Button size="icon" variant="outline" title="Nuevo combate" aria-label="Nuevo combate" onClick={() => {
        const id = crypto.randomUUID(); setTabs(previous => [...previous, { id, mount: id, name: `Combate ${previous.length + 1}`, state: emptyCombat() }]); setActive(id);
      }}><Plus className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" title="Cerrar pestaña" aria-label="Cerrar pestaña" disabled={tabs.length === 1} onClick={() => {
        if (!window.confirm('¿Cerrar esta pestaña? Los cambios no guardados se perderán.')) return;
        if (writing.current.has(active)) return;
        clearTimeout(timers.current.get(active)); timers.current.delete(active);
        const remaining = tabs.filter(tab => tab.id !== active); setTabs(remaining); setActive(remaining[0]?.id || 'initial');
      }}><X className="h-4 w-4" /></Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => { setName(current?.name || ''); setSaveOpen(true); }}><Save className="mr-2 h-4 w-4" />Guardar combate</Button>
      <Button size="sm" variant="outline" onClick={() => { void loadSaved(); setLoadOpen(true); }}><FolderOpen className="mr-2 h-4 w-4" />Combates guardados</Button>
    </div>
    {tabs.map(tab => <div key={tab.mount} hidden={active !== tab.id}>
      {renderTracker(tab.state, state => onTrackerChange(tab.id, state))}
    </div>)}
    <Dialog open={saveOpen} onOpenChange={setSaveOpen}><DialogContent>
      <DialogHeader><DialogTitle>Guardar combate</DialogTitle></DialogHeader>
      <Label htmlFor="combat-name">Nombre del combate</Label><Input id="combat-name" value={name} onChange={event => setName(event.target.value)} />
      <DialogFooter><Button disabled={busy || !name.trim()} onClick={save}>{busy ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={loadOpen} onOpenChange={setLoadOpen}><DialogContent>
      <DialogHeader><DialogTitle>Combates guardados</DialogTitle></DialogHeader>
      <div className="max-h-96 overflow-y-auto space-y-2">
        {saved.length === 0 && <p className="text-muted-foreground">Sin combates guardados.</p>}
        {saved.map(combat => <div key={combat.id} className="flex gap-2">
          <Button variant="outline" className="flex-1 justify-start min-w-0" onClick={() => {
            const existing = tabs.find(tab => tab.savedId === combat.id);
            const state = restoreCombat(combat.state);
            const id = existing?.id || crypto.randomUUID();
            const loaded: CombatTab = { id, mount: crypto.randomUUID(), name: combat.name, savedId: combat.id, synced: stableStringify(state), state };
            setTabs(previous => existing ? previous.map(tab => tab.id === existing.id ? loaded : tab) : [...previous, loaded]);
            setActive(id);
            setLoadOpen(false);
          }}><span className="truncate">{combat.name}</span></Button>
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${combat.name}`} onClick={async () => {
            if (!window.confirm(`¿Eliminar ${combat.name}?`)) return;
            const { error } = await supabase.from('saved_combats').delete().eq('id', combat.id);
            if (error) toast({ title: 'No se pudo eliminar', variant: 'destructive' });
            else { setTabs(previous => previous.map(tab => tab.savedId === combat.id ? { ...tab, savedId: undefined, synced: undefined } : tab)); void loadSaved(); }
          }}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
      </div>
    </DialogContent></Dialog>
  </section>;
}
