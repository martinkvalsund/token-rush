import type { PatternDef } from '../sim/pattern';

/**
 * Hand-authored track patterns. Rows are listed in the order the player meets them.
 * Cell legend lives in sim/pattern.ts. Every pattern is fairness-checked in tests at
 * every tier it can appear in, and again at runtime when two patterns are joined.
 * Zone indices: 0 road works, 1 tunnel, 2 building site, 3 drill site, 4 bridge.
 */
const ALL = [0, 1, 2, 3, 4] as const;

export const PATTERN_DEFS: readonly PatternDef[] = [
  // ---- Rest / token set-pieces -------------------------------------------------------------
  { id: 'rest-line-c', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['rest', 'tokens'],
    rows: ['...', '.T.', '.T.', '.T.', '.T.', '.T.', '.T.', '...'] },
  { id: 'rest-line-side', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['rest', 'tokens'], mirror: true,
    rows: ['...', 'T..', 'T..', 'T..', 'T..', 'T..', 'T..', '...'] },
  { id: 'rest-zigzag', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['rest', 'tokens'], mirror: true,
    rows: ['...', 'T..', 'T..', '.T.', '.T.', '..T', '..T', '.T.', '.T.', 'T..', '...'] },
  { id: 'rest-triple', zones: ALL, minTier: 0, maxTier: 8, weight: 1, tags: ['rest', 'tokens'],
    rows: ['...', 'TTT', '...', 'TTT', '...', 'TTT', '...', '...'] },
  { id: 'rest-powerup', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['rest', 'tokens'],
    rows: ['...', '.T.', '.T.', '.P.', '.T.', '.T.', '...', '...'] },
  { id: 'rest-powerup-side', zones: ALL, minTier: 1, maxTier: 8, weight: 1, tags: ['rest'], mirror: true,
    rows: ['...', 'T..', 'T..', 'P..', '...', '...', '...', '...'] },
  { id: 'rest-mystery', zones: ALL, minTier: 1, maxTier: 8, weight: 1, tags: ['rest', 'tokens'],
    rows: ['...', 'T.T', 'T.T', '.?.', 'T.T', 'T.T', '...', '...'] },

  // ---- Jump -------------------------------------------------------------------------------
  { id: 'jump-single', zones: ALL, minTier: 0, maxTier: 4, weight: 3, tags: ['jump', 'tokens'],
    rows: ['...', '.T.', '.j.', '...', '...', '.T.', '.T.', '...'] },
  { id: 'jump-side', zones: ALL, minTier: 0, maxTier: 4, weight: 2, tags: ['jump'], mirror: true,
    rows: ['...', 'T..', 'j..', '...', '...', 'T..', '...', '...'] },
  { id: 'jump-wall', zones: ALL, minTier: 0, maxTier: 8, weight: 3, tags: ['jump'],
    rows: ['...', '...', 'bjb', '...', '...', '...', '.T.', '.T.', '...'] },
  { id: 'jump-wall-double', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['jump'],
    rows: ['...', 'bbb', '...', '...', '...', '...', '...', '...', 'bjb', '...', '...', '...'] },
  { id: 'jump-stairs', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['jump'], mirror: true,
    rows: ['...', 'j..', '...', '...', '.j.', '...', '...', '..j', '...', '...'] },
  { id: 'jump-arc-line', zones: ALL, minTier: 0, maxTier: 5, weight: 2, tags: ['jump', 'tokens'],
    rows: ['...', '.T.', '.T.', '.j.', '...', '...', '...', '...', '.j.', '...', '...', '...'] },
  { id: 'jump-gap-wall', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['jump'], mirror: true,
    rows: ['...', 'bb.', '...', '...', '...', '...', '...', '.bb', '...', '...', '...', '...'] },

  // ---- Slide ------------------------------------------------------------------------------
  { id: 'slide-single', zones: ALL, minTier: 0, maxTier: 4, weight: 3, tags: ['slide'],
    rows: ['...', '...', '.o.', '...', '.T.', '.T.', '...', '...'] },
  { id: 'slide-wall', zones: ALL, minTier: 0, maxTier: 8, weight: 3, tags: ['slide'],
    rows: ['...', '...', 'ooo', '...', '...', '...', '.T.', '...', '...'] },
  { id: 'slide-wall-double', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['slide'],
    rows: ['...', 'ooo', '...', '...', '...', '...', '...', '...', 'ooo', '...', '...', '...'] },
  { id: 'slide-then-jump', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['slide', 'jump'],
    rows: ['...', 'ooo', '...', '...', '...', '...', '...', '...', '...', 'bjb', '...', '...', '...'] },
  { id: 'jump-then-slide', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['slide', 'jump'],
    rows: ['...', 'bjb', '...', '...', '...', '...', '...', '...', '...', 'ooo', '...', '...', '...'] },
  { id: 'slide-side', zones: ALL, minTier: 0, maxTier: 5, weight: 2, tags: ['slide'], mirror: true,
    rows: ['...', 'oo.', '...', '...', '...', '..T', '..T', '...'] },

  // ---- Dodge ------------------------------------------------------------------------------
  { id: 'dodge-side-block', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['dodge', 'tokens'], mirror: true,
    rows: ['...', 'X..', 'X..', '.T.', '.T.', '...', '...'] },
  { id: 'dodge-center', zones: ALL, minTier: 0, maxTier: 8, weight: 3, tags: ['dodge', 'tokens'],
    rows: ['...', '.X.', '.X.', 'T.T', 'T.T', '...', '...', '...'] },
  { id: 'dodge-two', zones: ALL, minTier: 0, maxTier: 8, weight: 3, tags: ['dodge', 'tokens'], mirror: true,
    rows: ['...', '...', 'XX.', 'XXT', '..T', '...', '...', '...'] },
  { id: 'dodge-slalom', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['dodge'], mirror: true,
    rows: ['...', 'XX.', 'XX.', '...', '...', '...', '...', '...', '...', '.XX', '.XX', '...', '...'] },
  { id: 'dodge-corridor', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['dodge', 'tokens'],
    rows: ['...', '.T.', 'XTX', 'XTX', 'XTX', 'XTX', '.T.', '...'] },
  { id: 'dodge-weave', zones: ALL, minTier: 0, maxTier: 8, weight: 2, tags: ['dodge'], mirror: true,
    rows: ['...', 'X..', '...', '...', '...', '...', '..X', '...', '...', '...', '...', 'X..', '...'] },
  { id: 'dodge-wide-switch', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['dodge'], mirror: true,
    rows: ['...', '.XX', '.XX', '...', '...', '...', '...', '...', '...', 'XX.', 'XX.', '...', '...'] },
  { id: 'dodge-funnel', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['dodge', 'tokens'],
    rows: ['...', 'X.X', '.T.', '.T.', '...', '...', '...', '...', 'X.X', '.T.', '...'] },

  // ---- Mixed -------------------------------------------------------------------------------
  { id: 'mix-corridor-jump', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['jump', 'dodge'],
    rows: ['...', 'X.X', 'XjX', 'X.X', '...', '...', '...', '...'] },
  { id: 'mix-corridor-slide', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['slide', 'dodge'],
    rows: ['...', 'X.X', 'XoX', 'X.X', '...', '...', '...', '...'] },
  { id: 'mix-choice', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['jump', 'slide'], mirror: true,
    rows: ['...', '...', 'bXo', '...', '...', '...', '...', '...'] },
  { id: 'mix-low-block', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['jump', 'dodge'], mirror: true,
    rows: ['...', 'XXb', 'XX.', '...', '...', '...', '...', '...', '...'] },
  { id: 'mix-over-block', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['slide', 'dodge'], mirror: true,
    rows: ['...', 'oXX', '.XX', '...', '...', '...', '...', '...', '...'] },
  { id: 'mix-gauntlet', zones: ALL, minTier: 3, maxTier: 8, weight: 2, tags: ['jump', 'slide', 'dodge'],
    rows: ['...', 'XjX', '...', '...', '...', '...', '...', '...', 'XoX', '...', '...', '...', '...'] },
  { id: 'mix-stagger', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['jump', 'dodge'], mirror: true,
    rows: ['...', 'X.b', 'X..', '...', '...', '...', '...', '...', 'b.X', '..X', '...', '...'] },
  { id: 'mix-token-run', zones: ALL, minTier: 0, maxTier: 6, weight: 2, tags: ['tokens', 'dodge'], mirror: true,
    rows: ['...', 'XT.', 'XT.', 'XT.', '.T.', '.T.', '...', '...'] },
  { id: 'mix-powerup-reward', zones: ALL, minTier: 2, maxTier: 8, weight: 1, tags: ['dodge'], mirror: true,
    rows: ['...', 'XX.', 'XXP', '...', '...', '...', '...', '...'] },
  { id: 'mix-mystery-corridor', zones: ALL, minTier: 3, maxTier: 8, weight: 1, tags: ['dodge'],
    rows: ['...', 'X.X', 'X?X', 'X.X', '...', '...', '...', '...'] },

  // ---- Road works (zone 0) -----------------------------------------------------------------
  { id: 'road-cones', zones: [0], minTier: 0, maxTier: 4, weight: 3, tags: ['jump', 'tokens'],
    rows: ['...', 'b.b', '.T.', '.T.', '.j.', '...', '...', '...'] },
  { id: 'road-roadblock', zones: [0, 4], minTier: 0, maxTier: 8, weight: 2, tags: ['dodge'], mirror: true,
    rows: ['...', 'XXb', '...', '...', '...', '...', '...', '..T', '..T', '...'] },
  { id: 'road-gantries', zones: [0], minTier: 1, maxTier: 8, weight: 2, tags: ['slide'],
    rows: ['...', 'ooo', '...', '...', '...', '...', '...', '...', '.T.', '.T.', '...'] },
  { id: 'road-detour', zones: [0], minTier: 0, maxTier: 8, weight: 2, tags: ['dodge', 'tokens'], mirror: true,
    rows: ['...', 'X..', 'X..', 'XT.', 'X.T', '..T', '...', '...'] },

  // ---- Tunnel (zone 1) ---------------------------------------------------------------------
  { id: 'tunnel-ducts', zones: [1], minTier: 0, maxTier: 8, weight: 3, tags: ['slide'],
    rows: ['...', '...', 'ooo', '...', '...', '...', '.T.', '.T.', '...'] },
  { id: 'tunnel-duct-carts', zones: [1], minTier: 1, maxTier: 8, weight: 2, tags: ['slide', 'dodge'], mirror: true,
    rows: ['...', 'oXX', 'oXX', '...', '...', '...', '...', '...', '...'] },
  { id: 'tunnel-pipes', zones: [1], minTier: 0, maxTier: 8, weight: 2, tags: ['jump'],
    rows: ['...', 'jjj', '...', '...', '...', '...', '...', '.T.', '.T.', '...'] },
  { id: 'tunnel-segments', zones: [1], minTier: 1, maxTier: 8, weight: 2, tags: ['dodge', 'tokens'],
    rows: ['...', 'X.X', 'XTX', '...', '...', '...', '...', '.X.', '.X.', 'T.T', '...', '...'] },
  { id: 'tunnel-trays', zones: [1], minTier: 2, maxTier: 8, weight: 2, tags: ['slide', 'jump'], mirror: true,
    rows: ['...', 'oob', '...', '...', '...', '...', '...', '...', '...', 'boo', '...', '...', '...'] },

  // ---- Building site (zone 2) --------------------------------------------------------------
  { id: 'build-containers', zones: [2], minTier: 0, maxTier: 8, weight: 3, tags: ['dodge', 'tokens'], mirror: true,
    rows: ['...', 'XX.', 'XXT', '..T', '...', '...', '...', '...'] },
  { id: 'build-scaffold', zones: [2], minTier: 0, maxTier: 8, weight: 2, tags: ['slide'],
    rows: ['...', '...', 'ooo', '...', '...', '...', '...', '...'] },
  { id: 'build-pallets', zones: [2], minTier: 0, maxTier: 6, weight: 2, tags: ['jump', 'tokens'], mirror: true,
    rows: ['...', 'j.X', '..X', '...', '...', '.T.', '.T.', '...'] },
  { id: 'build-yard', zones: [2], minTier: 2, maxTier: 8, weight: 2, tags: ['dodge'],
    rows: ['...', 'X.X', 'X.X', '...', '...', '...', '...', '...', '.X.', '.X.', '...', '...'] },

  // ---- Drill site (zone 3) -----------------------------------------------------------------
  { id: 'drill-rigs', zones: [3], minTier: 0, maxTier: 8, weight: 3, tags: ['dodge', 'tokens'], mirror: true,
    rows: ['...', 'X.X', '.T.', '.T.', '...', '...', '...', '...', '...', 'XX.', '..T', '...'] },
  { id: 'drill-rocks', zones: [3], minTier: 0, maxTier: 8, weight: 2, tags: ['jump'],
    rows: ['...', 'bjb', '...', '...', '...', '...', '...', '...'] },
  { id: 'drill-maze', zones: [3], minTier: 1, maxTier: 8, weight: 2, tags: ['dodge'],
    rows: ['...', 'X.X', '...', '...', '...', '...', '.X.', '.X.', '...', '...', '...', '...', 'X.X', '...'] },
  { id: 'drill-pipes', zones: [3], minTier: 1, maxTier: 8, weight: 2, tags: ['slide', 'dodge'], mirror: true,
    rows: ['...', 'Xo.', 'X..', '...', '...', '...', '...', '...', '...'] },

  // ---- Bridge (zone 4) ---------------------------------------------------------------------
  { id: 'bridge-girders', zones: [4], minTier: 0, maxTier: 8, weight: 3, tags: ['slide'],
    rows: ['...', 'ooo', '...', '...', '...', '...', '...', '.T.', '...'] },
  { id: 'bridge-lifts', zones: [4], minTier: 0, maxTier: 8, weight: 2, tags: ['dodge', 'tokens'], mirror: true,
    rows: ['...', 'X..', 'X.T', '..T', '...', '...', '...'] },
  { id: 'bridge-barriers', zones: [4], minTier: 1, maxTier: 8, weight: 2, tags: ['jump', 'dodge'], mirror: true,
    rows: ['...', 'bbX', '..X', '...', '...', '...', '...', '...', '...'] },
];

