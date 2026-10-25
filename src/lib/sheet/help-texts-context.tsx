import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { sheetDb as supabase } from "@/lib/sheet/db";
import { toast } from "sonner";

type HelpTextsCtx = {
  texts: Record<string, string>;
  isAdmin: boolean;
  saveText: (field: string, content: string) => Promise<void>;
};

const Ctx = createContext<HelpTextsCtx>({ texts: {}, isAdmin: false, saveText: async () => {} });

export function HelpTextsProvider({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  const [texts, setTexts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("sheet_help_texts").select("field, content");
    if (error) return;
    const map: Record<string, string> = {};
    (data ?? []).forEach((r: { field: string; content: string }) => (map[r.field] = r.content));
    setTexts(map);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveText = useCallback(async (field: string, content: string) => {
    const { error } = await supabase
      .from("sheet_help_texts")
      .upsert({ field, content }, { onConflict: "field" });
    if (error) {
      toast.error("Error guardando ayuda: " + error.message);
      return;
    }
    setTexts((t) => ({ ...t, [field]: content }));
  }, []);

  return <Ctx.Provider value={{ texts, isAdmin, saveText }}>{children}</Ctx.Provider>;
}

export function useHelpTexts() {
  return useContext(Ctx);
}
