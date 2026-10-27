import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { sheetDb } from '@/lib/sheet/db';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SheetView } from '@/components/sheet/SheetView';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type SheetRow = { id: string; user_id: string; name: string };
type PlayerProfile = { user_id: string; display_name: string | null; character_name: string | null };

export default function Ficha() {
  const { user, profile, isMaster } = useAuth();
  const [sheets, setSheets] = useState<SheetRow[]>([]);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const sheetParam = params.get('sheet');
  const tabParam = params.get('tab') ?? undefined;
  const navParam = params.get('n') ?? '';

  // A tapped notification (or any link) can open a given sheet straight away.
  useEffect(() => { if (sheetParam) setSelectedId(sheetParam); }, [sheetParam, navParam]);

  const refresh = useCallback(async () => {
    const [{ data: rows }, { data: profs }] = await Promise.all([
      sheetDb.from('sheet_characters').select('id,user_id,name').order('created_at'),
      isMaster
        ? supabase.from('profiles').select('user_id, display_name, character_name, role').eq('role', 'player')
        : Promise.resolve({ data: [] as PlayerProfile[] }),
    ]);
    setSheets((rows ?? []) as SheetRow[]);
    setPlayers((profs ?? []) as PlayerProfile[]);
    setLoading(false);
  }, [isMaster]);

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  const createSheet = async (forUserId: string) => {
    const { data, error } = await sheetDb
      .from('sheet_characters')
      .insert({ user_id: forUserId, name: 'Nuevo personaje', data: {} })
      .select('id')
      .single();
    if (error) { toast.error(error.message); return; }
    toast.success('Ficha creada');
    await refresh();
    setSelectedId(data.id);
  };

  const deleteSheet = async (id: string, name: string) => {
    if (!confirm(`¿Borrar "${name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await sheetDb.from('sheet_characters').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Ficha borrada');
    refresh();
  };

  if (!user || loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (selectedId) {
    return (
      <div className="max-w-6xl mx-auto">
        <SheetView
          key={`${selectedId}:${navParam}`}
          characterId={selectedId}
          initialTab={tabParam}
          onBack={() => { setSelectedId(null); setParams({}, { replace: true }); refresh(); }}
        />
      </div>
    );
  }

  const ownName = profile?.display_name || 'Mis fichas';
  const sections = [
    { userId: user.id, title: `${ownName} (tú)` },
    ...(isMaster
      ? players
          .filter((p) => p.user_id !== user.id)
          .map((p) => ({ userId: p.user_id, title: p.display_name || p.user_id.slice(0, 8) }))
      : []),
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Ficha</h1>
      {sections.map((s) => {
        const own = sheets.filter((c) => c.user_id === s.userId);
        return (
          <Card key={s.userId}>
            <CardHeader className="flex-row items-center justify-between space-y-0 gap-2">
              <CardTitle className="text-lg break-words">{s.title}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => createSheet(s.userId)}>
                <Plus className="h-4 w-4 mr-1" /> Nueva
              </Button>
            </CardHeader>
            <CardContent>
              {own.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay fichas.</p>
              ) : (
                <ul className="space-y-2">
                  {own.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                      <button
                        type="button"
                        className="flex-1 text-left font-medium hover:text-primary transition-colors"
                        onClick={() => setSelectedId(c.id)}
                      >
                        {c.name}
                      </button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => deleteSheet(c.id, c.name)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
