CREATE OR REPLACE FUNCTION public.notify_app_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM realtime.send(jsonb_build_object('table', TG_TABLE_NAME), 'changed', 'app-sync', false);
  RETURN NULL;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['songs','playlists','playlist_songs','maps','character_photos','characters','npcs','campaigns','campaign_inventory','campaign_rumors','current_status','documents','saved_attacks','saved_creatures','saved_creature_groups','saved_creature_group_members','saved_combats'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS app_sync_notify ON public.%I', t);
    EXECUTE format('CREATE TRIGGER app_sync_notify AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION public.notify_app_sync()', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_combats_public()
RETURNS TABLE(id uuid, name text, state jsonb, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name,
    jsonb_build_object(
      'round', c.state->'round',
      'turnIdx', c.state->'turnIdx',
      'combatants', COALESCE((
        SELECT jsonb_agg(
          CASE WHEN x->>'alignment' = 'player'
            THEN jsonb_build_object('id', x->'id', 'name', x->'name', 'alignment', x->'alignment', 'initRoll', x->'initRoll', 'hp', x->'hp', 'maxHp', x->'maxHp', 'ac', x->'ac')
            ELSE jsonb_build_object('id', x->'id', 'name', x->'name', 'alignment', x->'alignment', 'initRoll', x->'initRoll')
          END ORDER BY ord)
        FROM jsonb_array_elements(COALESCE(c.state->'combatants','[]'::jsonb)) WITH ORDINALITY AS e(x, ord)
      ), '[]'::jsonb)
    ),
    c.updated_at
  FROM public.saved_combats c
  WHERE auth.uid() IS NOT NULL
  ORDER BY c.name;
$$;
REVOKE ALL ON FUNCTION public.get_combats_public() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_combats_public() TO authenticated;
REVOKE ALL ON FUNCTION public.notify_app_sync() FROM public, anon, authenticated;