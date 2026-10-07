import type { Lane } from '../data/tuning';
import type { MoveKind, ObstacleClass, Severity } from '../data/obstacles';

export interface Obstacle {
  active: boolean;
  kind: number;
  cls: ObstacleClass;
  severity: Severity;
  move: MoveKind;
  lane: Lane;
  /** Track distance at which the obstacle centre reaches the player (z = 0). */
  at: number;
  /** Current world position (updated every step). */
  x: number;
  z: number;
  bottom: number;
  w: number;
  h: number;
  d: number;
  /** Already hit (stumbled over) — ignore further collisions. */
  hit: boolean;
  warned: boolean;
  /** Overlap flags from the previous step, used to classify hits. */
  ox: boolean;
  oz: boolean;
  zone: number;
}

export type PowerupType = 'magnet' | 'jetpack' | 'shield' | 'double' | 'boots' | 'mystery';
export const POWERUP_TYPES: readonly PowerupType[] = [
  'magnet',
  'jetpack',
  'shield',
  'double',
  'boots',
  'mystery',
];

export interface Token {
  active: boolean;
  at: number;
  x: number;
  y: number;
  z: number;
  magnet: boolean;
}

export interface Pickup {
  active: boolean;
  type: PowerupType;
  at: number;
  x: number;
  y: number;
  z: number;
}

export interface Scenery {
  active: boolean;
  model: string;
  at: number;
  x: number;
  z: number;
  rotY: number;
  scale: number;
  /** Sign text index for billboards and signs, -1 otherwise. */
  label: number;
  zone: number;
}

export const newObstacle = (): Obstacle => ({
  active: false,
  kind: 0,
  cls: 'low',
  severity: 'stumble',
  move: 'none',
  lane: 1,
  at: 0,
  x: 0,
  z: 0,
  bottom: 0,
  w: 0,
  h: 0,
  d: 0,
  hit: false,
  warned: false,
  ox: false,
  oz: false,
  zone: 0,
});
export const newToken = (): Token => ({ active: false, at: 0, x: 0, y: 0, z: 0, magnet: false });
export const newPickup = (): Pickup => ({ active: false, type: 'magnet', at: 0, x: 0, y: 0, z: 0 });
export const newScenery = (): Scenery => ({
  active: false,
  model: '',
  at: 0,
  x: 0,
  z: 0,
  rotY: 0,
  scale: 1,
  label: -1,
  zone: 0,
});
