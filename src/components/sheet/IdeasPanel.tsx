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
type HabKey = (typeof HAB_KEYS)[number];
type Reaction = "like" | "dislike";

type Idea = {
  id: string;
  character_id: string;
  category: HabKey;
  content: string;
  reaction: Reaction | null;
  author_role: "player" | "master";
  created_at: string;
};

type Props = {
  characterId: string;
  habNames: { hab1: string; hab2: string; hab3: string };
  isAdmin: boolean;
};

export function IdeasPanel({ characterId, habNames, isAdmin }: Props) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [drafts, setDrafts] = useState<Record<HabKey, string>>({ hab1: "", hab2: "", hab3: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("sheet_ideas")
      .select("*")
      .eq("character_id", characterId)
      .order("created_at", { ascending: true });
    if (error) { toast.error("No se pudieron cargar las ideas: " + error.message); return; }
    setIdeas((data ?? []) as Idea[]);
  }, [characterId]);

  useEffect(() => { load(); }, [load]);
  useAppSync(["sheet_ideas"], load);

  const addIdea = async (hk: HabKey) => {
    const content = drafts[hk].trim();
    if (!content) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("sheet_ideas")
      .insert({ character_id: characterId, category: hk, content })
      .select("id")
      .single();
    setBusy(false);
    if (error) { toast.error("No se pudo crear la idea: " + error.message); return; }
    setDrafts((d) => ({ ...d, [hk]: "" }));
    toast.success("Idea enviada");
    load();
    // A master writing an idea does not need to notify the masters.
    if (!isAdmin) {
      appClient.functions.invoke("notify-idea", { body: { idea_id: data.id } }).catch(() => { /* push is best effort */ });
    }
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

  return (
    <section>
      <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" /> Ideas
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {HAB_KEYS.map((hk) => {
          const list = ideas.filter((i) => i.category === hk);
          // Master ideas are replies: they are never rated nor counted as pending.
          const pending = list.filter((i) => i.author_role !== "master" && !i.reaction).length;
          return (
            <div key={hk} className="sheet-panel p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold break-words">{habNames[hk] || hk}</h3>
                {isAdmin && pending > 0 && <Badge>{pending} sin revisar</Badge>}
              </div>

              {list.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aún no hay ideas.</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((idea) => {
                    const fromMaster = idea.author_role === "master";
                    return (
                    <li
                      key={idea.id}
                      className={cn(
                        "rounded-md border p-2 text-sm space-y-1",
                        fromMaster ? "ml-4 border-l-4 border-l-primary border-primary/40 bg-primary/10" : "border-border/60 bg-muted/10",
                      )}
                    >
                      {fromMaster && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Reply className="h-3 w-3" /> Respuesta del Máster
                        </Badge>
                      )}
                      <p className="whitespace-pre-wrap break-words">{idea.content}</p>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(idea.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1">
                          {fromMaster ? null : isAdmin ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn("h-7 w-7 p-0", idea.reaction === "like" && "bg-primary/20 text-primary")}
                                onClick={() => react(idea, "like")}
                                aria-label="Like"
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={cn("h-7 w-7 p-0", idea.reaction === "dislike" && "bg-destructive/20 text-destructive")}
                                onClick={() => react(idea, "dislike")}
                                aria-label="Dislike"
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
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
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => remove(idea)} aria-label="Borrar idea">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}

              <div className="space-y-2">
                <Textarea
                  rows={2}
                  value={drafts[hk]}
                  onChange={(e) => setDrafts((d) => ({ ...d, [hk]: e.target.value }))}
                  placeholder={isAdmin ? "Responde a las ideas de esta habilidad" : "Escribe una idea para esta habilidad"}
                />
                <Button size="sm" className="w-full" disabled={busy || !drafts[hk].trim()} onClick={() => addIdea(hk)}>
                  {isAdmin ? "Añadir respuesta" : "Añadir idea"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
