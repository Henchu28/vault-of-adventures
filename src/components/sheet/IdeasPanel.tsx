import { useCallback, useEffect, useState } from "react";
import { sheetDb as supabase } from "@/lib/sheet/db";
import { supabase as appClient } from "@/integrations/supabase/client";
import { useAppSync } from "@/hooks/useAppSync";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, ThumbsDown, Trash2, Lightbulb, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const HAB_KEYS = ["hab1", "hab2", "hab3"] as const;
type IdeaCategory = (typeof HAB_KEYS)[number] | "power";
type Reaction = "like" | "dislike";

type Idea = {
  id: string;
  character_id: string;
  category: IdeaCategory;
  content: string;
  reaction: Reaction | null;
  author_role: "player" | "master";
  parent_id: string | null;
  created_at: string;
};

/** Loads the ideas of the given categories for a sheet and keeps them fresh; shared by the shop boxes and the power box. */
function useIdeas(characterId: string, categories: IdeaCategory[], isAdmin: boolean) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [busy, setBusy] = useState(false);
  const key = categories.join(",");

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("sheet_ideas")
      .select("*")
      .eq("character_id", characterId)
      .in("category", key.split(","))
      .order("created_at", { ascending: true });
    if (error) { toast.error("No se pudieron cargar las ideas: " + error.message); return; }
    setIdeas((data ?? []) as Idea[]);
  }, [characterId, key]);

  useEffect(() => { load(); }, [load]);
  useAppSync(["sheet_ideas"], load);

  // parentId set = a master reply to that idea (the database copies its sheet and category).
  const add = async (category: IdeaCategory, content: string, parentId?: string) => {
    setBusy(true);
    const { data, error } = await supabase
      .from("sheet_ideas")
      .insert({ character_id: characterId, category, content, parent_id: parentId ?? null })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error("No se pudo guardar: " + error.message); return false; }
    toast.success(parentId ? "Respuesta enviada" : "Idea enviada");
    load();
    // Only a player's new idea notifies the masters.
    if (!isAdmin) {
      appClient.functions.invoke("notify-idea", { body: { idea_id: data.id } }).catch(() => { /* push is best effort */ });
    }
    return true;
  };

  const react = async (idea: Idea, reaction: Reaction) => {
    const next = idea.reaction === reaction ? null : reaction;
    const { error } = await supabase.from("sheet_ideas").update({ reaction: next }).eq("id", idea.id);
    if (error) toast.error(error.message); else load();
  };

  const remove = async (idea: Idea) => {
    const { error } = await supabase.from("sheet_ideas").delete().eq("id", idea.id);
    if (error) toast.error(error.message); else load();
  };

  return { ideas, busy, add, react, remove };
}

const CARD = "rounded-md border border-border/60 bg-muted/10 p-2 text-sm space-y-1";

type BoxProps = {
  title: string;
  category: IdeaCategory;
  ideas: Idea[];
  busy: boolean;
  isAdmin: boolean;
  placeholder: string;
  onAdd: (category: IdeaCategory, content: string, parentId?: string) => Promise<boolean>;
  onReact: (idea: Idea, reaction: Reaction) => void;
  onRemove: (idea: Idea) => void;
};

