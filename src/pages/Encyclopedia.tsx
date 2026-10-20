import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { BookMarked, Download, FileText, Trash2, Upload } from 'lucide-react';

type EncFile = { name: string; size: number; created: string };
const BUCKET = 'encyclopedia';

export default function Encyclopedia() {
  const { isMaster } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<EncFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
    if (error) toast({ title: 'No se pudieron cargar los archivos', description: error.message, variant: 'destructive' });
    setFiles((data || []).filter(f => f.id && f.name !== '.emptyFolderPlaceholder').map(f => ({ name: f.name, size: (f.metadata as any)?.size || 0, created: f.created_at || '' })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    for (const file of Array.from(list)) {
      const { error } = await supabase.storage.from(BUCKET).upload(file.name, file, { upsert: true });
      if (error) toast({ title: `Error subiendo ${file.name}`, description: error.message, variant: 'destructive' });
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
    void load();
  };

  const open = async (name: string) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(name, 3600);
    if (error || !data) { toast({ title: 'No se pudo abrir', variant: 'destructive' }); return; }
    window.open(data.signedUrl, '_blank', 'noopener');
  };

  const remove = async (name: string) => {
    if (!window.confirm(`¿Eliminar ${name}?`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([name]);
    if (error) toast({ title: 'No se pudo eliminar', variant: 'destructive' });
    else void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold flex items-center gap-2"><BookMarked className="h-8 w-8 text-primary" />Enciclopedia</h1>
        {isMaster && <>
          <input ref={inputRef} type="file" multiple hidden onChange={e => upload(e.target.files)} />
          <Button onClick={() => inputRef.current?.click()} disabled={uploading}><Upload className="mr-2 h-4 w-4" />{uploading ? 'Subiendo…' : 'Subir archivos'}</Button>
        </>}
      </div>
      {loading ? <p className="text-muted-foreground">Cargando…</p> : files.length === 0 ? <p className="text-muted-foreground">Todavía no hay archivos.</p> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map(f => <Card key={f.name}><CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <button className="min-w-0 flex-1 text-left" onClick={() => open(f.name)}>
              <p className="truncate font-medium">{f.name}</p>
              <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</p>
            </button>
            <Button size="icon" variant="ghost" aria-label={`Abrir ${f.name}`} onClick={() => open(f.name)}><Download className="h-4 w-4" /></Button>
            {isMaster && <Button size="icon" variant="ghost" aria-label={`Eliminar ${f.name}`} onClick={() => remove(f.name)}><Trash2 className="h-4 w-4" /></Button>}
          </CardContent></Card>)}
        </div>}
    </div>
  );
}
