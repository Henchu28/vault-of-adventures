import { useAppSync } from '@/hooks/useAppSync';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Search, User, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CharacterPublic {
  id: number;
  name: string;
  Raza: string | null;
  Arquetipo: string | null;
  Elemento: string | null;
  Esencia: string | null;
  Organización: string;
  Edad: number | null;
  Estado: string | null;
  ID_Campaña: number | null;
  user_id: string | null;
}

interface CharacterFull extends CharacterPublic {
  description: string | null;
  historia: string | null;
  apariencia: string | null;
  personalidad: string | null;
}

interface NPCPublic {
  id: number;
  name: string;
  Raza: string | null;
  Arquetipo: string | null;
  Elemento: string | null;
  Esencia: string | null;
  Organización: string | null;
  Edad: number;
  Estado: string | null;
  ID_Campaña: number | null;
  alignment: string;
}

interface NPCFull extends NPCPublic {
  description: string | null;
  historia: string | null;
  apariencia: string | null;
  personalidad: string | null;
}

interface Campaign { id: number; name: string; }
interface ProfileLite { user_id: string; display_name: string | null; }

const ARQUETIPOS = ['Emisor', 'Modulador', 'Canalizador', 'Invocador', 'Focalizador', 'Compuesto'];
const ELEMENTOS = ['Fuego', 'Hielo', 'Tierra', 'Planta', 'Luz', 'Oscuridad', 'Viento', 'Electricidad', 'Espiritual', 'Compuesto'];
const ESENCIAS = ['Nominancia', 'Transmutación', 'Distorsión', 'Cronomancia', 'Dimensiología', 'Sincronimia', 'Emblemancia', 'Vacío', 'Compuesto'];
const ALIGNMENTS = ['Aliado', 'Enemigo', 'Neutral', 'Unknown'];

