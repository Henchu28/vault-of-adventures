import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetTrigger, SheetTitle,
} from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Heart, Shield, Plus, Trash2, ChevronLeft, ChevronRight, Save, Swords, BookmarkPlus, Menu, Dice6, Users, FolderPlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

type SavedCreature = { id: string; name: string; hp: number; ac: number; initiative_formula: string; alignment: string };
type CreatureGroup = { id: string; name: string; members: SavedCreature[] };

// ---------- Dice / formula engine ----------
type Roll = { sides: number; value: number };
type TermResult =
  | { kind: 'num'; sign: 1 | -1; value: number }
  | { kind: 'dice'; sign: 1 | -1; count: number; sides: number; rolls: number[] };

function rollDie(sides: number) {
  if (sides < 1) sides = 1;
  return Math.floor(Math.random() * sides) + 1;
}

// Parse "1d20+5+3d4-2" into ordered terms with sign.
function parseFormula(formula: string): { sign: 1 | -1; count: number; sides: number | null; isDice: boolean; literal: number }[] | null {
  const cleaned = formula.replace(/\s+/g, '');
  if (!cleaned) return null;
  // tokens: split keeping + and -
  const tokens: { sign: 1 | -1; body: string }[] = [];
  let i = 0;
  let sign: 1 | -1 = 1;
  while (i < cleaned.length) {
    const ch = cleaned[i];
    if (ch === '+') { sign = 1; i++; continue; }
    if (ch === '-') { sign = -1; i++; continue; }
    let j = i;
    while (j < cleaned.length && cleaned[j] !== '+' && cleaned[j] !== '-') j++;
    tokens.push({ sign, body: cleaned.slice(i, j) });
    i = j;
    sign = 1;
  }
  const terms = [];
  for (const t of tokens) {
    const body = t.body.replace(/[()]/g, '');
    if (!body) continue;
    const m = body.match(/^(\d*)d(\d+)$/i);
    if (m) {
      const count = m[1] ? parseInt(m[1], 10) : 1;
      const sides = parseInt(m[2], 10);
      if (!count || !sides) return null;
      terms.push({ sign: t.sign, count, sides, isDice: true, literal: 0 });
    } else if (/^\d+$/.test(body)) {
      terms.push({ sign: t.sign, count: 0, sides: null as any, isDice: false, literal: parseInt(body, 10) });
    } else {
      return null;
    }
  }
  return terms;
}

function rollFormulaOnce(formula: string): { parts: string[]; total: number } | null {
  const terms = parseFormula(formula);
  if (!terms) return null;
  const parts: string[] = [];
  let total = 0;
  for (const t of terms) {
    if (t.isDice) {
      const rolls: number[] = [];
      for (let k = 0; k < t.count; k++) rolls.push(rollDie(t.sides));
      const sum = rolls.reduce((a, b) => a + b, 0);
      total += t.sign * sum;
      for (const r of rolls) parts.push((t.sign === -1 ? '-' : (parts.length ? '+' : '')) + r);
    } else {
      total += t.sign * t.literal;
      parts.push((t.sign === -1 ? '-' : (parts.length ? '+' : '')) + t.literal);
    }
  }
  return { parts, total };
}

type RollResult = {
  formula: string;
  mode: 'normal' | 'adv' | 'dis';
  rolls: { parts: string[]; total: number }[];
  finalTotal: number;
  finalIndex: number;
};

function rollFormula(formula: string, mode: 'normal' | 'adv' | 'dis'): RollResult | null {
  if (mode === 'normal') {
    const r = rollFormulaOnce(formula);
    if (!r) return null;
    return { formula, mode, rolls: [r], finalTotal: r.total, finalIndex: 0 };
  }
  const a = rollFormulaOnce(formula);
  const b = rollFormulaOnce(formula);
  if (!a || !b) return null;
  const finalIndex = mode === 'adv'
    ? (a.total >= b.total ? 0 : 1)
    : (a.total <= b.total ? 0 : 1);
  return {
    formula,
    mode,
    rolls: [a, b],
    finalTotal: [a, b][finalIndex].total,
    finalIndex,
  };
}

