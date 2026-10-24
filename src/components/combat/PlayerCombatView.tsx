import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAppSync } from '@/hooks/useAppSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type PublicCombatant = { id: string; name: string; alignment: string; initRoll: number | null; hp?: number; maxHp?: number; ac?: number };
type PublicCombat = { id: string; name: string; state: { round?: number; turnIdx?: number; combatants?: PublicCombatant[] } };

const BORDER: Record<string, string> = {
  player: 'border-l-green-500 border-r-green-500',
  monster: 'border-l-red-500 border-r-red-500',
  npc: 'border-l-yellow-500 border-r-yellow-500',
  structure: 'border-l-blue-500 border-r-blue-500',
};

/** Read-only live view of saved combats for players: enemy HP/AC are stripped server-side. */
export function PlayerCombatView() {
  const [combats, setCombats] = useState<PublicCombat[]>([]);
  const [active, setActive] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const load = async () => {
    const { data, error } = await supabase.rpc('get_combats_public');
    if (error) {
      setLoading(false);
      toast({ title: 'No se pudieron actualizar los combates', description: error.message, variant: 'destructive' });
      return;
    }
    const list: PublicCombat[] = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      state: item.state && typeof item.state === 'object' && !Array.isArray(item.state)
        ? item.state as PublicCombat['state'] : {},
    }));
    setCombats(list);
    setActive(previous => list.some(c => c.id === previous) ? previous : list[0]?.id || '');
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);
  useAppSync(['saved_combats'], () => void load());
  const combat = combats.find(c => c.id === active);
  const list = combat?.state.combatants || [];
  const started = list.some(c => c.initRoll !== null);

  return <div className="space-y-4">
    <h1 className="text-3xl font-bold">Combat</h1>
    {loading ? <p className="text-muted-foreground">Cargando…</p> : combats.length === 0
      ? <p className="text-muted-foreground">El Máster todavía no ha compartido ningún combate.</p>
      : <>
        <Tabs value={active} onValueChange={setActive}>
          <TabsList className="h-auto flex-wrap justify-start">
            {combats.map(c => <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>)}
          </TabsList>
        </Tabs>
        <Card className="max-w-2xl">
          <CardHeader><CardTitle className="flex justify-between gap-2"><span>{combat?.name}</span>{started && <span className="text-primary">Ronda {combat?.state.round ?? 1}</span>}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {list.length === 0 && <p className="text-muted-foreground">Sin participantes.</p>}
            {list.map((c, index) => {
              const isTurn = started && index === (combat?.state.turnIdx ?? 0);
              return <div key={c.id} className={`flex items-center justify-between rounded-md border bg-card px-4 py-3 ${BORDER[c.alignment] || 'border-l-muted-foreground border-r-muted-foreground'} ${isTurn ? 'border-l-8 border-r-8' : 'border-l-4 border-r-4'}`}>
                <span className={`font-semibold ${isTurn ? 'text-lg' : ''}`}>{c.name}</span>
                <div className="text-right">
                  {c.hp !== undefined && <div className="flex gap-3 justify-end">
                    <span className="flex items-center gap-1"><Heart className="h-4 w-4 text-destructive" />{c.hp}</span>
                    <span className="flex items-center gap-1"><Shield className="h-4 w-4 text-muted-foreground" />{c.ac}</span>
                  </div>}
                  {c.initRoll !== null && <div className="text-xs text-muted-foreground">Iniciativa {c.initRoll}</div>}
                </div>
              </div>;
            })}
          </CardContent>
        </Card>
      </>}
  </div>;
}