/** One box of ideas. Players write ideas; masters rate them and reply to each one in a nested, indented card. */
function IdeaBox({ title, category, ideas, busy, isAdmin, placeholder, onAdd, onReact, onRemove }: BoxProps) {
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  const topLevel = ideas.filter((i) => !i.parent_id);
  const repliesOf = (id: string) => ideas.filter((i) => i.parent_id === id);
  // Master-written top-level ideas (from before replies existed) are not waiting for a review.
  const pending = topLevel.filter((i) => i.author_role !== "master" && !i.reaction).length;

  const submit = async () => {
    const content = draft.trim();
    if (!content) return;
    if (await onAdd(category, content)) setDraft("");
  };

  const sendReply = async (parent: Idea) => {
    const content = replyDraft.trim();
    if (!content) return;
    if (await onAdd(category, content, parent.id)) { setReplyDraft(""); setReplyingTo(null); }
  };

  return (
    <div className="sheet-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-bold break-words">{title}</h3>
        {isAdmin && pending > 0 && <Badge>{pending} sin revisar</Badge>}
      </div>

      {topLevel.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay ideas.</p>
      ) : (
        <ul className="space-y-3">
          {topLevel.map((idea) => {
            const replies = repliesOf(idea.id);
            const legacyMaster = idea.author_role === "master";
            // Players can delete their own ideas until the master replies; masters can delete anything.
            const canDelete = isAdmin || (!legacyMaster && replies.length === 0);
            return (
              <li key={idea.id} className="space-y-2">
                <div className={cn(CARD, legacyMaster && "ml-6")}>
                  {legacyMaster && (
                    <Badge variant="secondary" className="gap-1 text-[10px]">
                      <Reply className="h-3 w-3" /> Respuesta del Máster
                    </Badge>
                  )}
                  <p className="whitespace-pre-wrap break-words">{idea.content}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{new Date(idea.created_at).toLocaleDateString()}</span>
                    <div className="flex items-center gap-1">
                      {legacyMaster ? null : isAdmin ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 w-7 p-0", idea.reaction === "like" && "bg-primary/20 text-primary")}
                            onClick={() => onReact(idea, "like")}
                            aria-label="Like"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 w-7 p-0", idea.reaction === "dislike" && "bg-destructive/20 text-destructive")}
                            onClick={() => onReact(idea, "dislike")}
                            aria-label="Dislike"
                          >
                            <ThumbsDown className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 w-7 p-0", replyingTo === idea.id && "bg-primary/20 text-primary")}
                            onClick={() => { setReplyingTo(replyingTo === idea.id ? null : idea.id); setReplyDraft(""); }}
                            aria-label="Responder"
                            title="Responder a esta idea"
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        idea.reaction && (
                          <span className={cn("flex items-center gap-1 text-xs", idea.reaction === "like" ? "text-primary" : "text-destructive")}>
                            {idea.reaction === "like" ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
                            {idea.reaction === "like" ? "Like" : "Dislike"}
                          </span>
                        )
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRemove(idea)} aria-label="Borrar idea">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {replies.length > 0 && (
                  <ul className="space-y-2">
                    {replies.map((reply) => (
                      <li key={reply.id} className={cn(CARD, "ml-6")}>
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Reply className="h-3 w-3" /> Respuesta del Máster
                        </Badge>
                        <p className="whitespace-pre-wrap break-words">{reply.content}</p>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-muted-foreground">{new Date(reply.created_at).toLocaleDateString()}</span>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onRemove(reply)} aria-label="Borrar respuesta">
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {isAdmin && replyingTo === idea.id && (
                  <div className="ml-6 space-y-2">
                    <Textarea rows={2} value={replyDraft} onChange={(e) => setReplyDraft(e.target.value)} placeholder="Responde a esta idea" autoFocus />
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" disabled={busy || !replyDraft.trim()} onClick={() => sendReply(idea)}>
                        Enviar respuesta
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyDraft(""); }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Masters answer each idea individually, so only players get the general input. */}
      {!isAdmin && (
        <div className="space-y-2">
          <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
          <Button size="sm" className="w-full" disabled={busy || !draft.trim()} onClick={submit}>
            Añadir idea
          </Button>
        </div>
      )}
    </div>
  );
}

type Props = {
  characterId: string;
  habNames: { hab1: string; hab2: string; hab3: string };
  isAdmin: boolean;
};

/** Ideas for the three skills, shown in the shop under the personal shop. */
export function IdeasPanel({ characterId, habNames, isAdmin }: Props) {
  const { ideas, busy, add, react, remove } = useIdeas(characterId, [...HAB_KEYS], isAdmin);
  return (
    <section>
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" /> Ideas
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {HAB_KEYS.map((hk) => (
          <IdeaBox
            key={hk}
            title={habNames[hk] || hk}
            category={hk}
            ideas={ideas.filter((i) => i.category === hk)}
            busy={busy}
            isAdmin={isAdmin}
            placeholder="Escribe una idea para esta habilidad"
            onAdd={add}
            onReact={react}
            onRemove={remove}
          />
        ))}
      </div>
    </section>
  );
}

/** Ideas about what the player wants their power to do, at the bottom of the Poder tab. */
export function PowerIdeasBox({ characterId, isAdmin }: { characterId: string; isAdmin: boolean }) {
  const { ideas, busy, add, react, remove } = useIdeas(characterId, ["power"], isAdmin);
  return (
    <div className="mt-6">
      <IdeaBox
        title="Ideas para el poder"
        category="power"
        ideas={ideas}
        busy={busy}
        isAdmin={isAdmin}
        placeholder="Cuenta qué quieres que haga tu poder"
        onAdd={add}
        onReact={react}
        onRemove={remove}
      />
    </div>
  );
}