/** Moving hazards and ramps/platforms (Phase 8). Moving cells mark the lane the hazard occupies on arrival. */
export const ADVANCED_PATTERN_DEFS: readonly PatternDef[] = [
  { id: 'move-oncoming-center', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['moving'],
    rows: ['...', '...', '.m.', '...', '...', '...', '...', '...'] },
  { id: 'move-oncoming-side', zones: ALL, minTier: 1, maxTier: 8, weight: 2, tags: ['moving', 'tokens'], mirror: true,
    rows: ['...', '.T.', 'mT.', '.T.', '...', '...', '...'] },
  { id: 'move-pair', zones: ALL, minTier: 3, maxTier: 8, weight: 2, tags: ['moving'], mirror: true,
    rows: ['...', 'm..', '...', '...', '...', '...', '...', '...', '..m', '...', '...', '...', '...'] },
  { id: 'move-with-block', zones: ALL, minTier: 3, maxTier: 8, weight: 2, tags: ['moving', 'dodge'], mirror: true,
    rows: ['...', 'Xm.', 'X..', '...', '...', '...', '...', '...', '...'] },
  { id: 'move-gate', zones: ALL, minTier: 2, maxTier: 8, weight: 2, tags: ['moving', 'tokens'], mirror: true,
    rows: ['...', 'T..', 'T.m', 'T..', '...', '...', '...'] },
  { id: 'move-then-jump', zones: ALL, minTier: 4, maxTier: 8, weight: 2, tags: ['moving', 'jump'],
    rows: ['...', '.m.', '...', '...', '...', '...', '...', '...', 'bjb', '...', '...', '...'] },
  { id: 'ramp-roof-side', zones: [0, 2, 3, 4], minTier: 0, maxTier: 8, weight: 3, tags: ['ramp', 'tokens'], mirror: true,
    rows: ['...', 'r..', 'R..', 'R..', 'R..', '...', '...', '...', '...'] },
  { id: 'ramp-roof-center', zones: [0, 2, 3, 4], minTier: 0, maxTier: 8, weight: 2, tags: ['ramp', 'tokens'],
    rows: ['...', '.r.', '.R.', '.R.', '.R.', '.R.', '...', '...', '...', '...'] },
  { id: 'ramp-over-blocks', zones: [2], minTier: 2, maxTier: 8, weight: 2, tags: ['ramp', 'dodge'], mirror: true,
    rows: ['...', 'r..', 'RX.', 'RX.', 'R..', '...', '...', '...', '...', '...'] },
  { id: 'ramp-escape', zones: [0, 2, 4], minTier: 2, maxTier: 8, weight: 2, tags: ['ramp', 'dodge'], mirror: true,
    rows: ['...', '.rX', '.RX', '.RX', '.R.', '...', '...', '...', '...', '...'] },
  { id: 'ramp-twin', zones: [2, 3], minTier: 1, maxTier: 8, weight: 2, tags: ['ramp'],
    rows: ['...', 'r.r', 'R.R', 'R.R', 'R.R', '...', '...', '...', '...'] },
  { id: 'ramp-then-jump', zones: [0, 2, 3, 4], minTier: 3, maxTier: 8, weight: 1, tags: ['ramp', 'jump'],
    rows: ['...', '.r.', '.R.', '.R.', '...', '...', '...', '...', '...', 'bjb', '...', '...', '...'] },
];
