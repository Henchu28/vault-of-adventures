import { useAppSync } from '@/hooks/useAppSync';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
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
import { CONTINENTS, UNKNOWN_LOCATION, mapLocation, regionsForContinent } from '@/lib/map-geography';

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
  continent: number | null;
  region: number | null;
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
  continent: number | null;
  region: number | null;
  alignment: string;
}

interface NPCFull extends NPCPublic {
  known_by: string[] | null;
  description: string | null;
  historia: string | null;
  apariencia: string | null;
  personalidad: string | null;
}

interface ProfileLite { user_id: string; display_name: string | null; role: 'master' | 'player'; character_name: string | null; }

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
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', continent: UNKNOWN_LOCATION, region: UNKNOWN_LOCATION,
    description: '', historia: '', apariencia: '', personalidad: '',
    user_id: '' as string,
  };
  const defaultNpcForm = {
    name: '', Raza: '', Arquetipo: '', Elemento: 'Unknown', Esencia: 'Unknown',
    Organización: 'Unknown', Edad: 0, Estado: 'Unknown', continent: UNKNOWN_LOCATION, region: UNKNOWN_LOCATION,
    alignment: 'Unknown', description: '', historia: '', apariencia: '', personalidad: '',
    known_by: [] as string[],
  };

  const [charForm, setCharForm] = useState(defaultCharForm);
  const [npcForm, setNpcForm] = useState(defaultNpcForm);

  useEffect(() => { fetchData(); }, [isMaster]);
  useAppSync(['characters', 'npcs'], () => fetchData());

  const fetchData = async () => {
    setLoading(true);
    const [charsRes, npcsRes, orgsRes, profilesRes] = await Promise.all([
      supabase.rpc('get_characters_public'),
      supabase.rpc('get_npcs_public'),
      supabase.from('organizations').select('org_name'),
      isMaster ? supabase.from('profiles').select('user_id, display_name, role, character_name') : Promise.resolve({ data: [] as ProfileLite[] }),
    ]);
    if (charsRes.data) setCharacters(charsRes.data as CharacterPublic[]);
    if (npcsRes.data) setNPCs(npcsRes.data as NPCPublic[]);
    if (orgsRes.data) setOrganizations(orgsRes.data.map((o: any) => o.org_name));
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
    ...mapLocation(charForm.continent, charForm.region),
    ID_Campaña: null,
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
    ...mapLocation(npcForm.continent, npcForm.region),
    ID_Campaña: null,
    alignment: npcForm.alignment || 'Unknown',
    description: npcForm.description || '',
    historia: npcForm.historia || '',
    apariencia: npcForm.apariencia || '',
    personalidad: npcForm.personalidad || '',
    known_by: npcForm.known_by,
  });

  const handleCreateCharacter = async () => {
    if (!charForm.name.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return; }
    const { error } = await supabase.from('characters').insert(buildCharPayload());
    if (error) toast({ title: "Error", description: `No se pudo crear el personaje: ${error.message}`, variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Personaje creado" }); resetCharForm(); setIsCharacterDialogOpen(false); fetchData(); }
  };

  const handleEditCharacter = async () => {
    if (!editingCharacter || !charForm.name.trim()) return;
    const { error } = await supabase.from('characters').update(buildCharPayload()).eq('id', editingCharacter.id);
    if (error) toast({ title: "Error", description: `No se pudo actualizar: ${error.message}`, variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "Personaje actualizado" }); resetCharForm(); setEditingCharacter(null); fetchData(); }
  };

  const handleCreateNPC = async () => {
    if (!npcForm.name.trim()) { toast({ title: "Error", description: "El nombre es obligatorio", variant: "destructive" }); return; }
    const { error } = await supabase.from('npcs').insert(buildNpcPayload());
    if (error) toast({ title: "Error", description: `No se pudo crear el NPC: ${error.message}`, variant: "destructive" });
    else { toast({ title: "¡Éxito!", description: "NPC creado" }); resetNpcForm(); setIsNPCDialogOpen(false); fetchData(); }
  };

  const handleEditNPC = async () => {
    if (!editingNPC || !npcForm.name.trim()) return;
    const { error } = await supabase.from('npcs').update(buildNpcPayload()).eq('id', editingNPC.id);
    if (error) toast({ title: "Error", description: `No se pudo actualizar: ${error.message}`, variant: "destructive" });
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
      Estado: c.Estado || 'Unknown', continent: c.continent ? String(c.continent) : UNKNOWN_LOCATION,
      region: c.region ? String(c.region) : UNKNOWN_LOCATION,
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
      Estado: n.Estado || 'Unknown', continent: n.continent ? String(n.continent) : UNKNOWN_LOCATION,
      region: n.region ? String(n.region) : UNKNOWN_LOCATION,
      alignment: n.alignment || 'Unknown',
      description: n.description || '', historia: n.historia || '',
      apariencia: n.apariencia || '', personalidad: n.personalidad || '',
      known_by: n.known_by || [],
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
    return p?.character_name || p?.display_name || uid.slice(0, 8);
  };

  const charFormJSX = (form: typeof defaultCharForm, setForm: (f: typeof defaultCharForm) => void, onSubmit: () => void, isEdit: boolean) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="sm:col-span-2">
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
        <Label htmlFor="char-continent">Continente</Label>
        <Select value={form.continent} onValueChange={(continent) => setForm({...form, continent, region: UNKNOWN_LOCATION})}>
          <SelectTrigger id="char-continent"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN_LOCATION}>Unknown</SelectItem>
            {CONTINENTS.map(c => <SelectItem key={c} value={String(c)}>Continente {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="char-region">Región</Label>
        <Select value={form.region} disabled={form.continent === UNKNOWN_LOCATION} onValueChange={(region) => setForm({...form, region})}>
          <SelectTrigger id="char-region"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN_LOCATION}>Unknown</SelectItem>
            {regionsForContinent(form.continent).map(r => <SelectItem key={r} value={String(r)}>Región {r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Jugador asociado</Label>
        <Select value={form.user_id || 'none'} onValueChange={(v) => setForm({...form, user_id: v === 'none' ? '' : v})}>
          <SelectTrigger><SelectValue placeholder="Sin jugador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin jugador</SelectItem>
            {profiles.filter(p => p.role === 'player').map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.character_name || `${p.display_name || p.user_id.slice(0, 8)} (sin nombre de personaje)`}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Descripción (privada, solo Máster)</Label>
        <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Label>Historia</Label>
        <Textarea value={form.historia} onChange={(e) => setForm({...form, historia: e.target.value})} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Label>Apariencia</Label>
        <Textarea value={form.apariencia} onChange={(e) => setForm({...form, apariencia: e.target.value})} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Label>Personalidad</Label>
        <Textarea value={form.personalidad} onChange={(e) => setForm({...form, personalidad: e.target.value})} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Button onClick={onSubmit} className="w-full">{isEdit ? 'Guardar Cambios' : 'Crear Personaje'}</Button>
      </div>
    </div>
  );

  const npcFormJSX = (form: typeof defaultNpcForm, setForm: (f: typeof defaultNpcForm) => void, onSubmit: () => void, isEdit: boolean) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="sm:col-span-2">
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
        <Label htmlFor="npc-continent">Continente</Label>
        <Select value={form.continent} onValueChange={(continent) => setForm({...form, continent, region: UNKNOWN_LOCATION})}>
          <SelectTrigger id="npc-continent"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN_LOCATION}>Unknown</SelectItem>
            {CONTINENTS.map(c => <SelectItem key={c} value={String(c)}>Continente {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="npc-region">Región</Label>
        <Select value={form.region} disabled={form.continent === UNKNOWN_LOCATION} onValueChange={(region) => setForm({...form, region})}>
          <SelectTrigger id="npc-region"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN_LOCATION}>Unknown</SelectItem>
            {regionsForContinent(form.continent).map(r => <SelectItem key={r} value={String(r)}>Región {r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Conocido por</Label>
        <div className="space-y-1 rounded-md border p-2 max-h-40 overflow-y-auto">
          {profiles.filter(p => p.role === 'player').map(p => (
            <label key={p.user_id} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={form.known_by.includes(p.user_id)}
                onCheckedChange={(checked) => setForm({
                  ...form,
                  known_by: checked ? [...form.known_by, p.user_id] : form.known_by.filter(id => id !== p.user_id),
                })}
              />
              {p.character_name || `${p.display_name || p.user_id.slice(0, 8)} (sin nombre de personaje)`}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">Solo estos personajes verán a este NPC.</p>
      </div>
      <div className="sm:col-span-2">
        <Label>Descripción</Label>
        <Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Label>Historia</Label>
        <Textarea value={form.historia} onChange={(e) => setForm({...form, historia: e.target.value})} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Label>Apariencia</Label>
        <Textarea value={form.apariencia} onChange={(e) => setForm({...form, apariencia: e.target.value})} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Label>Personalidad</Label>
        <Textarea value={form.personalidad} onChange={(e) => setForm({...form, personalidad: e.target.value})} rows={3} />
      </div>
      <div className="sm:col-span-2">
        <Button onClick={onSubmit} className="w-full">{isEdit ? 'Guardar Cambios' : 'Crear NPC'}</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Characters & NPCs</h1>
        {isMaster && (
          <div className="flex flex-wrap gap-2">
            <Dialog open={isCharacterDialogOpen} onOpenChange={(open) => { setIsCharacterDialogOpen(open); if (!open) resetCharForm(); }}>
              <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Character</Button></DialogTrigger>
              <DialogContent className="max-w-2xl w-[calc(100%-1rem)] p-4 sm:p-6">
                <DialogHeader><DialogTitle>Nuevo Personaje</DialogTitle></DialogHeader>
                {charFormJSX(charForm, setCharForm, handleCreateCharacter, false)}
              </DialogContent>
            </Dialog>
            <Dialog open={isNPCDialogOpen} onOpenChange={(open) => { setIsNPCDialogOpen(open); if (!open) resetNpcForm(); }}>
              <DialogTrigger asChild><Button variant="outline"><Plus className="w-4 h-4 mr-2" />Add NPC</Button></DialogTrigger>
              <DialogContent className="max-w-2xl w-[calc(100%-1rem)] p-4 sm:p-6">
                <DialogHeader><DialogTitle>Nuevo NPC</DialogTitle></DialogHeader>
                {npcFormJSX(npcForm, setNpcForm, handleCreateNPC, false)}
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <Dialog open={!!editingCharacter} onOpenChange={(open) => { if (!open) { setEditingCharacter(null); resetCharForm(); } }}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] p-4 sm:p-6">
          <DialogHeader><DialogTitle>Editar Personaje</DialogTitle></DialogHeader>
          {charFormJSX(charForm, setCharForm, handleEditCharacter, true)}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingNPC} onOpenChange={(open) => { if (!open) { setEditingNPC(null); resetNpcForm(); } }}>
        <DialogContent className="max-w-2xl w-[calc(100%-1rem)] p-4 sm:p-6">
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
                  <div><span className="font-semibold">Continente:</span> {viewingCharacter.continent ? `Continente ${viewingCharacter.continent}` : 'Unknown'}</div>
                  <div><span className="font-semibold">Región:</span> {viewingCharacter.region ? `Región ${viewingCharacter.region}` : 'Unknown'}</div>
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
                  <div><span className="font-semibold">Continente:</span> {viewingNPC.continent ? `Continente ${viewingNPC.continent}` : 'Unknown'}</div>
                  <div><span className="font-semibold">Región:</span> {viewingNPC.region ? `Región ${viewingNPC.region}` : 'Unknown'}</div>
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {filteredCharacters.map((character) => (
              <Card key={character.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openCharacterDetail(character)}>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-1 text-base sm:text-2xl break-words">
                    <span>{character.name}</span>
                    {isMaster && (
                      <div className="flex" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEditCharacter(character)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCharacter(character.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <p><span className="font-medium">Raza:</span> {character.Raza}</p>
                    <p><span className="font-medium">Organización:</span> {character.Organización}</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
            {filteredNPCs.map((npc) => (
              <Card key={npc.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => openNPCDetail(npc)}>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-1 text-base sm:text-2xl break-words">
                    <span>{npc.name}</span>
                    {isMaster && (
                      <div className="flex" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => openEditNPC(npc)}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNPC(npc.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <p><span className="font-medium">Raza:</span> {npc.Raza}</p>
                    <p><span className="font-medium">Organización:</span> {npc.Organización}</p>
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
