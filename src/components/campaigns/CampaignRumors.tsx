import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Trash2, Edit, Check, X, Flame, Snowflake, Thermometer, BadgeCheck, HelpCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type RumorStatus = 'unknown' | 'cold' | 'warm' | 'hot' | 'proven';

interface Rumor {
  id: string;
  campaign_id: number;
  text: string;
  status: RumorStatus;
  created_by: string;
  created_at: string;
}

const STATUS_META: Record<RumorStatus, { label: string; icon: any; className: string }> = {
  unknown: { label: 'Sin definir', icon: HelpCircle, className: 'bg-muted text-muted-foreground hover:bg-muted/80' },
  cold: { label: 'Frío', icon: Snowflake, className: 'bg-blue-500/20 text-blue-300 border-blue-500/40 hover:bg-blue-500/30' },
  warm: { label: 'Templado', icon: Thermometer, className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 hover:bg-yellow-500/30' },
  hot: { label: 'Caliente', icon: Flame, className: 'bg-orange-500/20 text-orange-300 border-orange-500/40 hover:bg-orange-500/30' },
  proven: { label: 'Probada', icon: BadgeCheck, className: 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30' },
};

export function CampaignRumors({ campaignId }: { campaignId: number }) {
  const { user, isMaster } = useAuth();
  const { toast } = useToast();
  const [rumors, setRumors] = useState<Rumor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const fetchRumors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('campaign_rumors')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });
    if (!error) setRumors((data as Rumor[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchRumors(); }, [campaignId]);

  const handleAdd = async () => {
    if (!newText.trim() || !user) return;
    const { error } = await supabase.from('campaign_rumors').insert({
      campaign_id: campaignId,
      text: newText.trim(),
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Error', description: 'No se pudo añadir el rumor', variant: 'destructive' });
    } else {
      setNewText('');
      fetchRumors();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('campaign_rumors').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
    else fetchRumors();
  };

  const startEdit = (r: Rumor) => { setEditingId(r.id); setEditingText(r.text); };
  const cancelEdit = () => { setEditingId(null); setEditingText(''); };

  const saveEdit = async () => {
    if (!editingId || !editingText.trim()) return;
    const { error } = await supabase
      .from('campaign_rumors')
      .update({ text: editingText.trim() })
      .eq('id', editingId);
    if (error) toast({ title: 'Error', description: 'No se pudo actualizar', variant: 'destructive' });
    else { cancelEdit(); fetchRumors(); }
  };

  const setStatus = async (id: string, status: RumorStatus) => {
    const { error } = await supabase.from('campaign_rumors').update({ status }).eq('id', id);
    if (error) toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' });
    else fetchRumors();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Nuevo rumor o teoría..."
        />
        <Button onClick={handleAdd} disabled={!newText.trim()}>
          <Plus className="w-4 h-4 mr-2" />Añadir
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : rumors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Aún no hay rumores. Añade el primero.</div>
      ) : (
        <div className="space-y-2">
          {rumors.map((r) => {
            const meta = STATUS_META[r.status];
            const Icon = meta.icon;
            const isEditing = editingId === r.id;
            const badge = (
              <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                <Icon className="w-3.5 h-3.5" />{meta.label}
              </Badge>
            );
            return (
              <Card key={r.id} className="p-3 flex items-center gap-3">
                {isEditing ? (
                  <>
                    <Input value={editingText} onChange={(e) => setEditingText(e.target.value)} className="flex-1" />
                    <Button size="icon" variant="ghost" onClick={saveEdit}><Check className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={cancelEdit}><X className="w-4 h-4" /></Button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm">{r.text}</p>
                    {isMaster ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="focus:outline-none">{badge}</button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {(Object.keys(STATUS_META) as RumorStatus[]).map((s) => {
                            const m = STATUS_META[s];
                            const I = m.icon;
                            return (
                              <DropdownMenuItem key={s} onClick={() => setStatus(r.id, s)}>
                                <I className="w-4 h-4 mr-2" />{m.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : badge}
                    <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
