import aiSpark from '../assets/icons/ai-spark.svg?raw';
import type { PowerupType } from '../sim/entities';

export const ICON_TOKEN = `<svg viewBox="0 0 32 32" aria-hidden="true"><polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill="#ffc72c" stroke="#b8860b" stroke-width="2"/><polygon points="16,8 23,12 23,20 16,24 9,20 9,12" fill="none" stroke="#fff3c4" stroke-width="2"/><text x="16" y="20.5" text-anchor="middle" font-family="Rajdhani, system-ui" font-weight="700" font-size="11" fill="#7a5600">T</text></svg>`;

export const ICON_HAT = `<svg viewBox="0 0 34 26" aria-hidden="true"><path d="M5 19 C5 8 11 3 17 3 C23 3 29 8 29 19 Z" fill="#ffc72c" stroke="#8a6400" stroke-width="1.5"/><rect x="15" y="3" width="4" height="15" rx="1.5" fill="#ffd95a"/><rect x="1" y="18" width="32" height="5" rx="2.5" fill="#f2b400" stroke="#8a6400" stroke-width="1.5"/></svg>`;

export const POWERUP_ICONS: Record<PowerupType, string> = {
  magnet: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="14" rx="2" fill="#2b333d" stroke="#9fb3c8" stroke-width="2"/><rect x="8" y="8" width="16" height="8" fill="#5ad1ff"/><path d="M2 22 H30 L27 26 H5 Z" fill="#9fb3c8"/></svg>`,
  jetpack: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="10" y="3" width="12" height="26" rx="3" fill="#1b1f24" stroke="#c6ff00" stroke-width="2"/><rect x="10" y="11" width="12" height="9" fill="#c6ff00"/><text x="16" y="18" text-anchor="middle" font-size="5" font-weight="700" font-family="Rajdhani, system-ui" fill="#1b1f24">ENERGY</text></svg>`,
  shield: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M8 8 H24 L22 29 H10 Z" fill="#f5efe6" stroke="#8d6e63" stroke-width="2"/><rect x="7" y="5" width="18" height="4" rx="1.5" fill="#6d4c41"/><rect x="9" y="15" width="14" height="6" fill="#8d6e63"/><path d="M13 3 Q15 1 13 -1 M19 3 Q21 1 19 -1" stroke="#ccc" fill="none"/></svg>`,
  double: aiSpark,
  boots: `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 4 H15 V20 L27 22 V28 H6 Z" fill="#6d4c41" stroke="#3e2723" stroke-width="2"/><rect x="6" y="11" width="9" height="3" fill="#c6ff00"/><rect x="6" y="25" width="21" height="3" fill="#212121"/></svg>`,
  mystery: `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="3" fill="#ff6b1a" stroke="#a63f00" stroke-width="2"/><text x="16" y="23" text-anchor="middle" font-family="Rajdhani, system-ui" font-weight="700" font-size="20" fill="#fff">?</text></svg>`,
};

export const POWERUP_NAMES: Record<PowerupType, string> = {
  magnet: 'Laptop',
  jetpack: 'Energy drink',
  shield: 'Coffee',
  double: 'AI spark',
  boots: 'Safety boots',
  mystery: 'Mystery box',
};

export const POWERUP_COLORS: Record<PowerupType, string> = {
  magnet: '#5ad1ff',
  jetpack: '#c6ff00',
  shield: '#e0c9a6',
  double: '#ff7a59',
  boots: '#ffc72c',
  mystery: '#ff6b1a',
};

const icon = (path: string) =>
  `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
export const ICON_PLAY = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/></svg>`;
export const ICON_HELP = icon(
  '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 3.9"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/>',
);
export const ICON_GEAR = icon(
  '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
);
export const ICON_STATS = icon('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>');
export const ICON_PAUSE = icon(
  '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
);
export const ICON_SHOP = icon(
  '<path d="M5 8h14l-1.2 11.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
);
export const ICON_LOCK = icon(
  '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
);
export const ICON_CHECK = icon('<path d="M5 12.5l4.5 4.5L19 7.5"/>');
export const ICON_GIFT = icon(
  '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1.5-4-6-4-5.5-1.2C7 9 12 9 12 9zM12 9c1.5-4 6-4 5.5-1.2C17 9 12 9 12 9z"/>',
);
export const ICON_BACK = icon('<path d="M15 5l-7 7 7 7"/>');
