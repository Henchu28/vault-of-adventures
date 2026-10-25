import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase as client } from "@/integrations/supabase/client";

/** Untyped client: the sheet_* tables are not in the generated Supabase types. */
export const sheetDb = client as unknown as SupabaseClient;
