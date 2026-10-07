export type ObstacleClass = 'low' | 'overhead' | 'block' | 'moving' | 'ramp' | 'platform';
export type Severity = 'stumble' | 'crash';
export type MoveKind = 'none' | 'oncoming' | 'swing' | 'roll' | 'sweep';

export interface ObstacleKind {
  id: string;
  cls: ObstacleClass;
  /** Collision box in metres; bottom is the height of the underside (overhead). */
  w: number;
  h: number;
  d: number;
  bottom: number;
  severity: Severity;
  /** Rows (of 4 m) a block occupies along the track. */
  rows: 1 | 2;
  move: MoveKind;
  /** GLB model name in public/models (without extension). */
  model: string;
}

const k = (
  id: string,
  cls: ObstacleClass,
  w: number,
  h: number,
  d: number,
  opts: Partial<Omit<ObstacleKind, 'id' | 'cls' | 'w' | 'h' | 'd'>> = {},
): ObstacleKind => ({
  id,
  cls,
  w,
  h,
  d,
  bottom: 0,
  severity: cls === 'block' || cls === 'platform' ? 'crash' : 'stumble',
  rows: 1,
  move: 'none',
  model: id,
  ...opts,
});

export const OBSTACLES = [
  // low: jump over
  k('jersey_barrier', 'low', 2.1, 0.85, 0.6),
  k('cone_cluster', 'low', 2.0, 0.75, 0.9),
  k('barrel_row', 'low', 2.0, 0.9, 0.7),
  k('brick_pallet', 'low', 1.9, 0.85, 1.2),
  k('pipe_stack', 'low', 2.0, 0.8, 1.0),
  k('sandbag_wall', 'low', 2.0, 0.7, 0.8),
  k('wheelbarrow', 'low', 1.6, 0.8, 1.4),
  k('toolbox_crate', 'low', 1.7, 0.8, 0.9),
  k('rock_pile', 'low', 2.0, 0.85, 1.4),
  // overhead: slide under (bottom at 1.2 m)
  k('height_gantry', 'overhead', 2.3, 0.6, 0.6, { bottom: 1.2 }),
  k('vent_duct', 'overhead', 2.3, 0.9, 1.2, { bottom: 1.2 }),
  k('cable_tray', 'overhead', 2.3, 0.5, 0.8, { bottom: 1.2 }),
  k('scaffold_beam', 'overhead', 2.3, 0.5, 0.6, { bottom: 1.2 }),
  k('pipe_bundle', 'overhead', 2.2, 0.8, 1.0, { bottom: 1.2 }),
  k('girder', 'overhead', 2.4, 0.7, 0.8, { bottom: 1.2 }),
  // block: change lane (boots can clear h <= 2.5)
  k('excavator', 'block', 2.2, 3.2, 3.6),
  k('road_roller', 'block', 2.0, 2.4, 3.4),
  k('site_cabin', 'block', 2.3, 2.8, 3.6),
  k('mine_cart', 'block', 1.8, 1.9, 3.0),
  k('segment_stack', 'block', 2.2, 2.4, 3.0),
  k('drill_rig', 'block', 2.2, 3.4, 3.6),
  k('bulldozer', 'block', 2.2, 2.6, 3.6),
  k('scissor_lift', 'block', 2.0, 2.6, 3.0),
  k('dump_truck', 'block', 2.2, 3.0, 7.0, { rows: 2 }),
  k('container', 'block', 2.3, 2.6, 7.2, { rows: 2 }),
  k('mixer_truck', 'block', 2.2, 3.2, 7.0, { rows: 2 }),
  // moving hazards
  k('oncoming_truck', 'moving', 2.2, 3.0, 7.0, {
    move: 'oncoming',
    severity: 'crash',
    model: 'dump_truck',
  }),
  k('oncoming_cart', 'moving', 1.8, 1.9, 3.0, {
    move: 'oncoming',
    severity: 'crash',
    model: 'mine_cart',
  }),
  k('rolling_pipe', 'moving', 2.0, 1.3, 1.3, { move: 'roll', severity: 'stumble' }),
  k('crane_load', 'moving', 2.0, 1.5, 1.6, { move: 'swing', severity: 'stumble', bottom: 0.3 }),
  k('sweep_arm', 'moving', 2.2, 1.2, 1.0, { move: 'sweep', severity: 'stumble', bottom: 0.4 }),
  // ramps and platforms
  k('ramp', 'ramp', 2.2, 2.6, 4.0),
  k('container_platform', 'platform', 2.3, 2.6, 4.0),
] as const satisfies readonly ObstacleKind[];

export type ObstacleId = (typeof OBSTACLES)[number]['id'];

export const OBSTACLE_INDEX: Record<string, number> = Object.fromEntries(
  OBSTACLES.map((o, i) => [o.id, i]),
);

export function obstacleKind(index: number): ObstacleKind {
  const o = OBSTACLES[index];
  if (!o) throw new Error(`unknown obstacle ${index}`);
  return o;
}
