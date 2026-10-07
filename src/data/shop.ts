/**
 * The token shop catalogue. Everything here is cosmetic: nothing changes gameplay.
 * A typical run banks about 200 tokens, so prices range from one run to a few dozen.
 */

export type ShopCategory = 'outfit' | 'hat' | 'pet' | 'trail' | 'skin' | 'hair';

/** Palette swatch recolour: a hex colour, optionally glowing or with its own surface. */
export interface SwatchOverride {
  hex: string;
  glow?: boolean;
  /** [roughness, metalness] */
  surface?: [number, number];
}

export type Recolor = Partial<Record<string, SwatchOverride>>;

export type TrailStyle = 'none' | 'sparkle' | 'neon' | 'fire' | 'code' | 'rainbow';

export interface ShopItem {
  id: string;
  category: ShopCategory;
  name: string;
  blurb: string;
  price: number;
  /** Outfits, skins and hair recolour the character's palette swatches. */
  recolor?: Recolor;
  /** Headgear and companions: the Blender model to load (public/models/<model>.glb). */
  model?: string;
  trail?: TrailStyle;
  /** Colours shown on the shop card (and used by trails). */
  swatch: string[];
}

export interface CategoryInfo {
  id: ShopCategory;
  name: string;
  /** The free item everyone owns and starts with. */
  defaultId: string;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'outfit', name: 'Outfits', defaultId: 'outfit_classic' },
  { id: 'hat', name: 'Headgear', defaultId: 'hat_hardhat' },
  { id: 'pet', name: 'Companions', defaultId: 'pet_none' },
  { id: 'trail', name: 'Trails', defaultId: 'trail_none' },
  { id: 'skin', name: 'Skin', defaultId: 'skin_3' },
  { id: 'hair', name: 'Hair', defaultId: 'hair_brown' },
];

// Character swatches: shirt = steel_blue, vest and cuffs = lime, reflective bands = silver,
// trousers = denim, boots = brown, hard hat = yellow / yellow_dark.
const outfit = (
  id: string,
  name: string,
  blurb: string,
  price: number,
  recolor: Recolor,
): ShopItem => ({
  id,
  category: 'outfit',
  name,
  blurb,
  price,
  recolor,
  swatch: [
    recolor.lime?.hex ?? '#C6FF00',
    recolor.steel_blue?.hex ?? '#4A6C8C',
    recolor.yellow?.hex ?? '#FFC72C',
  ],
});

const GLOSS: [number, number] = [0.28, 0.85];

