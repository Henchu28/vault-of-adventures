import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';

const FICHA_URL = 'https://adventurer-sheet-creator.lovable.app';

export default function Ficha() {
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user || !profile) return;
    const role = profile.role === 'master' ? 'admin' : 'user';
    const params = new URLSearchParams({
      user_id: user.id,
      profile_id: profile.id,
      email: user.email || '',
      role,
    });
    const target = `${FICHA_URL}/?${params.toString()}`;
    window.open(target, '_blank', 'noopener,noreferrer');
  }, [user, profile]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold">Ficha</h1>
      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="text-muted-foreground">
            Se ha abierto la web de Ficha en una nueva pestaña con tus credenciales.
          </p>
          <p className="text-sm text-muted-foreground">
            Si no se abrió automáticamente, haz clic en el botón:
          </p>
          <a
            href={
              user && profile
                ? `${FICHA_URL}/?${new URLSearchParams({
                    user_id: user.id,
                    profile_id: profile.id,
                    email: user.email || '',
                    role: profile.role === 'master' ? 'admin' : 'user',
                  }).toString()}`
                : FICHA_URL
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir Ficha
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
