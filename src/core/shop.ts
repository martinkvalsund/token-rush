import { CATEGORIES, DAILY_GIFT, ITEMS_BY_ID, type ShopItem } from '../data/shop';
import { DEFAULT_LOADOUT, type Loadout, type SaveData } from './storage';

export type BuyResult = 'bought' | 'owned' | 'poor' | 'unknown';

/** Free items are always owned; everything else once bought. */
export function owns(save: SaveData, id: string): boolean {
  const item = ITEMS_BY_ID.get(id);
  return !!item && (item.price === 0 || save.owned.includes(id));
}

/** Spend tokens on an item and equip it. */
export function buy(save: SaveData, id: string): BuyResult {
  const item = ITEMS_BY_ID.get(id);
  if (!item) return 'unknown';
  if (owns(save, id)) return 'owned';
  if (save.wallet < item.price) return 'poor';
  save.wallet -= item.price;
  save.owned.push(id);
  save.loadout[item.category] = id;
  return 'bought';
}

/** Equip an owned item. Returns false if it is not owned. */
export function equip(save: SaveData, id: string): boolean {
  const item = ITEMS_BY_ID.get(id);
  if (!item || !owns(save, id)) return false;
  save.loadout[item.category] = id;
  return true;
}

/** Replace unknown or unowned equipped items (old saves, edited storage) with the defaults. */
export function sanitizeLoadout(save: SaveData): void {
  for (const c of CATEGORIES) {
    const id = save.loadout[c.id];
    const item = ITEMS_BY_ID.get(id);
    if (!item || item.category !== c.id || !owns(save, id)) save.loadout[c.id] = c.defaultId;
  }
}

/** The equipped items, resolved. */
export function loadoutItems(loadout: Loadout): Record<keyof Loadout, ShopItem> {
  const out = {} as Record<keyof Loadout, ShopItem>;
  for (const k of Object.keys(DEFAULT_LOADOUT) as (keyof Loadout)[]) {
    const item = ITEMS_BY_ID.get(loadout[k]) ?? ITEMS_BY_ID.get(DEFAULT_LOADOUT[k]);
    if (!item) throw new Error(`Missing default shop item for ${k}`);
    out[k] = item;
  }
  return out;
}

export const localDay = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function dailyReady(save: SaveData, now: Date = new Date()): boolean {
  return save.lastDaily !== localDay(now);
}

/** Open the daily crate: tokens once per calendar day. Returns the amount granted (0 if used). */
export function claimDaily(save: SaveData, now: Date = new Date()): number {
  if (!dailyReady(save, now)) return 0;
  save.lastDaily = localDay(now);
  save.wallet += DAILY_GIFT;
  return DAILY_GIFT;
}
