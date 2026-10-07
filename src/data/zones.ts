import type { ObstacleId } from './obstacles';

export interface ZoneDef {
  id: string;
  name: string;
  props: {
    low: readonly ObstacleId[];
    overhead: readonly ObstacleId[];
    block: readonly ObstacleId[];
    moving: readonly ObstacleId[];
  };
  /** Side scenery model names and how often they appear per row (0..1). */
  scenery: readonly { model: string; chance: number; minX: number; maxX: number; scale?: number }[];
  /** Repeating structure around the track every N rows (tunnel rings, bridge trusses). */
  frame?: { model: string; everyRows: number };
  look: {
    skyTop: number;
    skyBottom: number;
    fog: number;
    fogNear: number;
    fogFar: number;
    sun: number;
    sunIntensity: number;
    ambientSky: number;
    ambientGround: number;
    ambientIntensity: number;
    ground: number;
    road: number;
    sunDir: readonly [number, number, number];
    /** 0 = day sky, 1 = enclosed (tunnel), 2 = night (stars). */
    skyMode: 0 | 1 | 2;
  };
  music: { root: number; scale: 'major' | 'minor' | 'dorian' | 'phrygian' | 'mixolydian' };
}

export const ZONES: readonly ZoneDef[] = [
  {
    id: 'road',
    name: 'Road Works',
    props: {
      low: ['jersey_barrier', 'cone_cluster', 'barrel_row'],
      overhead: ['height_gantry'],
      block: ['excavator', 'road_roller', 'dump_truck'],
      moving: ['oncoming_truck'],
    },
    scenery: [
      { model: 'tower_crane', chance: 0.05, minX: 22, maxX: 40 },
      { model: 'building_frame', chance: 0.1, minX: 18, maxX: 34 },
      { model: 'floodlight_tower', chance: 0.12, minX: 6, maxX: 8 },
      { model: 'sign_post', chance: 0.1, minX: 5.5, maxX: 6.5 },
      { model: 'cone', chance: 0.35, minX: 4.3, maxX: 5 },
      { model: 'excavator', chance: 0.05, minX: 9, maxX: 14 },
      { model: 'billboard', chance: 0.04, minX: 10, maxX: 12 },
      { model: 'rubber_duck', chance: 0.006, minX: 6, maxX: 7, scale: 1.5 },
    ],
    look: {
      skyTop: 0x4a90d9,
      skyBottom: 0xcfe6f5,
      fog: 0xcfe0ea,
      fogNear: 45,
      fogFar: 120,
      sun: 0xfff1d6,
      sunIntensity: 2.6,
      ambientSky: 0xdfefff,
      ambientGround: 0x7a6a50,
      ambientIntensity: 1.2,
      ground: 0x9c8b66,
      road: 0x3b3f46,
      sunDir: [-0.5, 1, 0.45],
      skyMode: 0,
    },
    music: { root: 57, scale: 'mixolydian' },
  },
  {
    id: 'tunnel',
    name: 'Tunnel',
    props: {
      low: ['pipe_stack', 'sandbag_wall'],
      overhead: ['vent_duct', 'cable_tray'],
      block: ['mine_cart', 'segment_stack'],
      moving: ['oncoming_cart', 'rolling_pipe'],
    },
    scenery: [
      { model: 'pipe_rack', chance: 0.25, minX: 5.2, maxX: 5.4 },
      { model: 'segment_stack', chance: 0.05, minX: 5.6, maxX: 5.8 },
      { model: 'tbm_cutterhead', chance: 0.015, minX: 6.2, maxX: 6.4 },
    ],
    frame: { model: 'tunnel_ring', everyRows: 2 },
    look: {
      skyTop: 0x1a1d22,
      skyBottom: 0x2a2e35,
      fog: 0x23272e,
      fogNear: 25,
      fogFar: 95,
      sun: 0xffd9a0,
      sunIntensity: 0.9,
      ambientSky: 0xffe2b8,
      ambientGround: 0x3a3a40,
      ambientIntensity: 1.5,
      ground: 0x55524c,
      road: 0x45433f,
      sunDir: [0.1, 1, 0.3],
      skyMode: 1,
    },
    music: { root: 50, scale: 'phrygian' },
  },
  {
    id: 'building',
    name: 'Building Site',
    props: {
      low: ['brick_pallet', 'wheelbarrow'],
      overhead: ['scaffold_beam'],
      block: ['container', 'site_cabin', 'mixer_truck'],
      moving: ['crane_load'],
    },
    scenery: [
      { model: 'tower_crane', chance: 0.06, minX: 18, maxX: 30 },
      { model: 'building_frame', chance: 0.2, minX: 17, maxX: 28 },
      { model: 'scaffold_wall', chance: 0.12, minX: 7, maxX: 8 },
      { model: 'site_cabin', chance: 0.06, minX: 7, maxX: 10 },
      { model: 'brick_pallet', chance: 0.12, minX: 5, maxX: 6.5 },
      { model: 'rubber_duck', chance: 0.006, minX: 6, maxX: 8, scale: 1.5 },
      { model: 'billboard', chance: 0.04, minX: 10, maxX: 12 },
    ],
    look: {
      skyTop: 0x5a6fb0,
      skyBottom: 0xffc48a,
      fog: 0xf0b98a,
      fogNear: 40,
      fogFar: 115,
      sun: 0xffb36b,
      sunIntensity: 2.8,
      ambientSky: 0xffd8b0,
      ambientGround: 0x6a5040,
      ambientIntensity: 1.0,
      ground: 0x8d7a64,
      road: 0x6e6a64,
      sunDir: [0.8, 0.45, -0.2],
      skyMode: 0,
    },
    music: { root: 55, scale: 'major' },
  },
  {
    id: 'drill',
    name: 'Drill Site',
    props: {
      low: ['rock_pile', 'toolbox_crate'],
      overhead: ['pipe_bundle'],
      block: ['drill_rig', 'bulldozer', 'dump_truck'],
      moving: ['sweep_arm', 'rolling_pipe'],
    },
    scenery: [
      { model: 'rock_wall', chance: 0.5, minX: 9, maxX: 11 },
      { model: 'drill_rig', chance: 0.08, minX: 6.5, maxX: 9 },
      { model: 'rock_pile', chance: 0.2, minX: 5, maxX: 7 },
      { model: 'blast_sign', chance: 0.08, minX: 5.5, maxX: 6 },
      { model: 'excavator', chance: 0.05, minX: 8, maxX: 12 },
    ],
    look: {
      skyTop: 0x8a7f78,
      skyBottom: 0xe0a070,
      fog: 0xc89a74,
      fogNear: 30,
      fogFar: 105,
      sun: 0xffc28a,
      sunIntensity: 1.8,
      ambientSky: 0xffd0a8,
      ambientGround: 0x6a4a35,
      ambientIntensity: 1.3,
      ground: 0xa0805e,
      road: 0x8a7258,
      sunDir: [0.3, 0.8, 0.5],
      skyMode: 0,
    },
    music: { root: 52, scale: 'dorian' },
  },
  {
    id: 'bridge',
    name: 'Bridge, Night Shift',
    props: {
      low: ['jersey_barrier', 'cone_cluster'],
      overhead: ['girder'],
      block: ['scissor_lift', 'dump_truck'],
      moving: ['oncoming_truck'],
    },
    scenery: [{ model: 'floodlight_tower', chance: 0.08, minX: 5.6, maxX: 5.8 }],
    frame: { model: 'bridge_truss', everyRows: 3 },
    look: {
      skyTop: 0x05070f,
      skyBottom: 0x1b2440,
      fog: 0x141a2c,
      fogNear: 35,
      fogFar: 110,
      sun: 0xaabbee,
      sunIntensity: 1.1,
      ambientSky: 0x8899cc,
      ambientGround: 0x202030,
      ambientIntensity: 1.1,
      ground: 0x1c2a3a,
      road: 0x2c2f36,
      sunDir: [-0.3, 1, 0.6],
      skyMode: 2,
    },
    music: { root: 53, scale: 'minor' },
  },
];
