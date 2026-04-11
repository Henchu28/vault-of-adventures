import { useTheme, ThemeColor } from '@/hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const colorOptions: { value: ThemeColor; label: string; preview: string }[] = [
  { value: 'red', label: 'Rojo (Sangre de Dragón)', preview: 'bg-red-700' },
  { value: 'green', label: 'Verde (Bosque Élfico)', preview: 'bg-green-700' },
  { value: 'blue', label: 'Azul (Mar Profundo)', preview: 'bg-blue-700' },
  { value: 'purple', label: 'Púrpura (Magia Arcana)', preview: 'bg-purple-700' },
  { value: 'amber', label: 'Ámbar (Tesoro Antiguo)', preview: 'bg-amber-700' },
];

export default function Settings() {
  const { themeColor, setThemeColor } = useTheme();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle>Paleta de Color</CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="mb-4 block text-muted-foreground">
            Elige el color principal de la interfaz
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {colorOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setThemeColor(option.value)}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                  themeColor === option.value
                    ? 'border-primary bg-primary/10 shadow-md'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                )}
              >
                <div className={cn('w-8 h-8 rounded-full shrink-0', option.preview)} />
                <span className="font-medium text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
