export type GameState =
  'Boot' | 'Menu' | 'Countdown' | 'Playing' | 'Paused' | 'Crashing' | 'GameOver';

const ALLOWED: Record<GameState, readonly GameState[]> = {
  Boot: ['Menu', 'Playing'],
  Menu: ['Countdown', 'Playing'],
  Countdown: ['Playing', 'Menu'],
  Playing: ['Paused', 'Crashing'],
  Paused: ['Playing', 'Menu'],
  Crashing: ['GameOver'],
  GameOver: ['Menu', 'Countdown', 'Playing'],
};

export class StateMachine {
  private current: GameState = 'Boot';
  private listeners: Array<(next: GameState, prev: GameState) => void> = [];

  get state(): GameState {
    return this.current;
  }

  onChange(fn: (next: GameState, prev: GameState) => void): void {
    this.listeners.push(fn);
  }

  can(next: GameState): boolean {
    return ALLOWED[this.current].includes(next);
  }

  go(next: GameState): boolean {
    if (!this.can(next)) return false;
    const prev = this.current;
    this.current = next;
    for (const fn of this.listeners) fn(next, prev);
    return true;
  }
}