// ---------- Calculator UI ----------
function Calculator({ savedAttacks, onSave, onDelete, onLoad }: {
  savedAttacks: { id: string; name: string; formula: string }[];
  onSave: (name: string, formula: string) => void;
  onDelete: (id: string) => void;
  onLoad: (formula: string) => void;
}) {
  const [formula, setFormula] = useState('');
  const [pendingDx, setPendingDx] = useState(false);
  const [mode, setMode] = useState<'normal' | 'adv' | 'dis'>('normal');
  const [result, setResult] = useState<RollResult | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');

  const append = (s: string) => {
    setResult(null);
    setFormula((f) => f + s);
  };

  const onPress = (key: string) => {
    if (key === 'AC') { setFormula(''); setPendingDx(false); setMode('normal'); setResult(null); return; }
    if (key === 'del') {
      setResult(null);
      setFormula((f) => {
        // remove last die token (d## or d) or single char
        const m = f.match(/d\d*$/i);
        if (m) return f.slice(0, f.length - m[0].length);
        return f.slice(0, -1);
      });
      return;
    }
    if (key === 'enter') {
      if (!formula) return;
      const r = rollFormula(formula, mode);
      if (!r) {
        setResult(null);
        return;
      }
      setResult(r);
      return;
    }
    if (key === 'adv') { setMode((m) => m === 'adv' ? 'normal' : 'adv'); return; }
    if (key === 'dis') { setMode((m) => m === 'dis' ? 'normal' : 'dis'); return; }
    if (key === 'dx') { setPendingDx(true); append('d'); return; }
    if (key === 'd%') { setPendingDx(false); append('d100'); return; }
    if (/^d\d+$/.test(key)) { setPendingDx(false); append(key); return; }
    if (/^\d$/.test(key)) {
      if (pendingDx) setPendingDx(false);
      append(key);
      return;
    }
    // operators
    append(key);
  };

  const keys: { label: string; key: string; variant?: 'special' | 'die' | 'op' | 'num' }[] = [
    { label: 'd%', key: 'd%', variant: 'die' },
    { label: 'dx', key: 'dx', variant: 'die' },
    { label: 'del', key: 'del', variant: 'special' },
    { label: 'AC', key: 'AC', variant: 'special' },
    { label: 'd4', key: 'd4', variant: 'die' },
    { label: 'd6', key: 'd6', variant: 'die' },
    { label: 'd8', key: 'd8', variant: 'die' },
    { label: 'adv', key: 'adv', variant: 'special' },
    { label: 'd10', key: 'd10', variant: 'die' },
    { label: 'd12', key: 'd12', variant: 'die' },
    { label: 'd20', key: 'd20', variant: 'die' },
    { label: 'dis', key: 'dis', variant: 'special' },
    { label: '7', key: '7', variant: 'num' },
    { label: '8', key: '8', variant: 'num' },
    { label: '9', key: '9', variant: 'num' },
    { label: '+', key: '+', variant: 'op' },
    { label: '4', key: '4', variant: 'num' },
    { label: '5', key: '5', variant: 'num' },
    { label: '6', key: '6', variant: 'num' },
    { label: '-', key: '-', variant: 'op' },
    { label: '1', key: '1', variant: 'num' },
    { label: '2', key: '2', variant: 'num' },
    { label: '3', key: '3', variant: 'num' },
  ];

  const renderRoll = (r: RollResult) => {
    if (r.mode === 'normal') {
      const row = r.rolls[0];
      return (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-muted-foreground text-sm">({row.parts.join('').replace(/^\+/, '')})</span>
          <span className="text-3xl font-bold text-accent">{row.total}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col text-sm text-muted-foreground">
          {r.rolls.map((row, i) => (
            <span key={i} className={i === r.finalIndex ? 'text-foreground font-medium' : 'opacity-60'}>
              ({row.parts.join('').replace(/^\+/, '')}) = {row.total}
            </span>
          ))}
        </div>
        <span className="text-3xl font-bold text-accent">{r.finalTotal}</span>
      </div>
    );
  };

  const SavedList = (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Ataques guardados</h3>
      {savedAttacks.length === 0 && <p className="text-xs text-muted-foreground">Sin ataques guardados.</p>}
      <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
        {savedAttacks.map((a) => (
          <div key={a.id} className="flex items-center gap-1 p-2 rounded border border-border bg-card hover:bg-muted/40">
            <button className="flex-1 text-left" onClick={() => { setFormula(a.formula); setResult(null); }}>
              <div className="text-sm font-medium truncate">{a.name}</div>
              <div className="text-xs text-muted-foreground truncate">{a.formula}</div>
            </button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(a.id)}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2"><Dice6 className="w-5 h-5" /> Calculadora</CardTitle>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden gap-1"><Menu className="w-4 h-4" /> Guardados</Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetTitle>Ataques guardados</SheetTitle>
            <div className="mt-4">{SavedList}</div>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-4">
          <aside className="hidden lg:block border-r border-border pr-3">{SavedList}</aside>
          <div className="space-y-3">
            {/* Display */}
            <div className="rounded-md border border-border bg-muted/30 p-3 min-h-[110px]">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {mode !== 'normal' && (
                    <span className="mr-2 px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase">{mode}</span>
                  )}
                  <span className="font-mono">{formula || '\u00A0'}</span>
                </div>
                <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!formula}>
                      <BookmarkPlus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Guardar ataque</DialogTitle></DialogHeader>
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Ej: Espadazo" />
                      <p className="text-xs text-muted-foreground font-mono">{formula}</p>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { if (saveName.trim() && formula) { onSave(saveName.trim(), formula); setSaveName(''); setSaveOpen(false); } }}>Guardar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-2 min-h-[40px]">
                {result && renderRoll(result)}
              </div>
            </div>

            {/* Grid 4x7 (last row has Enter spanning) */}
            <div className="grid grid-cols-4 gap-2">
              {keys.map((k) => (
                <Button
                  key={k.label}
                  variant={
                    k.variant === 'die' ? 'secondary' :
                    k.variant === 'special' ? (k.key === mode ? 'default' : 'outline') :
                    k.variant === 'op' ? 'outline' : 'ghost'
                  }
                  className="h-12 font-mono"
                  onClick={() => onPress(k.key)}
                >
                  {k.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Button variant="default" className="h-12 row-span-2 col-span-1" onClick={() => onPress('enter')}>Enter</Button>
              <Button variant="ghost" className="h-12 font-mono" onClick={() => onPress('0')}>0</Button>
              <Button variant="outline" className="h-12 font-mono" onClick={() => onPress('(')}>(</Button>
              <Button variant="outline" className="h-12 font-mono" onClick={() => onPress(')')}>)</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Combat tracker ----------
type Combatant = {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  initFormula: string;
  alignment: 'friend' | 'enemy';
  initRoll: number | null;
  initBreakdown?: string;
};

function CombatTracker({ savedCreatures, groups, onSaveCreature, onDeleteCreature, onCreateGroup, onDeleteGroup }: {
  savedCreatures: SavedCreature[];
  groups: CreatureGroup[];
  onSaveCreature: (c: { name: string; hp: number; ac: number; initiative_formula: string; alignment: string }) => void;
  onDeleteCreature: (id: string) => void;
  onCreateGroup: (name: string, creatureIds: string[]) => void;
  onDeleteGroup: (id: string) => void;
}) {
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [turnIdx, setTurnIdx] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [hpOpen, setHpOpen] = useState<string | null>(null);
  const [hpSign, setHpSign] = useState<1 | -1>(-1);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPicks, setGroupPicks] = useState<Record<string, boolean>>({});

  const [draft, setDraft] = useState({ name: '', hp: 10, ac: 10, init: '1d20', alignment: 'enemy' as 'enemy' | 'friend', save: false });

  const ordered = combatants;

  const addCombatant = (c: Omit<Combatant, 'id' | 'initRoll' | 'maxHp'> & { hp: number }) => {
    setCombatants((cs) => [...cs, { ...c, id: crypto.randomUUID(), initRoll: null, maxHp: c.hp }]);
  };

  const submitDraft = () => {
    if (!draft.name.trim()) return;
    addCombatant({
      name: draft.name.trim(),
      hp: draft.hp,
      ac: draft.ac,
      initFormula: draft.init,
      alignment: draft.alignment,
    });
    if (draft.save) {
      onSaveCreature({
        name: draft.name.trim(), hp: draft.hp, ac: draft.ac,
        initiative_formula: draft.init, alignment: draft.alignment,
      });
    }
    setDraft({ name: '', hp: 10, ac: 10, init: '1d20', alignment: 'enemy', save: false });
    setAddOpen(false);
  };

  const buildUniqueName = (existing: { name: string }[], baseName: string) => {
    const sameName = existing.filter((c) => c.name === baseName || c.name.startsWith(baseName + ' '));
    return sameName.length === 0 ? baseName : `${baseName} ${sameName.length + 1}`;
  };

  const addFromSaved = (s: SavedCreature) => {
    setCombatants((cs) => {
      const finalName = buildUniqueName(cs, s.name);
      return [...cs, {
        id: crypto.randomUUID(), name: finalName, hp: s.hp, maxHp: s.hp, ac: s.ac,
        initFormula: s.initiative_formula,
        alignment: (s.alignment === 'friend' ? 'friend' : 'enemy'),
        initRoll: null,
      }];
    });
  };

  const addGroup = (g: CreatureGroup) => {
    setCombatants((cs) => {
      const next = [...cs];
      for (const s of g.members) {
        const finalName = buildUniqueName(next, s.name);
        next.push({
          id: crypto.randomUUID(), name: finalName, hp: s.hp, maxHp: s.hp, ac: s.ac,
          initFormula: s.initiative_formula,
          alignment: (s.alignment === 'friend' ? 'friend' : 'enemy'),
          initRoll: null,
        });
      }
      return next;
    });
  };

  const rollAllInitiative = () => {
    const rolled = combatants.map((c) => {
      const r = rollFormula(c.initFormula, 'normal');
      return {
        ...c,
        initRoll: r ? r.finalTotal : 0,
        initBreakdown: r ? r.rolls[0].parts.join('').replace(/^\+/, '') : '?',
      };
    });
    rolled.sort((a, b) => (b.initRoll ?? 0) - (a.initRoll ?? 0));
    setCombatants(rolled);
    setTurnIdx(0);
  };

  const adjustHp = (id: string, delta: number) => {
    setCombatants((cs) => cs.map((c) => c.id === id ? { ...c, hp: Math.max(0, c.hp + delta) } : c));
  };

  const removeCombatant = (id: string) => {
    setCombatants((cs) => cs.filter((c) => c.id !== id));
  };

  const nextTurn = () => setTurnIdx((i) => (combatants.length ? (i + 1) % combatants.length : 0));
  const prevTurn = () => setTurnIdx((i) => (combatants.length ? (i - 1 + combatants.length) % combatants.length : 0));

  const hpDeltas = [1, 2, 3, 5, 10];
  const activeHpCombatant = combatants.find((c) => c.id === hpOpen) ?? null;

  const SavedCreaturesList = (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Grupos</h3>
          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={() => { setGroupPicks({}); setGroupName(''); setGroupOpen(true); }} disabled={savedCreatures.length === 0}>
            <FolderPlus className="w-3.5 h-3.5" /> Nuevo
          </Button>
        </div>
        {groups.length === 0 && <p className="text-xs text-muted-foreground">Sin grupos.</p>}
        <div className="space-y-1 max-h-[30vh] overflow-y-auto pr-1">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center gap-1 p-2 rounded border border-border bg-card hover:bg-muted/40">
              <button className="flex-1 text-left" onClick={() => addGroup(g)}>
                <div className="text-sm font-medium truncate flex items-center gap-1"><Users className="w-3 h-3" /> {g.name}</div>
                <div className="text-xs text-muted-foreground truncate">{g.members.map(m => m.name).join(', ') || 'Vacío'}</div>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDeleteGroup(g.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-sm flex items-center gap-2"><Save className="w-4 h-4" /> Criaturas guardadas</h3>
        {savedCreatures.length === 0 && <p className="text-xs text-muted-foreground">Sin criaturas guardadas.</p>}
        <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
          {savedCreatures.map((s) => (
            <div key={s.id} className="flex items-center gap-1 p-2 rounded border border-border bg-card hover:bg-muted/40">
              <button className="flex-1 text-left" onClick={() => addFromSaved(s)}>
                <div className="text-sm font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">HP {s.hp} · AC {s.ac} · {s.initiative_formula}</div>
              </button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDeleteCreature(s.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2"><Swords className="w-5 h-5" /> Combate</CardTitle>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden gap-1"><Menu className="w-4 h-4" /> Criaturas</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle>Criaturas guardadas</SheetTitle>
            <div className="mt-4">{SavedCreaturesList}</div>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> Añadir</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Añadir personaje / criatura</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Nombre</Label>
                      <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Vida</Label>
                      <Input type="number" value={draft.hp} onChange={(e) => setDraft({ ...draft, hp: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Armadura</Label>
                      <Input type="number" value={draft.ac} onChange={(e) => setDraft({ ...draft, ac: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Iniciativa</Label>
                      <Input value={draft.init} onChange={(e) => setDraft({ ...draft, init: e.target.value })} placeholder="1d20+3" />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Select value={draft.alignment} onValueChange={(v) => setDraft({ ...draft, alignment: v as any })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="friend">Amigo (verde)</SelectItem>
                          <SelectItem value="enemy">Enemigo (rojo)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="col-span-2 flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={draft.save} onChange={(e) => setDraft({ ...draft, save: e.target.checked })} />
                      Guardar como criatura reutilizable
                    </label>
                  </div>
                  <DialogFooter>
                    <Button onClick={submitDraft}>Añadir</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button size="sm" variant="outline" onClick={prevTurn} disabled={!combatants.length}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" onClick={nextTurn} disabled={!combatants.length}><ChevronRight className="w-4 h-4" /></Button>
              <Button size="sm" variant="secondary" onClick={rollAllInitiative} disabled={!combatants.length}>
                Tirar iniciativa
              </Button>
            </div>

            <div className="space-y-2">
              {ordered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No hay combatientes. Añade personajes o criaturas.
                </p>
              )}
              {ordered.map((c, i) => {
                const isTurn = i === turnIdx && c.initRoll !== null;
                const borderWidth = isTurn ? 'border-l-8 border-r-8' : 'border-l-4 border-r-4';
                const color = c.alignment === 'friend' ? 'border-l-green-500 border-r-green-500' : 'border-l-red-500 border-r-red-500';
                return (
                  <div
                    key={c.id}
                    onClick={() => { setHpOpen(c.id); setHpSign(-1); }}
                    className={`cursor-pointer flex items-center justify-between gap-3 p-3 rounded bg-card hover:bg-muted/30 transition-all ${borderWidth} ${color}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      {c.initRoll !== null && (
                        <div className="text-xs text-muted-foreground">
                          Iniciativa: <span className="opacity-70">({c.initBreakdown})</span> <span className="font-medium text-foreground">{c.initRoll}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Heart className="w-9 h-9 text-red-500 fill-red-500/20" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{c.hp}</span>
                      </div>
                      <div className="relative">
                        <Shield className="w-9 h-9 text-blue-500 fill-blue-500/20" />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{c.ac}</span>
                      </div>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); removeCombatant(c.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <aside className="hidden lg:block border-l border-border pl-3">{SavedCreaturesList}</aside>
        </div>

        <Dialog open={!!hpOpen} onOpenChange={(o) => !o && setHpOpen(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>{activeHpCombatant?.name}</DialogTitle></DialogHeader>
            {activeHpCombatant && (
              <div className="relative aspect-square flex items-center justify-center">
                {/* center HP */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative">
                    <Heart className="w-24 h-24 text-red-500 fill-red-500/20" />
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold">{activeHpCombatant.hp}</span>
                  </div>
                </div>
                {/* surrounding buttons */}
                {(() => {
                  const items = [
                    { label: '1', delta: 1 },
                    { label: '2', delta: 2 },
                    { label: '3', delta: 3 },
                    { label: '5', delta: 5 },
                    { label: '10', delta: 10 },
                    { label: '+', isSign: true, sign: 1 as 1 },
                    { label: '-', isSign: true, sign: -1 as -1 },
                  ];
                  return items.map((it, i) => {
                    const angle = (i / items.length) * Math.PI * 2 - Math.PI / 2;
                    const radius = 110;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if ((it as any).isSign) {
                      const sign = (it as any).sign as 1 | -1;
                      return (
                        <Button
                          key={it.label}
                          size="icon"
                          variant={hpSign === sign ? 'default' : 'outline'}
                          className="absolute h-11 w-11 rounded-full text-lg"
                          style={{ transform: `translate(${x}px, ${y}px)` }}
                          onClick={() => setHpSign(sign)}
                        >
                          {it.label}
                        </Button>
                      );
                    }
                    return (
                      <Button
                        key={it.label}
                        size="icon"
                        variant="secondary"
                        className="absolute h-11 w-11 rounded-full text-sm"
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                        onClick={() => adjustHp(activeHpCombatant.id, hpSign * (it as any).delta)}
                      >
                        {hpSign === 1 ? '+' : '−'}{it.label}
                      </Button>
                    );
                  });
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ---------- Page ----------
export default function Combat() {
  const { user, isMaster, loading } = useAuth();
  const { toast } = useToast();
  const [savedAttacks, setSavedAttacks] = useState<{ id: string; name: string; formula: string }[]>([]);
  const [savedCreatures, setSavedCreatures] = useState<{ id: string; name: string; hp: number; ac: number; initiative_formula: string; alignment: string }[]>([]);

  const sb = supabase as any;

  const loadAll = async () => {
    if (!user) return;
    const [a, c] = await Promise.all([
      sb.from('saved_attacks').select('*').order('name'),
      sb.from('saved_creatures').select('*').order('name'),
    ]);
    if (!a.error) setSavedAttacks(a.data || []);
    if (!c.error) setSavedCreatures(c.data || []);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [user?.id]);

  if (loading) return null;
  if (!isMaster) return <div className="text-center py-12 text-muted-foreground">Solo el Máster puede ver Combat.</div>;

  const saveAttack = async (name: string, formula: string) => {
    const { error } = await sb.from('saved_attacks').insert({ user_id: user!.id, name, formula });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else loadAll();
  };
  const deleteAttack = async (id: string) => {
    await sb.from('saved_attacks').delete().eq('id', id);
    loadAll();
  };
  const saveCreature = async (c: { name: string; hp: number; ac: number; initiative_formula: string; alignment: string }) => {
    const { error } = await sb.from('saved_creatures').insert({ user_id: user!.id, ...c });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else loadAll();
  };
  const deleteCreature = async (id: string) => {
    await sb.from('saved_creatures').delete().eq('id', id);
    loadAll();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Combat</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Calculator
          savedAttacks={savedAttacks}
          onSave={saveAttack}
          onDelete={deleteAttack}
          onLoad={() => {}}
        />
        <CombatTracker
          savedCreatures={savedCreatures}
          onSaveCreature={saveCreature}
          onDeleteCreature={deleteCreature}
        />
      </div>
    </div>
  );
}
