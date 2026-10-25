export type AttrKey = "STR" | "DES" | "CON" | "INT" | "SAB" | "CAR";

export const ATTRIBUTES: { key: AttrKey; label: string; full: string; subs: string[] }[] = [
  { key: "STR", label: "Fuerza", full: "Fuerza", subs: ["Intimidación", "Forcejeo", "Supervivencia"] },
  { key: "DES", label: "Destreza", full: "Destreza", subs: ["Sigilo", "Juego de Manos", "Acrobacias"] },
  { key: "CON", label: "Constitución", full: "Constitución", subs: ["Aguante", "Tolerancia", "Resistencia"] },
  { key: "INT", label: "Inteligencia", full: "Inteligencia", subs: ["Medicina", "Arcanos", "Artesanía"] },
  { key: "SAB", label: "Sabiduría", full: "Sabiduría", subs: ["Percepción", "Historia", "Investigación"] },
  { key: "CAR", label: "Carisma", full: "Carisma", subs: ["Encanto", "Talento", "Naturaleza"] },
];

/** Display order requested: row 1 STR/CON/DES, row 2 SAB/INT/CAR */
export const ATTRIBUTE_ORDER: AttrKey[] = ["STR", "CON", "DES", "SAB", "INT", "CAR"];

export function modifier(score: number): number {
  const m = Math.floor((score - 10) / 2);
  return Math.max(-5, Math.min(5, m));
}

export function formatMod(m: number): string {
  return m >= 0 ? `+${m}` : `${m}`;
}

export type CharacterData = {
  nombre: string;
  nivel: number;
  ddg: string;
  bonif: number;
  ca: string;
  vida: string;
  velocidad: string;
  raza: string;
  attrs: Record<AttrKey, number>;
  proficiencies: Record<string, boolean>;
  highlightedAttrs?: AttrKey[];
  saves?: { fail: number; success: number };
  weaknesses?: { name: string; mod: string }[];
  resistances?: { name: string; mod: string }[];
  poder: {
    nombre: string;
    descripcion: string;
    habilidad1Nombre: string;
    habilidad2Nombre: string;
    habilidad3Nombre: string;
    habilidad1: string;
    habilidad2: string;
    habilidad3: string;
  };
};

export const DEFAULT_CHARACTER: CharacterData = {
  nombre: "Nuevo Personaje",
  nivel: 1,
  ddg: "1d8",
  bonif: 2,
  ca: "10",
  vida: "10",
  velocidad: "9m",
  raza: "Humano",
  attrs: { STR: 10, DES: 10, CON: 10, INT: 10, SAB: 10, CAR: 10 },
  proficiencies: {},
  highlightedAttrs: [],
  saves: { fail: 0, success: 0 },
  weaknesses: [],
  resistances: [],
  poder: {
    nombre: "",
    descripcion: "",
    habilidad1Nombre: "Habilidad 1",
    habilidad2Nombre: "Habilidad 2",
    habilidad3Nombre: "Habilidad 3",
    habilidad1: "",
    habilidad2: "",
    habilidad3: "",
  },
};

export function mergeCharacter(partial: Partial<CharacterData> | null | undefined): CharacterData {
  const base = DEFAULT_CHARACTER;
  if (!partial) {
    return {
      ...base,
      attrs: { ...base.attrs },
      proficiencies: { ...base.proficiencies },
      poder: { ...base.poder },
    };
  }
  return {
    ...base,
    ...partial,
    attrs: { ...base.attrs, ...(partial.attrs || {}) },
    proficiencies: { ...base.proficiencies, ...(partial.proficiencies || {}) },
    highlightedAttrs: Array.isArray(partial.highlightedAttrs) ? partial.highlightedAttrs.slice(0, 2) : [],
    saves: { fail: Math.max(0, Math.min(3, partial.saves?.fail ?? 0)), success: Math.max(0, Math.min(3, partial.saves?.success ?? 0)) },
    weaknesses: Array.isArray(partial.weaknesses) ? partial.weaknesses : [],
    resistances: Array.isArray(partial.resistances) ? partial.resistances : [],
    poder: { ...base.poder, ...(partial.poder || {}) },
  };
}

export const HELP_TEXTS: Record<string, string> = {};
export function helpFor(field: string) {
  return HELP_TEXTS[field] ?? `Texto de ayuda para campo ${field}`;
}