export default function Characters() {
  const { isMaster, user } = useAuth();
  const { toast } = useToast();

  const [characters, setCharacters] = useState<CharacterPublic[]>([]);
  const [npcs, setNPCs] = useState<NPCPublic[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchetype, setFilterArchetype] = useState('all');
  const [filterElement, setFilterElement] = useState('all');
  const [filterEssence, setFilterEssence] = useState('all');
  const [filterOrg, setFilterOrg] = useState('all');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterFull | null>(null);
  const [editingNPC, setEditingNPC] = useState<NPCFull | null>(null);

  // Detail dialog state
  const [viewingCharacter, setViewingCharacter] = useState<CharacterPublic | null>(null);
  const [viewingCharacterFull, setViewingCharacterFull] = useState<CharacterFull | null>(null);
  const [viewingNPC, setViewingNPC] = useState<NPCPublic | null>(null);
  const [viewingNPCFull, setViewingNPCFull] = useState<NPCFull | null>(null);

  const defaultCharForm = {
    name: '', Raza: '', Arquetipo: '', Elemento: 'Unknown', Esencia: 'Unknown',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', ID_Campaña: '',
    description: '', historia: '', apariencia: '', personalidad: '',
    user_id: '' as string,
  };
  const defaultNpcForm = {
    name: '', Raza: '', Arquetipo: '', Elemento: 'Unknown', Esencia: 'Unknown',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', ID_Campaña: '',
    alignment: 'Unknown', description: '', historia: '', apariencia: '', personalidad: '',
  };

  const [charForm, setCharForm] = useState(defaultCharForm);
  const [npcForm, setNpcForm] = useState(defaultNpcForm);

  useEffect(() => { fetchData(); }, [isMaster]);
  useAppSync(['characters', 'npcs', 'campaigns'], () => fetchData());

  const fetchData = async () => {
    setLoading(true);
    const [charsRes, npcsRes, orgsRes, campaignsRes, profilesRes] = await Promise.all([
      supabase.rpc('get_characters_public'),
      supabase.rpc('get_npcs_public'),
      supabase.from('organizations').select('org_name'),
      supabase.from('campaigns').select('id, name'),
      isMaster ? supabase.from('profiles').select('user_id, display_name') : Promise.resolve({ data: [] as ProfileLite[] }),
    ]);
    if (charsRes.data) setCharacters(charsRes.data as CharacterPublic[]);
    if (npcsRes.data) setNPCs(npcsRes.data as NPCPublic[]);
    if (orgsRes.data) setOrganizations(orgsRes.data.map((o: any) => o.org_name));
    if (campaignsRes.data) setCampaigns(campaignsRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data as ProfileLite[]);
    setLoading(false);
  };

  const resetCharForm = () => setCharForm(defaultCharForm);
  const resetNpcForm = () => setNpcForm(defaultNpcForm);

  const buildCharPayload = () => ({
    name: charForm.name.trim(),
    Raza: charForm.Raza || null,
    Arquetipo: charForm.Arquetipo || 'Unknown',
    Elemento: charForm.Elemento || 'Unknown',
    Esencia: charForm.Esencia || 'Unknown',
    Organización: charForm.Organización || 'Unknown',
    Edad: charForm.Edad || 0,
    Estado: charForm.Estado || 'Unknown',
    ID_Campaña: charForm.ID_Campaña && charForm.ID_Campaña !== 'none' ? Number(charForm.ID_Campaña) : null,
    description: charForm.description || '',
    historia: charForm.historia || '',
    apariencia: charForm.apariencia || '',
    personalidad: charForm.personalidad || '',
    user_id: charForm.user_id && charForm.user_id !== 'none' ? charForm.user_id : null,
  });

  const buildNpcPayload = () => ({
    name: npcForm.name.trim(),
    Raza: npcForm.Raza || null,
    Arquetipo: npcForm.Arquetipo || 'Unknown',
    Elemento: npcForm.Elemento || 'Unknown',
    Esencia: npcForm.Esencia || 'Unknown',
    Organización: npcForm.Organización || 'Unknown',
    Edad: npcForm.Edad || 0,
    Estado: npcForm.Estado || 'Unknown',
    ID_Campaña: npcForm.ID_Campaña && npcForm.ID_Campaña !== 'none' ? Number(npcForm.ID_Campaña) : null,
    alignment: npcForm.alignment || 'Unknown',
    description: npcForm.description || '',
    historia: npcForm.historia || '',
    apariencia: npcForm.apariencia || '',
    personalidad: npcForm.personalidad || '',
  });

  const handleCreateCharacter = async () => {
    if (!charForm.name.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return; }
    const { error } = await supabase.from('characters').insert(buildCharPayload());
    if (error) toast({ title: "Error", description: "No se pudo crear el personaje", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Personaje creado" }); resetCharForm(); setIsCharacterDialogOpen(false); fetchData(); }
  };

  const handleEditCharacter = async () => {
    if (!editingCharacter || !charForm.name.trim()) return;
    const { error } = await supabase.from('characters').update(buildCharPayload()).eq('id', editingCharacter.id);
    if (error) toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Personaje actualizado" }); resetCharForm(); setEditingCharacter(null); fetchData(); }
  };

  const handleCreateNPC = async () => {
    if (!npcForm.name.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return; }
    const { error } = await supabase.from('npcs').insert(buildNpcPayload());
    if (error) toast({ title: "Error", description: "No se pudo crear el NPC", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "NPC creado" }); resetNpcForm(); setIsNPCDialogOpen(false); fetchData(); }
  };

  const handleEditNPC = async () => {
    if (!editingNPC || !npcForm.name.trim()) return;
    const { error } = await supabase.from('npcs').update(buildNpcPayload()).eq('id', editingNPC.id);
    if (error) toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "NPC actualizado" }); resetNpcForm(); setEditingNPC(null); fetchData(); }
  };

  const handleDeleteCharacter = async (id: number) => {
    if (!isMaster) return;
    const { error } = await supabase.from('characters').delete().eq('id', id);
    if (error) toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Personaje eliminado" }); fetchData(); }
  };

  const handleDeleteNPC = async (id: number) => {
    if (!isMaster) return;
    const { error } = await supabase.from('npcs').delete().eq('id', id);
    if (error) toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "NPC eliminado" }); fetchData(); }
  };

  const openEditCharacter = async (charPub: CharacterPublic) => {
    // Fetch full row (RLS allows master)
    const { data } = await supabase.from('characters').select('*').eq('id', charPub.id).maybeSingle();
    const c = (data || charPub) as CharacterFull;
    setEditingCharacter(c);
    setCharForm({
      name: c.name, Raza: c.Raza || '', Arquetipo: c.Arquetipo || '',
      Elemento: c.Elemento || 'Unknown', Esencia: c.Esencia || 'Unknown',
      Organización: c.Organización || 'Unknown', Edad: c.Edad || 0,
      Estado: c.Estado || 'Unknown', ID_Campaña: c.ID_Campaña ? String(c.ID_Campaña) : '',
      description: c.description || '', historia: c.historia || '',
      apariencia: c.apariencia || '', personalidad: c.personalidad || '',
      user_id: c.user_id || '',
    });
  };

  const openEditNPC = async (npcPub: NPCPublic) => {
    const { data } = await supabase.from('npcs').select('*').eq('id', npcPub.id).maybeSingle();
    const n = (data || npcPub) as NPCFull;
    setEditingNPC(n);
    setNpcForm({
      name: n.name, Raza: n.Raza || '', Arquetipo: n.Arquetipo || '',
      Elemento: n.Elemento || 'Unknown', Esencia: n.Esencia || 'Unknown',
      Organización: n.Organización || 'Unknown', Edad: n.Edad || 0,
      Estado: n.Estado || 'Unknown', ID_Campaña: n.ID_Campaña ? String(n.ID_Campaña) : '',
      alignment: n.alignment || 'Unknown',
      description: n.description || '', historia: n.historia || '',
      apariencia: n.apariencia || '', personalidad: n.personalidad || '',
    });
  };

  // Open the wikipedia-like detail dialog
  const openCharacterDetail = async (char: CharacterPublic) => {
    setViewingCharacter(char);
    setViewingCharacterFull(null);
    // Try to fetch full data; RLS returns null if not allowed
    const { data } = await supabase.from('characters').select('*').eq('id', char.id).maybeSingle();
    if (data) setViewingCharacterFull(data as CharacterFull);
  };

  const openNPCDetail = async (npc: NPCPublic) => {
    setViewingNPC(npc);
    setViewingNPCFull(null);
    const { data } = await supabase.from('npcs').select('*').eq('id', npc.id).maybeSingle();
    if (data) setViewingNPCFull(data as NPCFull);
  };

  const filteredCharacters = characters.filter(char =>
    char.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterArchetype === 'all' || char.Arquetipo === filterArchetype) &&
    (filterElement === 'all' || char.Elemento === filterElement) &&
    (filterEssence === 'all' || char.Esencia === filterEssence) &&
    (filterOrg === 'all' || char.Organización === filterOrg)
  );

  const filteredNPCs = npcs.filter(npc =>
    npc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterArchetype === 'all' || npc.Arquetipo === filterArchetype) &&
    (filterElement === 'all' || String(npc.Elemento) === filterElement) &&
    (filterEssence === 'all' || npc.Esencia === filterEssence)
  );

  if (loading) return <div className="flex justify-center items-center min-h-[400px]">Loading characters...</div>;

  const profileLabel = (uid: string | null | undefined) => {
    if (!uid) return null;
    const p = profiles.find(p => p.user_id === uid);
    return p?.display_name || uid.slice(0, 8);
  };

  const charFormJSX = (form: typeof defaultCharForm, setForm: (f: typeof defaultCharForm) => void, onSubmit: () => void, isEdit: boolean) => (
    <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="col-span-2">
        <Label>Nombre *</Label>
        <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Nombre del personaje" />
      </div>
      <div>
        <Label>Raza</Label>
        <Input value={form.Raza} onChange={(e) => setForm({...form, Raza: e.target.value})} placeholder="Ej: Humano, Elfo..." />
      </div>
      <div>
        <Label>Edad</Label>
        <Input type="number" value={form.Edad} onChange={(e) => setForm({...form, Edad: Number(e.target.value)})} />
      </div>
      <div>
        <Label>Arquetipo</Label>
        <Select value={form.Arquetipo} onValueChange={(v) => setForm({...form, Arquetipo: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>{ARQUETIPOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Elemento</Label>
        <Select value={form.Elemento} onValueChange={(v) => setForm({...form, Elemento: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Unknown</SelectItem>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Esencia</Label>
        <Select value={form.Esencia} onValueChange={(v) => setForm({...form, Esencia: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Unknown</SelectItem>
            {ESENCIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Organización</Label>
        <Select value={form.Organización} onValueChange={(v) => setForm({...form, Organización: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Sin organización</SelectItem>
            {organizations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Estado</Label>
        <Input value={form.Estado} onChange={(e) => setForm({...form, Estado: e.target.value})} placeholder="Ej: Vivo, Muerto..." />
      </div>
      <div>
        <Label>Campaña</Label>
        <Select value={form.ID_Campaña || 'none'} onValueChange={(v) => setForm({...form, ID_Campaña: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unknown</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Jugador asociado</Label>
        <Select value={form.user_id || 'none'} onValueChange={(v) => setForm({...form, user_id: v === 'none' ? '' : v})}>
          <SelectTrigger><SelectValue placeholder="Sin jugador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin jugador</SelectItem>
            {profiles.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.display_name || p.user_id.slice(0, 8)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>Descripción (privada, solo Máster)</Label>
        <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
      </div>
      <div className="col-span-2">
        <Label>Historia</Label>
        <Textarea value={form.historia} onChange={(e) => setForm({...form, historia: e.target.value})} rows={3} />
      </div>
      <div className="col-span-2">
        <Label>Apariencia</Label>
        <Textarea value={form.apariencia} onChange={(e) => setForm({...form, apariencia: e.target.value})} rows={3} />
      </div>
      <div className="col-span-2">
        <Label>Personalidad</Label>
        <Textarea value={form.personalidad} onChange={(e) => setForm({...form, personalidad: e.target.value})} rows={3} />
      </div>
      <div className="col-span-2">
        <Button onClick={onSubmit} className="w-full">{isEdit ? 'Guardar Cambios' : 'Crear Personaje'}</Button>
      </div>
    </div>
  );

  const npcFormJSX = (form: typeof defaultNpcForm, setForm: (f: typeof defaultNpcForm) => void, onSubmit: () => void, isEdit: boolean) => (
    <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="col-span-2">
        <Label>Nombre *</Label>
        <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Nombre del NPC" />
      </div>
      <div>
        <Label>Raza</Label>
        <Input value={form.Raza} onChange={(e) => setForm({...form, Raza: e.target.value})} />
      </div>
      <div>
        <Label>Edad</Label>
        <Input type="number" value={form.Edad} onChange={(e) => setForm({...form, Edad: Number(e.target.value)})} />
      </div>
      <div>
        <Label>Arquetipo</Label>
        <Select value={form.Arquetipo} onValueChange={(v) => setForm({...form, Arquetipo: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>{ARQUETIPOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Elemento</Label>
        <Select value={form.Elemento} onValueChange={(v) => setForm({...form, Elemento: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Unknown</SelectItem>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Esencia</Label>
        <Select value={form.Esencia} onValueChange={(v) => setForm({...form, Esencia: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Unknown</SelectItem>
            {ESENCIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Organización</Label>
        <Select value={form.Organización} onValueChange={(v) => setForm({...form, Organización: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Unknown">Sin organización</SelectItem>
            {organizations.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Alignment</Label>
        <Select value={form.alignment} onValueChange={(v) => setForm({...form, alignment: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>{ALIGNMENTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <Label>Estado</Label>
        <Input value={form.Estado} onChange={(e) => setForm({...form, Estado: e.target.value})} />
      </div>
      <div>
        <Label>Campaña</Label>
        <Select value={form.ID_Campaña || 'none'} onValueChange={(v) => setForm({...form, ID_Campaña: v})}>
          <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unknown</SelectItem>
            {campaigns.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-2">
        <Label>Descripción</Label>
        <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
      </div>
      <div className="col-span-2">
        <Label>Historia</Label>
        <Textarea value={form.historia} onChange={(e) => setForm({...form, historia: e.target.value})} rows={3} />
      </div>
      <div className="col-span-2">
        <Label>Apariencia</Label>
        <Textarea value={form.apariencia} onChange={(e) => setForm({...form, apariencia: e.target.value})} rows={3} />
      </div>
      <div className="col-span-2">
        <Label>Personalidad</Label>
        <Textarea value={form.personalidad} onChange={(e) => setForm({...form, personalidad: e.target.value})} rows={3} />
      </div>
      <div className="col-span-2">
        <Button onClick={onSubmit} className="w-full">{isEdit ? 'Guardar Cambios' : 'Crear NPC'}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Characters & NPCs</h1>
        {isMaster && (
          <div className="flex space-x-2">
            <Dialog open={isCharacterDialogOpen} onOpenChange={(open) => { setIsCharacterDialogOpen(open); if (!open) resetCharForm(); }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Character</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Nuevo Personaje</DialogTitle></DialogHeader>
                {charFormJSX(charForm, setCharForm, handleCreateCharacter, false)}
              </DialogContent>
            </Dialog>
            <Dialog open={isNPCDialogOpen} onOpenChange={(open) => { setIsNPCDialogOpen(open); if (!open) resetNpcForm(); }}>
              <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 mr-2" />Add NPC</Button></DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Nuevo NPC</DialogTitle></DialogHeader>
                {npcFormJSX(npcForm, setNpcForm, handleCreateNPC, false)}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Dialog open={!!editingCharacter} onOpenChange={(open) => { if (!open) { setEditingCharacter(null); resetCharForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar Personaje</DialogTitle></DialogHeader>
          {charFormJSX(charForm, setCharForm, handleEditCharacter, true)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingNPC} onOpenChange={(open) => { if (!open) { setEditingNPC(null); resetNpcForm(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Editar NPC</DialogTitle></DialogHeader>
          {npcFormJSX(npcForm, setNpcForm, handleEditNPC, true)}
        </DialogContent>
      </Dialog>

      {/* Character detail (wiki-like) */}
      <Dialog open={!!viewingCharacter} onOpenChange={(open) => { if (!open) { setViewingCharacter(null); setViewingCharacterFull(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {viewingCharacter && (
            <>
              <DialogHeader><DialogTitle className="text-2xl">{viewingCharacter.name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                  <div><span className="font-semibold">Raza:</span> {viewingCharacter.Raza || '—'}</div>
                  <div><span className="font-semibold">Arquetipo:</span> {viewingCharacter.Arquetipo || '—'}</div>
                  <div><span className="font-semibold">Elemento:</span> {viewingCharacter.Elemento || '—'}</div>
                  <div><span className="font-semibold">Esencia:</span> {viewingCharacter.Esencia || '—'}</div>
                  <div><span className="font-semibold">Edad:</span> {viewingCharacter.Edad ?? '—'}</div>
                  <div><span className="font-semibold">Organización:</span> {viewingCharacter.Organización || '—'}</div>
                  <div><span className="font-semibold">Estado:</span> {viewingCharacter.Estado || '—'}</div>
                  {isMaster && viewingCharacter.user_id && (
                    <div><span className="font-semibold">Jugador:</span> {profileLabel(viewingCharacter.user_id)}</div>
                  )}
                </div>
                {viewingCharacterFull ? (
                  <div className="space-y-4">
                    {isMaster && viewingCharacterFull.description && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Descripción (privada del Máster)</h3>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground italic">{viewingCharacterFull.description}</p>
                      </section>
                    )}
                    {viewingCharacterFull.historia && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Historia</h3>
                        <p className="text-sm whitespace-pre-wrap">{viewingCharacterFull.historia}</p>
                      </section>
                    )}
                    {viewingCharacterFull.apariencia && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Apariencia</h3>
                        <p className="text-sm whitespace-pre-wrap">{viewingCharacterFull.apariencia}</p>
                      </section>
                    )}
                    {viewingCharacterFull.personalidad && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Personalidad</h3>
                        <p className="text-sm whitespace-pre-wrap">{viewingCharacterFull.personalidad}</p>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Información ampliada visible solo para el Máster y el jugador asociado.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* NPC detail (wiki-like) */}
      <Dialog open={!!viewingNPC} onOpenChange={(open) => { if (!open) { setViewingNPC(null); setViewingNPCFull(null); } }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {viewingNPC && (
            <>
              <DialogHeader><DialogTitle className="text-2xl">{viewingNPC.name}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm bg-muted/50 p-4 rounded-lg">
                  <div><span className="font-semibold">Raza:</span> {viewingNPC.Raza || '—'}</div>
                  <div><span className="font-semibold">Arquetipo:</span> {viewingNPC.Arquetipo || '—'}</div>
                  <div><span className="font-semibold">Elemento:</span> {viewingNPC.Elemento || '—'}</div>
                  <div><span className="font-semibold">Esencia:</span> {viewingNPC.Esencia || '—'}</div>
                  <div><span className="font-semibold">Edad:</span> {viewingNPC.Edad ?? '—'}</div>
                  <div><span className="font-semibold">Organización:</span> {viewingNPC.Organización || '—'}</div>
                  <div><span className="font-semibold">Alignment:</span> {viewingNPC.alignment || '—'}</div>
                  <div><span className="font-semibold">Estado:</span> {viewingNPC.Estado || '—'}</div>
                </div>
                {viewingNPCFull ? (
                  <div className="space-y-4">
                    {viewingNPCFull.description && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Descripción</h3>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground italic">{viewingNPCFull.description}</p>
                      </section>
                    )}
                    {viewingNPCFull.historia && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Historia</h3>
                        <p className="text-sm whitespace-pre-wrap">{viewingNPCFull.historia}</p>
                      </section>
                    )}
                    {viewingNPCFull.apariencia && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Apariencia</h3>
                        <p className="text-sm whitespace-pre-wrap">{viewingNPCFull.apariencia}</p>
                      </section>
                    )}
                    {viewingNPCFull.personalidad && (
                      <section>
                        <h3 className="font-semibold text-lg mb-1">Personalidad</h3>
                        <p className="text-sm whitespace-pre-wrap">{viewingNPCFull.personalidad}</p>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Información ampliada visible solo para el Máster.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4" />
          <Input placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterArchetype} onValueChange={setFilterArchetype}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Arquetipos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Arquetipos</SelectItem>
            {ARQUETIPOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterElement} onValueChange={setFilterElement}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Elementos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Elementos</SelectItem>
            {ELEMENTOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEssence} onValueChange={setFilterEssence}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Esencias" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Esencias</SelectItem>
            {ESENCIAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Organizaciones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Organizaciones</SelectItem>
            {organizations.map(org => <SelectItem key={org} value={org}>{org}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="characters" className="w-full">
        <TabsList>
          <TabsTrigger value="characters" className="flex items-center space-x-2">
            <User className="w-4 h-4" /><span>Player Characters ({filteredCharacters.length})</span>
          </TabsTrigger>
          <TabsTrigger value="npcs" className="flex items-center space-x-2">
            <Users className="w-4 h-4" /><span>NPCs ({filteredNPCs.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="characters">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character) => (
              <Card key={character.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openCharacterDetail(character)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{character.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEditCharacter(character)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCharacter(character.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Raza:</span> {character.Raza}</p>
                    <p><span className="font-medium">Arquetipo:</span> {character.Arquetipo}</p>
                    <p><span className="font-medium">Elemento:</span> {character.Elemento}</p>
                    <p><span className="font-medium">Esencia:</span> {character.Esencia}</p>
                    <p><span className="font-medium">Edad:</span> {character.Edad}</p>
                    <p><span className="font-medium">Organización:</span> {character.Organización}</p>
                    <p><span className="font-medium">Estado:</span> {character.Estado}</p>
                    {isMaster && character.user_id && (
                      <p className="text-xs text-muted-foreground">Jugador: {profileLabel(character.user_id)}</p>
                    )}
                    {!isMaster && character.user_id === user?.id && (
                      <p className="text-xs text-primary">Tu personaje</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="npcs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNPCs.map((npc) => (
              <Card key={npc.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openNPCDetail(npc)}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{npc.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEditNPC(npc)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNPC(npc.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Raza:</span> {npc.Raza}</p>
                    <p><span className="font-medium">Arquetipo:</span> {npc.Arquetipo}</p>
                    <p><span className="font-medium">Elemento:</span> {npc.Elemento}</p>
                    <p><span className="font-medium">Esencia:</span> {npc.Esencia}</p>
                    <p><span className="font-medium">Edad:</span> {npc.Edad}</p>
                    <p><span className="font-medium">Organización:</span> {npc.Organización}</p>
                    <p><span className="font-medium">Alignment:</span> {npc.alignment}</p>
                    <p><span className="font-medium">Estado:</span> {npc.Estado}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
