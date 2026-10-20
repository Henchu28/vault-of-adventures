import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CombatSnapshot, emptyCombat, restoreCombat } from '@/lib/combat-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Save, FolderOpen, X, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type CombatTab = { id: string; name: string; savedId?: string; state: CombatSnapshot };
type SavedCombat = { id: string; name: string; state: unknown };
export function CombatWorkspace({ renderTracker }: { renderTracker: (state: CombatSnapshot, onChange: (state: CombatSnapshot) => void) => ReactNode }) {
  const [tabs, setTabs] = useState<CombatTab[]>([{ id: 'initial', name: 'Combate 1', state: emptyCombat() }]);
  const [active, setActive] = useState('initial');
  const [saved, setSaved] = useState<SavedCombat[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const current = tabs.find(tab => tab.id === active);
  const loadSaved = async () => {
    const { data, error } = await supabase.from('saved_combats').select('*').order('name');
    if (error) toast({ title: 'No se pudieron cargar los combates', description: error.message, variant: 'destructive' });
    else setSaved(data || []);
  };
  useEffect(() => { void loadSaved(); }, []);
  const save = async () => {
    if (!current || !name.trim()) return;
    setBusy(true);
    const payload = { name: name.trim(), state: JSON.parse(JSON.stringify(current.state)) };
    const result = current.savedId
      ? await supabase.from('saved_combats').update(payload).eq('id', current.savedId).select().single()
      : await supabase.from('saved_combats').insert(payload).select().single();
    setBusy(false);
    if (result.error) { toast({ title: 'No se pudo guardar', description: result.error.message, variant: 'destructive' }); return; }
    setTabs(previous => previous.map(tab => tab.id === current.id ? { ...tab, name: payload.name, savedId: result.data.id } : tab));
    setSaveOpen(false);
    toast({ title: 'Combate guardado' });
    void loadSaved();
  };
  return <section className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <Tabs value={active} onValueChange={setActive} className="min-w-0 max-w-full">
        <TabsList className="h-auto flex-wrap justify-start">
          {tabs.map(tab => <TabsTrigger key={tab.id} value={tab.id}>{tab.name}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      <Button size="icon" variant="outline" title="Nuevo combate" aria-label="Nuevo combate" onClick={() => {
        const id = crypto.randomUUID(); setTabs(previous => [...previous, { id, name: `Combate ${previous.length + 1}`, state: emptyCombat() }]); setActive(id);
      }}><Plus className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" title="Cerrar pestaña" aria-label="Cerrar pestaña" disabled={tabs.length === 1} onClick={() => {
        if (!window.confirm('¿Cerrar esta pestaña? Los cambios no guardados se perderán.')) return;
        const remaining = tabs.filter(tab => tab.id !== active); setTabs(remaining); setActive(remaining[0]?.id || 'initial');
      }}><X className="h-4 w-4" /></Button>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => { setName(current?.name || ''); setSaveOpen(true); }}><Save className="mr-2 h-4 w-4" />Guardar combate</Button>
      <Button size="sm" variant="outline" onClick={() => { void loadSaved(); setLoadOpen(true); }}><FolderOpen className="mr-2 h-4 w-4" />Combates guardados</Button>
    </div>
    {tabs.map(tab => <div key={tab.id} hidden={active !== tab.id}>
      {renderTracker(tab.state, state => setTabs(previous => previous.map(item => item.id === tab.id ? { ...item, state } : item)))}
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
            // Always mount a fresh tab id so the tracker re-initialises from the saved snapshot.
            const existing = tabs.find(tab => tab.savedId === combat.id);
            const id = crypto.randomUUID();
            const loaded = { id, name: combat.name, savedId: combat.id, state: restoreCombat(combat.state) };
            setTabs(previous => existing ? previous.map(tab => tab.id === existing.id ? loaded : tab) : [...previous, loaded]);
            setActive(id);
            setLoadOpen(false);
          }}><span className="truncate">{combat.name}</span></Button>
          <Button variant="ghost" size="icon" aria-label={`Eliminar ${combat.name}`} onClick={async () => {
            if (!window.confirm(`¿Eliminar ${combat.name}?`)) return;
            const { error } = await supabase.from('saved_combats').delete().eq('id', combat.id);
            if (error) toast({ title: 'No se pudo eliminar', variant: 'destructive' });
            else { setTabs(previous => previous.map(tab => tab.savedId === combat.id ? { ...tab, savedId: undefined } : tab)); void loadSaved(); }
          }}><Trash2 className="h-4 w-4" /></Button>
        </div>)}
      </div>
    </DialogContent></Dialog>
  </section>;
}