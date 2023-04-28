/**
 * In Holochain Timestamp
 * Only positive values allowed
 */
export class TimeInterval {
  private readonly _begin: number;
  private readonly _end: number;

  constructor(beginning: number, end: number) {
    if (end < beginning) {
      throw Error("Invalid TimeInterval: end < beginning")
    }
    if (beginning < 0) {
      throw Error("Invalid TimeInterval: beginning < 0")
    }

    this._begin = beginning;
    this._end = end;
  }

  get begin(): number {
    return this._begin;
  }

  get end(): number {
    return this._end;
  }


  /** */
  union(other: TimeInterval): TimeInterval | null {
    if (this.intersects(other)) {
      return new TimeInterval(
        Math.min(this._begin, other._begin),
        Math.max(this._end, other._end)
      );
    }
    return null;
  }

  intersect(other: TimeInterval): TimeInterval | null {
    if (this.intersects(other)) {
      return new TimeInterval(
        Math.max(this._begin, other._begin),
        Math.min(this._end, other._end)
      );
    }
    return null;
  }

  intersects(other: TimeInterval): boolean {
    return (
      Math.max(this._begin, other._begin) <= Math.min(this._end, other._end)
    );
  }

  isWithin(other: TimeInterval): boolean {
    return this._begin >= other._begin && this._end <= other._end;
  }

  /** Expand from beginning but without crossing 0 */
  expandBeginning(amount: number): TimeInterval {
    const begin = Math.max(this._begin - amount, 0);
    return new TimeInterval(begin, this._end);
  }

  expandEnd(amount: number): TimeInterval {
    return new TimeInterval(this._begin, this._end + amount);
  }
}
