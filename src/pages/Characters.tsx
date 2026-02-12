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

interface Character {
  name: string;
  race: string;
  class: string;
  age: number;
  height: number;
  birthdate: string;
  status: string;
  story: string;
  advantages: string;
  disadvantages: string;
  power1: string;
  power2: string;
  campaign_id: number;
}

interface NPC {
  name: string;
  race: string;
  class: string;
  age: number;
  height: number;
  birthdate: string;
  status: string;
  alignment: string;
  campaign_id: number;
}

export default function Characters() {
  const { isMaster } = useAuth();
  const { toast } = useToast();
  
  const [characters, setCharacters] = useState<Character[]>([]);
  const [npcs, setNPCs] = useState<NPC[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArchetype, setFilterArchetype] = useState('all');
  const [filterElement, setFilterElement] = useState('all');
  const [filterEssence, setFilterEssence] = useState('all');
  const [filterOrg, setFilterOrg] = useState('all');
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [isNPCDialogOpen, setIsNPCDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [charactersResult, npcsResult, orgsResult] = await Promise.all([
      supabase.from('characters').select('*'),
      supabase.from('npcs').select('*'),
      supabase.from('organizations').select('org_name')
    ]);

    if (charactersResult.data) setCharacters(charactersResult.data);
    if (npcsResult.data) setNPCs(npcsResult.data);
    if (orgsResult.data) setOrganizations(orgsResult.data.map(o => o.org_name));
    
    setLoading(false);
  };

  const handleDeleteCharacter = async (character: Character) => {
    if (!isMaster) return;
    
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('name', character.name);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete character",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Character deleted successfully",
      });
      fetchData();
    }
  };

  const handleDeleteNPC = async (npc: NPC) => {
    if (!isMaster) return;
    
    const { error } = await supabase
      .from('npcs')
      .delete()
      .eq('name', npc.name);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete NPC",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "NPC deleted successfully",
      });
      fetchData();
    }
  };

  const filteredCharacters = characters
    .filter(char => 
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterArchetype === 'all' || char.class === filterArchetype) &&
      (filterElement === 'all' || char.race === filterElement) &&
      (filterEssence === 'all' || char.power1 === filterEssence) &&
      (filterOrg === 'all' || char.advantages === filterOrg)
    );

  const filteredNPCs = npcs
    .filter(npc => 
      npc.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterArchetype === 'all' || npc.class === filterArchetype) &&
      (filterElement === 'all' || npc.race === filterElement) &&
      (filterEssence === 'all' || npc.alignment === filterEssence)
    );

  if (loading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading characters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Characters & NPCs</h1>
        {isMaster && (
          <div className="flex space-x-2">
            <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Character
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Character</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">Character form would go here</div>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isNPCDialogOpen} onOpenChange={setIsNPCDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add NPC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New NPC</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">NPC form would go here</div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg">
        <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterArchetype} onValueChange={setFilterArchetype}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Arquetipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Arquetipos</SelectItem>
            <SelectItem value="Emisor">Emisor</SelectItem>
            <SelectItem value="Modulador">Modulador</SelectItem>
            <SelectItem value="Canalizador">Canalizador</SelectItem>
            <SelectItem value="Invocador">Invocador</SelectItem>
            <SelectItem value="Focalizador">Focalizador</SelectItem>
            <SelectItem value="Compuesto">Compuesto</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterElement} onValueChange={setFilterElement}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Elemento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Elementos</SelectItem>
            <SelectItem value="Fuego">Fuego</SelectItem>
            <SelectItem value="Hielo">Hielo</SelectItem>
            <SelectItem value="Tierra">Tierra</SelectItem>
            <SelectItem value="Planta">Planta</SelectItem>
            <SelectItem value="Luz">Luz</SelectItem>
            <SelectItem value="Oscuridad">Oscuridad</SelectItem>
            <SelectItem value="Viento">Viento</SelectItem>
            <SelectItem value="Electricidad">Electricidad</SelectItem>
            <SelectItem value="Espiritual">Espiritual</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterEssence} onValueChange={setFilterEssence}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Esencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Esencias</SelectItem>
            <SelectItem value="Nominancia">Nominancia</SelectItem>
            <SelectItem value="Transmutación">Transmutación</SelectItem>
            <SelectItem value="Distorsión">Distorsión</SelectItem>
            <SelectItem value="Cronomancia">Cronomancia</SelectItem>
            <SelectItem value="Dimensiología">Dimensiología</SelectItem>
            <SelectItem value="Sincronimia">Sincronimia</SelectItem>
            <SelectItem value="Emblemancia">Emblemancia</SelectItem>
            <SelectItem value="Vacío">Vacío</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterOrg} onValueChange={setFilterOrg}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Organización" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las Organizaciones</SelectItem>
            {organizations.map(org => (
              <SelectItem key={org} value={org}>{org}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="characters" className="w-full">
        <TabsList>
          <TabsTrigger value="characters" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Player Characters ({filteredCharacters.length})</span>
          </TabsTrigger>
          <TabsTrigger value="npcs" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>NPCs ({filteredNPCs.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="characters">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCharacters.map((character, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{character.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCharacter(character)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCharacter(character)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Race:</span> {character.race}</p>
                    <p><span className="font-medium">Class:</span> {character.class}</p>
                    <p><span className="font-medium">Age:</span> {character.age}</p>
                    <p><span className="font-medium">Status:</span> {character.status}</p>
                    {character.story && (
                      <p className="text-muted-foreground text-xs mt-2">
                        {character.story.substring(0, 100)}...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="npcs">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNPCs.map((npc, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{npc.name}</span>
                    {isMaster && (
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingNPC(npc)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNPC(npc)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Race:</span> {npc.race}</p>
                    <p><span className="font-medium">Class:</span> {npc.class}</p>
                    <p><span className="font-medium">Age:</span> {npc.age}</p>
                    <p><span className="font-medium">Alignment:</span> {npc.alignment}</p>
                    <p><span className="font-medium">Status:</span> {npc.status}</p>
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