-- Character sheet ("Ficha") tables. Master = profiles.role 'master', player = 'player'.

CREATE TABLE public.sheet_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Personaje',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sheet_character_currency (
  character_id uuid PRIMARY KEY REFERENCES public.sheet_characters(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  evo integer NOT NULL DEFAULT 0,
  power_color text NOT NULL DEFAULT '#7c3aed',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sheet_shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_character_id uuid REFERENCES public.sheet_characters(id) ON DELETE CASCADE, -- NULL = general
  category text NOT NULL CHECK (category IN ('hab1','hab2','hab3','propiedad','caracteristica')),
  level integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  cost integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'xp' CHECK (currency IN ('xp','evo')),
  locked boolean NOT NULL DEFAULT false,
  required_anulaciones integer NOT NULL DEFAULT 0,
  attribute_key text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sheet_shop_items_owner ON public.sheet_shop_items(owner_character_id);
CREATE INDEX idx_sheet_shop_items_category ON public.sheet_shop_items(category);

CREATE TABLE public.sheet_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id uuid NOT NULL REFERENCES public.sheet_characters(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.sheet_shop_items(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sheet_purchases_character ON public.sheet_purchases(character_id);

CREATE TABLE public.sheet_property_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  character_id uuid NOT NULL REFERENCES public.sheet_characters(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.sheet_shop_items(id) ON DELETE CASCADE,
  required_anulaciones integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_id, item_id)
);

CREATE TABLE public.sheet_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.sheet_characters(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  description text NOT NULL DEFAULT '',
  attributes_text text NOT NULL DEFAULT '',
  stat_target text,
  stat_delta integer NOT NULL DEFAULT 0,
  stat_effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sheet_inventory_items_character ON public.sheet_inventory_items(character_id);

CREATE TABLE public.sheet_help_texts (
  field text PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

CREATE TRIGGER sheet_characters_updated BEFORE UPDATE ON public.sheet_characters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sheet_currency_updated BEFORE UPDATE ON public.sheet_character_currency FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sheet_shop_items_updated BEFORE UPDATE ON public.sheet_shop_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sheet_locks_updated BEFORE UPDATE ON public.sheet_property_locks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sheet_inventory_updated BEFORE UPDATE ON public.sheet_inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sheet_help_texts_updated BEFORE UPDATE ON public.sheet_help_texts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE FUNCTION public.sheet_handle_new_character() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.sheet_character_currency (character_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sheet_on_character_created AFTER INSERT ON public.sheet_characters FOR EACH ROW EXECUTE FUNCTION public.sheet_handle_new_character();

CREATE FUNCTION public.sheet_sync_user_id() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM public.sheet_characters WHERE id = NEW.character_id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sheet_purchases_sync_user_id BEFORE INSERT ON public.sheet_purchases FOR EACH ROW EXECUTE FUNCTION public.sheet_sync_user_id();
CREATE TRIGGER sheet_locks_sync_user_id BEFORE INSERT ON public.sheet_property_locks FOR EACH ROW EXECUTE FUNCTION public.sheet_sync_user_id();

REVOKE EXECUTE ON FUNCTION public.sheet_handle_new_character() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sheet_sync_user_id() FROM PUBLIC, anon, authenticated;

-- Access check: sheet owner or master.
CREATE FUNCTION public.sheet_can_access(_character_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'master')
    OR EXISTS (SELECT 1 FROM public.sheet_characters c WHERE c.id = _character_id AND c.user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.sheet_can_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sheet_can_access(uuid) TO authenticated;

ALTER TABLE public.sheet_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_character_currency ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_property_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_help_texts ENABLE ROW LEVEL SECURITY;

-- characters: owner or master
CREATE POLICY "sheet characters select" ON public.sheet_characters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));
CREATE POLICY "sheet characters insert" ON public.sheet_characters FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));
CREATE POLICY "sheet characters update" ON public.sheet_characters FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));
CREATE POLICY "sheet characters delete" ON public.sheet_characters FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'master'));

-- currency: owner or master read/insert/update; master delete
CREATE POLICY "sheet currency select" ON public.sheet_character_currency FOR SELECT TO authenticated USING (public.sheet_can_access(character_id));
CREATE POLICY "sheet currency insert" ON public.sheet_character_currency FOR INSERT TO authenticated WITH CHECK (public.sheet_can_access(character_id));
CREATE POLICY "sheet currency update" ON public.sheet_character_currency FOR UPDATE TO authenticated USING (public.sheet_can_access(character_id)) WITH CHECK (public.sheet_can_access(character_id));
CREATE POLICY "sheet currency delete" ON public.sheet_character_currency FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'master'));

-- shop items: general ones visible to everyone, owned ones to owner/master; only master manages
CREATE POLICY "sheet shop select" ON public.sheet_shop_items FOR SELECT TO authenticated
  USING (owner_character_id IS NULL OR public.sheet_can_access(owner_character_id));
CREATE POLICY "sheet shop master manage" ON public.sheet_shop_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

-- purchases and inventory: owner or master
CREATE POLICY "sheet purchases select" ON public.sheet_purchases FOR SELECT TO authenticated USING (public.sheet_can_access(character_id));
CREATE POLICY "sheet purchases insert" ON public.sheet_purchases FOR INSERT TO authenticated WITH CHECK (public.sheet_can_access(character_id));
CREATE POLICY "sheet purchases update" ON public.sheet_purchases FOR UPDATE TO authenticated USING (public.sheet_can_access(character_id)) WITH CHECK (public.sheet_can_access(character_id));
CREATE POLICY "sheet purchases delete" ON public.sheet_purchases FOR DELETE TO authenticated USING (public.sheet_can_access(character_id));

CREATE POLICY "sheet inventory select" ON public.sheet_inventory_items FOR SELECT TO authenticated USING (public.sheet_can_access(character_id));
CREATE POLICY "sheet inventory insert" ON public.sheet_inventory_items FOR INSERT TO authenticated WITH CHECK (public.sheet_can_access(character_id));
CREATE POLICY "sheet inventory update" ON public.sheet_inventory_items FOR UPDATE TO authenticated USING (public.sheet_can_access(character_id)) WITH CHECK (public.sheet_can_access(character_id));
CREATE POLICY "sheet inventory delete" ON public.sheet_inventory_items FOR DELETE TO authenticated USING (public.sheet_can_access(character_id));

-- property locks: read by owner or master, managed by master
CREATE POLICY "sheet locks select" ON public.sheet_property_locks FOR SELECT TO authenticated USING (public.sheet_can_access(character_id));
CREATE POLICY "sheet locks master manage" ON public.sheet_property_locks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));

-- help texts: read by everyone signed in, edited by master
CREATE POLICY "sheet help select" ON public.sheet_help_texts FOR SELECT TO authenticated USING (true);
CREATE POLICY "sheet help master manage" ON public.sheet_help_texts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master')) WITH CHECK (public.has_role(auth.uid(), 'master'));
