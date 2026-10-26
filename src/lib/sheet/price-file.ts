export type PriceRow = { name: string; cost: number; required: number };
export type PriceFileError = { line: number; message: string };

const LINE = /^(.+?)\s*=\s*(\d+)\s*(?:\/\s*(\d+))?$/;

/** Parses "Propiedad=precio/anulacion" lines (anulacion optional, defaults to 0). */
export function parsePriceFile(text: string): { rows: PriceRow[]; errors: PriceFileError[] } {
  const rows: PriceRow[] = [];
  const errors: PriceFileError[] = [];
  const seen = new Set<string>();

  text.replace(/^﻿/, "").split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const lineNumber = index + 1;
    const match = LINE.exec(line);
    if (!match) {
      errors.push({ line: lineNumber, message: `Formato no válido: "${line}" (usa Propiedad=precio/anulacion)` });
      return;
    }
    const name = match[1].trim();
    const key = name.toLowerCase();
    if (seen.has(key)) {
      errors.push({ line: lineNumber, message: `"${name}" aparece más de una vez` });
      return;
    }
    seen.add(key);
    rows.push({ name, cost: Number(match[2]), required: match[3] ? Number(match[3]) : 0 });
  });

  return { rows, errors };
}
