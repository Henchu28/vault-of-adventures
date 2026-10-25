import { useState, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const PRESETS = ['#a32c3d', '#2c8a4f', '#2c5fa3', '#7d2ca3', '#a3702c', '#1f1f1f', '#d946ef'];

export default function Settings() {
  const { themeColor, setThemeColor } = useTheme();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [savingCharName, setSavingCharName] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
  }, [profile?.display_name]);

  useEffect(() => {
    setCharacterName(profile?.character_name || '');
  }, [profile?.character_name]);

  const handleSaveCharacterName = async () => {
    if (!user) return;
    setSavingCharName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ character_name: characterName.trim() || null })
      .eq('user_id', user.id);
    setSavingCharName(false);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el nombre de personaje', variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'Nombre de personaje actualizado. Recarga para verlo en todas partes.' });
    }
  };

  const handleSaveName = async () => {
    if (!user || !displayName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('user_id', user.id);
    setSavingName(false);
    if (error) {
      toast({ title: 'Error', description: 'No se pudo actualizar el nombre', variant: 'destructive' });
    } else {
      toast({ title: '¡Éxito!', description: 'Nombre actualizado. Recarga para verlo en todas partes.' });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nombre de Personaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="character-name">Nombre de Personaje</Label>
          <Input
            id="character-name"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="El nombre de tu personaje"
          />
          <Button onClick={handleSaveCharacterName} disabled={savingCharName || characterName.trim() === (profile?.character_name || '')}>
            {savingCharName ? 'Guardando...' : 'Guardar nombre de personaje'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nombre de Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre visible"
          />
          <Button onClick={handleSaveName} disabled={savingName || !displayName.trim() || displayName === profile?.display_name}>
            {savingName ? 'Guardando...' : 'Guardar nombre'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paleta de Color</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="mb-2 block text-muted-foreground">Selecciona un color HEX personalizado</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-16 h-12 rounded cursor-pointer border border-border"
              />
              <Input
                value={themeColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setThemeColor(v);
                }}
                placeholder="#a32c3d"
                className="font-mono max-w-[140px]"
              />
            </div>
          </div>
          <div>
            <Label className="mb-2 block text-muted-foreground">Presets rápidos</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((hex) => (
                <button
                  key={hex}
                  onClick={() => setThemeColor(hex)}
                  className="w-10 h-10 rounded-full border-2 border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: hex }}
                  title={hex}
                  aria-label={`Color ${hex}`}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
