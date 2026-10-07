import type { Lane } from '../data/tuning';

/**
 * Cell codes (one char per lane, left/centre/right):
 * .  empty            b  low (jump)            j  low with a token arc over it
 * o  overhead (slide) X  block (change lane)   m  moving hazard (lane it occupies on arrival)
 * r  ramp up          R  platform (needs a ramp before it in the same lane)
 * T  tokens           P  power-up spot         ?  mystery box
 */
export type Cell = '.' | 'b' | 'j' | 'o' | 'X' | 'm' | 'r' | 'R' | 'T' | 'P' | '?';
export type Row = readonly [Cell, Cell, Cell];

export type PatternTag = 'rest' | 'tokens' | 'jump' | 'slide' | 'dodge' | 'moving' | 'ramp';

export interface PatternDef {
  id: string;
  /** Zone indices (0-based) this pattern may appear in. */
  zones: readonly number[];
  minTier: number;
  maxTier: number;
  weight: number;
  rows: readonly string[];
  tags?: readonly PatternTag[];
  /** Also register a left-right mirrored copy. */
  mirror?: boolean;
}

export interface Pattern extends Omit<PatternDef, 'rows' | 'mirror'> {
  rows: readonly Row[];
}

const VALID = new Set<string>(['.', 'b', 'j', 'o', 'X', 'm', 'r', 'R', 'T', 'P', '?']);

export function parseRow(s: string, id: string): Row {
  if (s.length !== 3) throw new Error(`pattern ${id}: row "${s}" must have 3 cells`);
  for (const c of s) if (!VALID.has(c)) throw new Error(`pattern ${id}: bad cell "${c}"`);
  return [s[0], s[1], s[2]] as unknown as Row;
}

export function cellAt(row: Row, lane: Lane): Cell {
  return row[lane];
}

export function buildPatterns(defs: readonly PatternDef[]): Pattern[] {
  const out: Pattern[] = [];
  const ids = new Set<string>();
  for (const d of defs) {
    const rows = d.rows.map((r) => parseRow(r, d.id));
    const base = { ...d, rows };
    delete (base as { mirror?: boolean }).mirror;
    out.push(base);
    if (d.mirror)
      out.push({ ...base, id: `${d.id}~m`, rows: rows.map((r) => [r[2], r[1], r[0]] as Row) });
  }
  for (const p of out) {
    if (ids.has(p.id)) throw new Error(`duplicate pattern id ${p.id}`);
    ids.add(p.id);
  }
  return out;
}