export const SHOP_ITEMS: readonly ShopItem[] = [
  outfit('outfit_classic', 'Site Classic', 'Hi-vis vest, denim, yellow hard hat.', 0, {}),
  outfit('outfit_night', 'Night Shift', 'Orange hi-vis for the late deploy.', 300, {
    lime: { hex: '#FF6B1A' },
    steel_blue: { hex: '#1F2A44' },
    denim: { hex: '#23262C' },
    yellow: { hex: '#FF8A2A' },
    yellow_dark: { hex: '#B84A0C' },
  }),
  outfit('outfit_foreman', 'Site Foreman', 'White hat, clean shirt, big decisions.', 600, {
    lime: { hex: '#FFD600' },
    steel_blue: { hex: '#E9EEF2' },
    denim: { hex: '#3A3F47' },
    brown: { hex: '#1C1E22' },
    yellow: { hex: '#F4F4EF' },
    yellow_dark: { hex: '#C9CCD0' },
  }),
  outfit('outfit_duck', 'Rubber Duck', 'Explain your bug to yourself.', 1000, {
    lime: { hex: '#FFD21F' },
    steel_blue: { hex: '#FFE36B' },
    denim: { hex: '#FFB000' },
    brown: { hex: '#FF7A1A' },
    yellow: { hex: '#FFD21F' },
    yellow_dark: { hex: '#E0A800' },
  }),
  outfit('outfit_hacker', 'Dark Mode', 'All black, green glow. Obviously.', 1500, {
    lime: { hex: '#2A2E35' },
    steel_blue: { hex: '#15171B' },
    denim: { hex: '#1C1E22' },
    brown: { hex: '#111214' },
    silver: { hex: '#39FF14', glow: true },
    yellow: { hex: '#22252A' },
    yellow_dark: { hex: '#15171B' },
  }),
  outfit('outfit_synthwave', 'Synthwave', 'Neon pink, retro purple, teal hat.', 2500, {
    lime: { hex: '#FF3EA5' },
    steel_blue: { hex: '#5B2EFF' },
    denim: { hex: '#1B1440' },
    silver: { hex: '#2EF2FF', glow: true },
    yellow: { hex: '#00E5D4' },
    yellow_dark: { hex: '#00A89C' },
  }),
  outfit('outfit_gold', 'Golden Build', 'Shipped on time. Every time.', 6000, {
    lime: { hex: '#FFC83D', surface: GLOSS },
    silver: { hex: '#FFF1B8', glow: true },
    steel_blue: { hex: '#1C1E22' },
    denim: { hex: '#22252A' },
    brown: { hex: '#C99A0E', surface: GLOSS },
    yellow: { hex: '#FFC83D', surface: GLOSS },
    yellow_dark: { hex: '#C99A0E', surface: GLOSS },
  }),

  {
    id: 'hat_hardhat',
    category: 'hat',
    name: 'Hard Hat',
    blurb: 'Safety first.',
    price: 0,
    swatch: ['#FFC72C'],
  },
  {
    id: 'hat_headlamp',
    category: 'hat',
    name: 'Headlamp',
    blurb: 'For tunnel debugging.',
    price: 400,
    model: 'hat_headlamp',
    swatch: ['#FFF3C4', '#FFC72C'],
  },
  {
    id: 'hat_headset',
    category: 'hat',
    name: 'Headset',
    blurb: 'Still on the stand-up call.',
    price: 800,
    model: 'hat_headset',
    swatch: ['#C6FF00', '#1C1E22'],
  },
  {
    id: 'hat_propeller',
    category: 'hat',
    name: 'Propeller',
    blurb: 'Lift-off for big ideas.',
    price: 1200,
    model: 'hat_propeller',
    swatch: ['#E8412C', '#2E86DE'],
  },
  {
    id: 'hat_viking',
    category: 'hat',
    name: 'Viking',
    blurb: 'Raid the backlog.',
    price: 1800,
    model: 'hat_viking',
    swatch: ['#F3E9D2', '#FFC83D'],
  },
  {
    id: 'hat_wizard',
    category: 'hat',
    name: 'Architect',
    blurb: 'A senior wizard of systems.',
    price: 2500,
    model: 'hat_wizard',
    swatch: ['#7B4FD6', '#FFC83D'],
  },
  {
    id: 'hat_crown',
    category: 'hat',
    name: 'Crown',
    blurb: 'King of the leaderboard.',
    price: 5000,
    model: 'hat_crown',
    swatch: ['#FFC83D', '#E8412C'],
  },

  {
    id: 'pet_none',
    category: 'pet',
    name: 'None',
    blurb: 'Running solo.',
    price: 0,
    swatch: ['#6B717A'],
  },
  {
    id: 'pet_duck',
    category: 'pet',
    name: 'Debug Duck',
    blurb: 'Listens to every bug report.',
    price: 1500,
    model: 'pet_duck',
    swatch: ['#FFC72C', '#FF6B1A'],
  },
  {
    id: 'pet_token',
    category: 'pet',
    name: 'Token Buddy',
    blurb: 'A token that refused to be spent.',
    price: 2000,
    model: 'pet_token',
    swatch: ['#FFC83D', '#FFE38A'],
  },
  {
    id: 'pet_bot',
    category: 'pet',
    name: 'Pair Bot',
    blurb: 'Your pair programmer.',
    price: 3000,
    model: 'pet_bot',
    swatch: ['#F2F2EE', '#5AD1FF'],
  },
  {
    id: 'pet_drone',
    category: 'pet',
    name: 'Survey Drone',
    blurb: 'Maps the site from above.',
    price: 4000,
    model: 'pet_drone',
    swatch: ['#3A3F47', '#FF6B1A'],
  },

  {
    id: 'trail_none',
    category: 'trail',
    name: 'Dust',
    blurb: 'Plain site dust.',
    price: 0,
    trail: 'none',
    swatch: ['#B8A88A'],
  },
  {
    id: 'trail_sparkle',
    category: 'trail',
    name: 'Token Sparkle',
    blurb: 'Gold glints behind you.',
    price: 500,
    trail: 'sparkle',
    swatch: ['#FFD54F', '#FFF3C4'],
  },
  {
    id: 'trail_neon',
    category: 'trail',
    name: 'Neon',
    blurb: 'Lime and cyan light trail.',
    price: 900,
    trail: 'neon',
    swatch: ['#C6FF00', '#2EF2FF'],
  },
  {
    id: 'trail_fire',
    category: 'trail',
    name: 'Hotfix',
    blurb: 'Leaves production on fire.',
    price: 1400,
    trail: 'fire',
    swatch: ['#FF8A1A', '#FFD54F', '#E8412C'],
  },
  {
    id: 'trail_code',
    category: 'trail',
    name: 'Green Code',
    blurb: 'Bits falling off the build.',
    price: 1800,
    trail: 'code',
    swatch: ['#39FF14', '#0B3D0B'],
  },
  {
    id: 'trail_rainbow',
    category: 'trail',
    name: 'Rainbow',
    blurb: 'All tests green. And red. And…',
    price: 3000,
    trail: 'rainbow',
    swatch: ['#FF3B3B', '#FFC72C', '#39FF14', '#2E86DE', '#9B5DE5'],
  },

  ...(
    [
      ['skin_1', '#F6D3B3'],
      ['skin_2', '#EFC09A'],
      ['skin_3', '#E8B48A'],
      ['skin_4', '#C68A5E'],
      ['skin_5', '#9A6440'],
      ['skin_6', '#6B4329'],
    ] as const
  ).map(([id, hex], i): ShopItem => ({
    id,
    category: 'skin',
    name: `Tone ${i + 1}`,
    blurb: 'Free.',
    price: 0,
    recolor: { skin: { hex } },
    swatch: [hex],
  })),
  ...(
    [
      ['hair_brown', 'Brown', '#3B2A1E', 0],
      ['hair_black', 'Black', '#16120F', 0],
      ['hair_blond', 'Blond', '#D9B35C', 0],
      ['hair_ginger', 'Ginger', '#B5501E', 0],
      ['hair_grey', 'Silver', '#B9BCC2', 0],
      ['hair_blue', 'Electric Blue', '#2E86DE', 250],
      ['hair_pink', 'Bubblegum', '#FF5FB0', 250],
      ['hair_lime', 'Hi-vis', '#B6F500', 400],
    ] as const
  ).map(([id, name, hex, price]): ShopItem => ({
    id,
    category: 'hair',
    name,
    blurb: price ? 'Fresh dye job.' : 'Free.',
    price,
    recolor: { hair: { hex } },
    swatch: [hex],
  })),
];

export const ITEMS_BY_ID: ReadonlyMap<string, ShopItem> = new Map(SHOP_ITEMS.map((i) => [i.id, i]));

/** Tokens granted by the daily crate (once per calendar day). */
export const DAILY_GIFT = 150;
