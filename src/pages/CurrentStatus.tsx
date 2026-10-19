import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createStatusRows } from '@/lib/combat-state';

type StatusRow = ReturnType<typeof createStatusRows>[number];
export default function CurrentStatus() {
  const [rows, setRows] = useState<StatusRow[]>(createStatusRows);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pending = useRef(new Map<number, Partial<StatusRow>>());
  const { toast } = useToast();
  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('current_status').select('*').order('slot');
    if (error) toast({ title: 'No se pudo cargar Status Actual', description: error.message, variant: 'destructive' });
    else { setRows(data || createStatusRows()); pending.current.clear(); }
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  const update = (slot: number, patch: Partial<StatusRow>) => {
    pending.current.set(slot, { ...pending.current.get(slot), ...patch });
    setRows(previous => previous.map(row => row.slot === slot ? { ...row, ...patch } : row));
  };
  const save = async () => {
    setSaving(true);
    const changes = [...pending.current.entries()];
    const results = await Promise.all(changes.map(async ([slot, patch]) => {
      const { error } = await supabase.from('current_status').update(patch).eq('slot', slot);
      if (!error) pending.current.delete(slot);
      return error;
    }));
    setSaving(false);
    const error = results.find(Boolean);
    toast(error ? { title: 'No se pudieron guardar todos los cambios', description: error.message, variant: 'destructive' } : { title: 'Status Actual guardado' });
  };
  return <section className="space-y-6">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h1 className="text-3xl font-bold">Status Actual</h1>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" aria-label="Actualizar pizarra" title="Actualizar pizarra" disabled={loading || saving} onClick={() => {
          if (pending.current.size && !window.confirm('¿Descartar los cambios sin guardar?')) return;
          void load();
        }}><RefreshCw className="h-5 w-5" /></Button>
        <Button onClick={save} disabled={loading || saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </div>
    {loading ? <p className="text-muted-foreground">Cargando…</p> : <div className="status-board space-y-5">
      <div className="hidden md:grid grid-cols-[minmax(0,1.4fr)_minmax(0,.7fr)_minmax(0,.7fr)_minmax(0,2fr)] gap-5 text-sm font-semibold text-muted-foreground">
        <span>Nombre</span><span>Vida máxima</span><span>Vida actual</span><span>Anotaciones</span>
      </div>
      {rows.map(row => <div key={row.slot} className="grid grid-cols-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,.7fr)_minmax(0,.7fr)_minmax(0,2fr)] gap-3 md:gap-5 items-start">
        <Input aria-label={`Nombre ${row.slot}`} placeholder={`Nombre ${row.slot}`} value={row.name} disabled={saving} onChange={event => update(row.slot, { name: event.target.value })} className="col-span-2 md:col-span-1 h-16 border-0 bg-transparent text-2xl md:text-2xl font-semibold shadow-none" />
        <div><label className="md:hidden text-sm text-muted-foreground">Vida máxima</label><Input aria-label={`Vida máxima ${row.slot}`} type="number" value={row.max_hp} disabled={saving} onChange={event => update(row.slot, { max_hp: Number(event.target.value) })} className="h-16 border-0 bg-transparent text-3xl md:text-3xl font-bold shadow-none" /></div>
        <div><label className="md:hidden text-sm text-muted-foreground">Vida actual</label><Input aria-label={`Vida actual ${row.slot}`} type="number" value={row.current_hp} disabled={saving} onChange={event => update(row.slot, { current_hp: Number(event.target.value) })} className="h-16 border-0 bg-transparent text-3xl md:text-3xl font-bold text-primary shadow-none" /></div>
        <Textarea aria-label={`Anotaciones ${row.slot}`} placeholder="Anotaciones" value={row.notes} disabled={saving} onChange={event => update(row.slot, { notes: event.target.value })} className="col-span-2 md:col-span-1 min-h-16 border-0 bg-transparent text-xl md:text-xl shadow-none resize-y" />
      </div>)}
    </div>}
  </section>;
}