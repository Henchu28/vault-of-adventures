import { useCallback, useEffect, useRef, useState } from "react";
import { sheetDb as supabase } from "@/lib/sheet/db";
import { supabase as appClient } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAppSync } from "@/hooks/useAppSync";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type Props = { characterId: string; isOwner: boolean; defaultOpen?: boolean };

/** Single "power idea" note per sheet: hidden until the + is pressed; saving it notifies the masters. */
export function PowerIdeaDialog({ characterId, isOwner, defaultOpen = false }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const savedRef = useRef("");

  // keepEdits: a live refresh must not overwrite what the player is typing.
  const load = useCallback(async (keepEdits: boolean) => {
    const { data, error } = await supabase
      .from("sheet_power_ideas")
      .select("content")
      .eq("character_id", characterId)
      .maybeSingle();
    if (error) { toast.error("No se pudo cargar la idea de poder: " + error.message); return; }
    const content = (data?.content as string | undefined) ?? "";
    const previous = savedRef.current;
    savedRef.current = content;
    setSaved(content);
    setDraft((current) => (keepEdits && current !== previous ? current : content));
  }, [characterId]);

  // The content is only fetched once the popup is opened.
  useEffect(() => { if (open) load(false); }, [open, load]);
  useAppSync(["sheet_power_ideas"], () => { if (open) load(true); });

  const save = async () => {
    const content = draft.trim();
    if (!user || !content || content === saved) return;
    setSaving(true);
    const { error } = await supabase
      .from("sheet_power_ideas")
      .upsert({ character_id: characterId, content, updated_by: user.id }, { onConflict: "character_id" });
    setSaving(false);
    if (error) { toast.error("No se pudo guardar: " + error.message); return; }
    savedRef.current = content;
    setSaved(content);
    setDraft(content);
    toast.success("Idea de poder guardada");
    // Best effort, like skill ideas: the masters get a push with the new text.
    appClient.functions.invoke("notify-idea", { body: { power_character_id: characterId } }).catch(() => { /* push is best effort */ });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Idea de poder" title="Idea de poder">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg w-[calc(100%-1rem)] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Idea de poder</DialogTitle>
          <DialogDescription>
            {isOwner ? "Cuenta qué quieres que haga tu poder. Cada vez que guardes, el Máster recibe una notificación." : "Idea del jugador para su poder."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={8}
          value={draft}
          readOnly={!isOwner}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe aquí tu idea"
        />
        {isOwner && (
          <Button onClick={save} disabled={saving || !draft.trim() || draft.trim() === saved}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
