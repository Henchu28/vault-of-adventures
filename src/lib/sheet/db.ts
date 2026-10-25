import type { SupabaseClient } from "@supabase/supabase-js";
import { sheetDb as supabase } from "@/lib/sheet/db";

/** Untyped client: the sheet_* tables are not in the generated Supabase types. */
export const sheetDb = supabase as unknown as SupabaseClient;
