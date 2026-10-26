-- Characters and NPCs no longer pick a campaign; a column default pointing at a missing campaign violated the foreign key on insert.
ALTER TABLE public.npcs ALTER COLUMN "ID_Campaña" DROP DEFAULT;
ALTER TABLE public.npcs ALTER COLUMN "ID_Campaña" DROP NOT NULL;
ALTER TABLE public.characters ALTER COLUMN "ID_Campaña" DROP DEFAULT;
ALTER TABLE public.characters ALTER COLUMN "ID_Campaña" DROP NOT NULL;
