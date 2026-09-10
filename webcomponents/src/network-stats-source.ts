import {TransportStats} from "@holochain/client";


/**
 * Transport stats for the peer list and the network health panel, from one place.
 *
 * Inside Moss 0.15 nothing feeds this: its WeaveServices has no network-stats
 * feed (that arrived with the 0.7 line). So isFresh() stays false and
 * vines-page asks for stats itself while one of its views is open. Outside Moss (Tauri, a plain
 * browser) vines-app feeds this from the NetworkCaller loop when it runs.
 *
 * Only transport stats -- connections, bytes, messages. The gossip and fetch
 * metrics the health panel also charts are not something Moss provides; those
 * still come from NetworkCaller.networkMetricsLogs.
 */
export class NetworkStatsSource {

  private _logs: [number, TransportStats][] = [];
  private _callbacks: Set<() => void> = new Set();
  private _lastUpdateAt: number = 0;

  constructor(private readonly _capacity: number = 20, readonly fromMoss: boolean = false) {}

  /** Oldest first, same [timestamp, stats] shape as NetworkCaller.networkStatsLogs. */
  get logs(): [number, TransportStats][] {
    return this._logs;
  }

  /** */
  latest(): TransportStats | undefined {
    return this._logs.length? this._logs[this._logs.length - 1]![1] : undefined;
  }

  /** */
  add(stats: TransportStats): void {
    this._lastUpdateAt = Date.now();
    this._logs.push([this._lastUpdateAt, stats]);
    if (this._logs.length > this._capacity) {
      this._logs.splice(0, this._logs.length - this._capacity);
    }
    for (const cb of this._callbacks) {
      try {
        cb();
      } catch (e) {
        console.error("NetworkStatsSource callback failed", e);
      }
    }
  }

  /** True when stats arrived within the last `ms`. */
  isFresh(ms: number): boolean {
    return Date.now() - this._lastUpdateAt < ms;
  }

  /** Returns an unsubscribe function. */
  onUpdate(cb: () => void): () => void {
    this._callbacks.add(cb);
    return () => {this._callbacks.delete(cb);};
  }
}
