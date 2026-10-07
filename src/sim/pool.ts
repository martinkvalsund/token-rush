/** Fixed-capacity object pool. Items are reused; nothing is allocated after construction. */
export class Pool<T extends { active: boolean }> {
  readonly items: T[];

  constructor(capacity: number, create: () => T) {
    this.items = Array.from({ length: capacity }, create);
  }

  spawn(): T | undefined {
    for (const it of this.items) {
      if (!it.active) {
        it.active = true;
        return it;
      }
    }
    return undefined;
  }

  clear(): void {
    for (const it of this.items) it.active = false;
  }

  countActive(): number {
    let n = 0;
    for (const it of this.items) if (it.active) n++;
    return n;
  }
}
