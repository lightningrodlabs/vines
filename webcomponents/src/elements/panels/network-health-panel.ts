import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

import '@weblogin/trendchart-elements';
import {NetworkMetrics, TransportStats} from "@holochain/client";
import {NetworkCaller} from "@ddd-qc/lit-happ/dist/NetworkCaller";
import {consume} from "@lit/context";
import {networkCallerContext} from "../../contexts";
import Switch from "@ui5/webcomponents/dist/Switch";
import {NetworkInfoResponse} from "@ddd-qc/lit-happ";


function intoLine(numbers: number[]): string {
    //const startingZero = numbers.length > 1? "" : "0,";
    if (numbers.length < 20) {
        numbers = [...Array(20 - numbers.length).fill(0), ...numbers];
    }
    return "[" + numbers.join(", ") + "]";
}

/**
 * @element
 */
@customElement("network-health-panel")
export class NetworkHealthPanel extends LitElement {

  @consume({context: networkCallerContext, subscribe: true})
  @property() networkCaller!: NetworkCaller;


  /** After first render only */
  override async firstUpdated() {
    /** Register loop callback */
    this.networkCaller!.addCallback((r: NetworkInfoResponse) => {
      //console.log("networkInfo:", info);
        if (r.error != undefined) {
            console.log("networkCaller failed: ", r.error);
            this.networkCaller.stopCallLoop();
        } else {
            this.requestUpdate();
        }
    });
    // /** Start looping at init */
    //this.onSwitchNetworkInfo(undefined);
  }


