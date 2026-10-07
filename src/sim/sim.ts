import { TUNING } from '../data/tuning';
import { EventQueue } from './events';
import {
  createPlayer,
  queueCommand,
  stepPlayer,
  type PlayerCommand,
  type PlayerState,
} from './player';
import { speedAt } from './speed';

/** The whole game simulation. Pure: no three.js, no DOM. */
export class Sim {
  readonly events = new EventQueue();
  player: PlayerState = createPlayer();
  elapsed = 0;
  distance = 0;
  speed: number = TUNING.speed.start;
  private readonly ctx = { superJump: false, groundAt: (_x: number) => 0 };

  reset(): void {
    this.player = createPlayer();
    this.elapsed = 0;
    this.distance = 0;
    this.speed = TUNING.speed.start;
    this.events.clear();
  }

  command(cmd: PlayerCommand): void {
    queueCommand(this.player, cmd);
  }

  step(dt: number): void {
    this.elapsed += dt;
    this.speed = speedAt(this.elapsed);
    this.distance += this.speed * dt;
    stepPlayer(this.player, dt, this.ctx, this.events);
  }
}
