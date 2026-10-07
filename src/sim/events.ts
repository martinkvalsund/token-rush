export type SimEventType =
  | 'jump'
  | 'land'
  | 'slide'
  | 'lane'
  | 'stumble'
  | 'crash'
  | 'caught'
  | 'token'
  | 'powerup'
  | 'powerupEnd'
  | 'shieldBreak'
  | 'mystery'
  | 'warning'
  | 'zone'
  | 'tier';

export interface SimEvent {
  type: SimEventType;
  /** Free-form payload; meaning depends on type (lane, streak, zone index ...). */
  value: number;
  label: string;
}

/** Fixed pool of events, cleared every frame by the consumer. No allocations while playing. */
export class EventQueue {
  private readonly pool: SimEvent[];
  count = 0;

  constructor(capacity = 64) {
    this.pool = Array.from({ length: capacity }, () => ({ type: 'jump', value: 0, label: '' }));
  }

  push(type: SimEventType, value = 0, label = ''): void {
    const ev = this.pool[this.count];
    if (!ev) return;
    ev.type = type;
    ev.value = value;
    ev.label = label;
    this.count++;
  }

  get(i: number): SimEvent | undefined {
    return i < this.count ? this.pool[i] : undefined;
  }

  clear(): void {
    this.count = 0;
  }
}