  /** */
  async onSwitchNetworkInfo(_e: any) {
    console.log("onSwitchNetworkInfo()");
    const el = this.shadowRoot!.getElementById("enableSwitch") as Switch;
    this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {
      detail: el? el.checked : true,
      bubbles: true,
      composed: true
    }));
  }


  /** */
  override render() {
    //console.log("<network-health>.render()",  !!this.networkCaller, this.networkCaller.networkInfoLogs.length);
    if (!this.networkCaller) {
      return html`no networkCaller set`;
    }

    /** Network Metrics */
    const allMetricsLogs = this.networkCaller.networkMetricsLogs;
    let latestMetrics: NetworkMetrics = {
      fetch_state_summary: {
        pending_requests: {},
        peers_on_backoff: new Map(),
      },
      gossip_state_summary: {
        accepted_rounds: [],
        dht_summary: {},
        peer_meta: {},
      },
      local_agents: [],
    }
    if (allMetricsLogs.length != 0) {
      latestMetrics = allMetricsLogs[allMetricsLogs.length - 1]![1];
    }


    /** Network Stats */
    const allStatsLogs = this.networkCaller.networkStatsLogs;
    let latestStats: TransportStats = {backend: "unknown", peer_urls: [], connections: []};
    if (allStatsLogs.length != 0) {
        latestStats = allStatsLogs[allStatsLogs.length - 1]![1];
    }
    const connectedPeerCount = latestStats.connections.length;
    const allPeerCount = Object.keys(latestMetrics.gossip_state_summary.peer_meta).length;

    const pendingRequestsCount = Object.values(latestMetrics.fetch_state_summary.pending_requests).length;
    const allPendingRequestsCount: number[] = Object.values(this.networkCaller.networkMetricsLogs).map(([_ts, stats]) => Object.values(stats.fetch_state_summary.pending_requests).length);
    //const allPendingRequestsCount = [0,1,2,50,10,85,20,5,48]; // testing values
    const pendingRequestsLine = intoLine(allPendingRequestsCount);
    //console.debug("<network-health>.render()", pendingRequestsLine);

    const totalSendBytes = Math.round(Object.values(latestStats.connections).reduce((sum, connection) =>  sum + connection.send_bytes, 0) / 1024);
    const alltotalSendBytes: number[] = Object.values(this.networkCaller.networkStatsLogs).map(
        ([_ts, stats]) => Math.round(Object.values(stats.connections).reduce((sum, connection) => sum + connection.send_bytes, 0) / 1024));
      const totalSendBytesDiffs = alltotalSendBytes.slice(0, -1).map((num, index) => alltotalSendBytes[index + 1]! - num);
    const totalSendBytesDiffLine = intoLine(totalSendBytesDiffs);

    const totalSendMsg = Object.values(latestStats.connections).reduce((sum, connection) =>  sum + connection.send_message_count, 0);
    const alltotalSendMsg: number[] = Object.values(this.networkCaller.networkStatsLogs).map(
        ([_ts, stats]) => Object.values(stats.connections).reduce((sum, connection) => sum + connection.send_message_count, 0));
    const totalSendMsgDiffs = alltotalSendMsg.slice(0, -1).map((num, index) => alltotalSendMsg[index + 1]! - num);
    const totalSendMsgDiffLine = intoLine(totalSendMsgDiffs);


      const totalRcvBytes = Math.round(Object.values(latestStats.connections).reduce((sum, connection) =>  sum + connection.recv_bytes, 0) / 1024);
      const alltotalRcvBytes: number[] = Object.values(this.networkCaller.networkStatsLogs).map(
          ([_ts, stats]) => Math.round(Object.values(stats.connections).reduce((sum, connection) => sum + connection.recv_bytes, 0) / 1024));
      const totalRcvBytesDiffs = alltotalRcvBytes.slice(0, -1).map((num, index) => alltotalRcvBytes[index + 1]! - num);
      const totalRcvBytesDiffLine = intoLine(totalRcvBytesDiffs);

      const totalRcvMsg = Object.values(latestStats.connections).reduce((sum, connection) =>  sum + connection.recv_message_count, 0);
      const alltotalRcvMsg: number[] = Object.values(this.networkCaller.networkStatsLogs).map(
          ([_ts, stats]) => Object.values(stats.connections).reduce((sum, connection) => sum + connection.recv_message_count, 0));
      const totalRcvMsgDiffs = alltotalRcvMsg.slice(0, -1).map((num, index) => alltotalRcvMsg[index + 1]! - num);
      const totalRcvMsgDiffLine = intoLine(totalRcvMsgDiffs);

    // TODO: Change this once Holochain implemented sharding
    let arcPct = 100;
    if (latestMetrics.local_agents.length > 0) {
        const localAgent = latestMetrics.local_agents[0]!;
        // console.debug("target_arc = ", localAgent.target_arc);
        if (!localAgent.target_arc || localAgent.target_arc[1] == 0) {
            arcPct = 0;
        }
    }

    const latest_peer_metas = Object.values(latestMetrics.gossip_state_summary.peer_meta);
    const highestRoundCount = Math.max(...Array.from(latest_peer_metas).map(obj => obj.completed_rounds ?? 0));


    /** */
    return html`
        <div id="pies">
          <div class="item">
            <div class="chart">
                <tc-pie id="peer-pie" values="[${connectedPeerCount}]" shape-size="6" .max=${allPeerCount} static=""></tc-pie>
                <ui5-icon class="pie-icon" name="person-placeholder"></ui5-icon>
            </div>
            <div style="padding-top:5px;">
              <span>${connectedPeerCount} / ${allPeerCount}</span>
              <br/>
              <span>Peers</span>
            </div>
          </div>
          <div class="item">
              <div class="chart">
                  <tc-pie id="arc-pie" values="[${arcPct}]" shape-size="6" max="100" static=""></tc-pie>
                  <ui5-icon class="pie-icon" name="cloud"></ui5-icon>
              </div>
              <div style="padding-top:5px;">
                <span>${arcPct}%</span>
                <br/>
                <span>Arc</span>
              </div>
          </div>
            <div style="flex-grow: 1"></div>
           <div class="item">gossip rounds: ${highestRoundCount}</div>
          <!-- <ui5-switch id="enableSwitch" ?checked=${this.networkCaller.isLooping()} @change=${this.onSwitchNetworkInfo}></ui5-switch> -->
        </div>
        
        <div class="line-stats">
            <div class="double-title">
                <div class="double-main-title">Cumulative Bytes Transmitted</div>
                <div style="display: flex; flex-direction: row; gap:5px;">
                    <div class="orange">Send: ${totalSendBytes} KB</div>
                    <div class="blue">Recv: ${totalRcvBytes} KB</div>
                </div>
            </div>
            <div class="double-line">
              <tc-line class="send" values=${totalSendBytesDiffLine} tooltip="@V KB" min="0"></tc-line>
              <tc-line class="recv" values=${totalRcvBytesDiffLine} tooltip="@V KB" min="0"></tc-line>
            </div>
        </div>

        <div class="line-stats">
            <div class="double-title">
                <div class="double-main-title">Cumulative Messages Transmitted</div>
                <div style="display: flex; flex-direction: row; gap:5px;">
                    <div class="orange">Send: ${totalSendMsg}</div>
                    <div class="blue">Recv: ${totalRcvMsg}</div>
                </div>
            </div>
            <div class="double-line">
            <tc-line class="send" values=${totalSendMsgDiffLine} tooltip="@V" min="0"></tc-line>
            <tc-line class="recv" values=${totalRcvMsgDiffLine} tooltip="@V" min="0"></tc-line>
            </div>
        </div>

        <div class="line-stats">
            <div class="title">
                <div class="line-title">
                    <div>${pendingRequestsCount}</div>
                    <div>Pending requests</div>
                </div>
                <ui5-icon name="product" style="height: 1.5rem; width: 1.5rem;"></ui5-icon>
            </div>
            <tc-line class="tc-line-basic" values=${pendingRequestsLine} tooltip="@V" min="0"></tc-line>
        </div>        
    `;
  }


  /** */
  static override get styles() {
    return [
      css`
          :host {
              display: flex;
              flex-direction: column;
              gap: 12px;
              width: 580px;
              padding-right: 5px;
              margin-bottom: 10px;
              /*overflow: clip;*/
          }
            .orange {
                color: #FFFFFF;
                font-weight: bold;
                padding: 0.4rem 0.6rem;
                border-radius: 0.3rem;
                background-color: #FA7317
            }
          
          .blue {
              color: #FFFFFF;
              font-weight: bold;
              padding: 0.4rem 0.6rem;
              border-radius: 0.3rem;
              background-color: rgba(0, 145, 255, 0.71);
          }
          
          .double-main-title {
              font-weight: bold;
          }
          .double-title {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              line-height: 1;
              margin: 0.5rem 2rem 0.5rem 2rem;
          }
          
          .title {
              display: flex;
              flex-direction: row;
              padding: 8px;
          }

          .line-title {
              display: flex;
              flex-direction: column;
              flex-grow: 1;
          }

          #pies {
              display: flex;
              flex-direction: row;
              gap: 15px;
          }

          .chart {
              width: 3rem;
              height: 3rem;
              box-sizing: border-box;
          }

          .item {
              display: flex;
              flex-direction: row;
              gap: 6px;
          }

          #peer-pie {
              --shape-color: #51A7E1;
              --area-color: #000000;
              --area-opacity: 0.1;
              width: 100%;
              height: 100%;
          }

          #arc-pie {
              --shape-color: #c52f2f;
              --area-color: #000000;
              --area-opacity: 0.1;
              width: 100%;
              height: 100%;
          }

          .pie-icon {
              width: 100%;
              margin-top: -35px;
              margin-bottom: 50px;
          }

          .line-stats {
              background: rgb(242, 242, 242);
              border-radius: 15px;
          }

          tc-line {
              width: 100%;
              padding-bottom: 7px;
              box-sizing: border-box;
          }

          .tc-line-basic {
              --area-color: #a4c1e6;
              --area-opacity: 0.5;
          }

          .line-stats {
              display: flex;
              flex-flow: column nowrap;
              justify-content: flex-start;
              border: 0.1rem solid #dce1e5;
              background-color: #FFFFFF;
          }

          .double-line {
              display: block;
              position: relative;
              z-index: 1;
              height: 10rem;
              margin: auto -0.1rem -0.1rem -0.1rem;
          }

          .send {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 101;
              --area-color: #FA7317;
              --shape-color: #FFFFFF;
              --area-opacity: 0.8;
              --point-inner-color: var(--area-color);
              --point-border-color: var(--shape-color);
          }

          .recv {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 102;
              --area-color: rgba(0, 145, 255, 0.71);
              --shape-color: #FFFFFF;
              --area-opacity: 0.8;
              --point-inner-color: var(--area-color);
              --point-border-color: var(--shape-color);
          }
      `,

    ];
  }

}
