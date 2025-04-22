import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

import '@weblogin/trendchart-elements';
import {NetworkMetrics, Timestamp} from "@holochain/client";
import {NetworkCaller} from "@ddd-qc/lit-happ/dist/NetworkCaller";
import {consume} from "@lit/context";
import {networkCallerContext} from "../../contexts";
import Switch from "@ui5/webcomponents/dist/Switch";


/**
 * @element
 */
@customElement("network-health-panel")
export class NetworkHealthPanel extends LitElement {

  @consume({ context: networkCallerContext, subscribe: true })
  @property() networkCaller!: NetworkCaller;


  /** After first render only */
  override async firstUpdated() {
    /** Register loop callback */
    this.networkCaller!.addCallback((_info: NetworkMetrics) => {
      //console.log("networkInfo:", info);
      this.requestUpdate();
    });
    /** Start looping */
    this.onSwitchNetworkInfo(undefined);
  }


  /** */
  async onSwitchNetworkInfo(_e:any) {
    console.log("onLoopNetworkInfo()");
    const el = this.shadowRoot!.getElementById("enableSwitch") as Switch;
    this.dispatchEvent(new CustomEvent<boolean>('loop-network-info', {detail: el? el.checked: true, bubbles: true, composed: true}));
  }


  /** */
  override render() {
    //console.log("<network-health>.render()",  !!this.networkCaller, this.networkCaller.networkInfoLogs.length);

    if (!this.networkCaller)  {
      return html`no networkCaller set`;
    }

    const allNetworkLogs = this.networkCaller.networkMetricsLogs;

    let latestInfo: NetworkMetrics = {
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
    // @ts-ignore
    let cellLogs: [Timestamp, NetworkMetrics][] = [[0, latestInfo]];
    if (allNetworkLogs.length != 0) {
      cellLogs = allNetworkLogs;
      latestInfo = allNetworkLogs[allNetworkLogs.length - 1]![1];
    }


    const arcPct = 1.0; // FIXME (latestInfo.arc_size * 100).toFixed(0);
    const fetchKB = Object.values(latestInfo.fetch_state_summary.pending_requests).length; // FIXME (latestInfo.fetch_pool_info.op_bytes_to_fetch / 1024).toFixed(0);

    const allFetchKBs: number[] = []; // FIXME cellLogs.map(([_ts, info]) => info.fetch_pool_info.op_bytes_to_fetch / 1024)

    const startingZero = allFetchKBs.length > 1? "" : "0,"

    //const lineValues = "[0,1,2,50,10,85,20,5,48]"; // testing values
    const lineValues = "[" + startingZero + allFetchKBs.join(", ") + "]";
    //console.log("<network-health>.render()", lineValues);

    const peerCount = Object.keys(latestInfo.gossip_state_summary.peer_meta).length; // FIXME

    /** */
    return html`
        <div id="pies">
          <div class="item">
            <div class="chart">
                <tc-pie id="peer-pie" values="[${peerCount}]" shape-size="6" .max=${peerCount} static=""></tc-pie>
                <ui5-icon class="pie-icon" name="person-placeholder"></ui5-icon>
            </div>
            <div>
              <span>${peerCount} / ${peerCount}</span>
              <br/>
              <span>Peers</span>
            </div>
          </div>
          <div class="item">
              <div class="chart">
                  <tc-pie id="arc-pie" values="[${arcPct}]" shape-size="6" max="100" static=""></tc-pie>
                  <ui5-icon class="pie-icon" name="cloud"></ui5-icon>
              </div>
              <div>
                <span>${arcPct}%</span>
                <br/>
                <span>Arc</span>
              </div>
          </div>
          <ui5-switch id="enableSwitch" ?checked=${this.networkCaller.isLooping()} @change=${this.onSwitchNetworkInfo}></ui5-switch>
        </div>
        <div id="fetch">
          <div class="title">
              <div id="fetch-title">
                <div>${fetchKB} KB</div>
                <div>Expected data</div>
              </div>
              <ui5-icon name="product" style="height: 1.5rem; width: 1.5rem;"></ui5-icon>
          </div>
          <tc-line values=${lineValues} tooltip="@V KB" min="0">
          </tc-line>
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
          width: 280px;
          padding-right: 5px;
          /*overflow: clip;*/
        }

        .title {
          display: flex;
          flex-direction: row;
          padding: 8px;
        }
        
        #fetch-title {
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

        #fetch {
          background: rgb(242, 242, 242);
          border-radius: 15px;
        }
        
        tc-line {
          width: 100%;
          padding-bottom: 7px;
          --area-color: #a4c1e6;
          --area-opacity: 0.5;
          box-sizing: border-box;
        }
      `,

    ];
  }

}
