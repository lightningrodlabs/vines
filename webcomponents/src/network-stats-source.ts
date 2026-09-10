import {TransportStats} from "@holochain/client";


/**
 * Transport stats for the peer list and the network health panel, from one place.
 *
 * Inside Moss they come from WeaveServices.onNetworkStatsUpdate -- but Moss only
 * sends them while its own debugging panel is open: pollNetworkStats() lives in
 * debugging-panel.ts and is the only thing that emits network-stats-update. So
 * isFresh() lets an open vines view tell whether anyone is feeding this, and
 * vines-page asks for stats itself when nobody is. Outside Moss (Tauri, a plain
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
