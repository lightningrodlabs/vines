import {html, css, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {localized, msg} from '@lit/localize';

import {AgentId, NetworkInfoResponse, ZomeElement} from "@ddd-qc/lit-happ";

import "@shoelace-style/shoelace/dist/components/avatar/avatar.js"
import "@shoelace-style/shoelace/dist/components/badge/badge.js"
import "@shoelace-style/shoelace/dist/components/tooltip/tooltip.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import {Profile as ProfileMat, ProfilesAltPerspective, ProfilesAltZvm,} from "@ddd-qc/profiles-dvm";
import {renderProfileAvatar} from "../render";
import {
    AgentPubKeyB64,
    NetworkMetrics,
    Timestamp,
    TransportStats
} from "@holochain/client";
import {consume} from "@lit/context";
import {networkCallerContext} from "../contexts";
import {NetworkCaller} from "@ddd-qc/lit-happ/dist/NetworkCaller";
import {timeSince} from "../features/timezone/utils";


type PeerStatus = {
    //isConnected: boolean, // make two categories
    isDirect: boolean, // display tag
    lastSeenGossip: Timestamp, // display if not connected
    errors: number, //display warning icon if errors > 0
    completedRounds: number, // display number when hovered

    connectedSince: Timestamp, // tooltip
    hasMeta: boolean,
}


/** @element peer-list */
@localized()
@customElement("peer-list")
export class PeerList extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME);
  }

  @consume({context: networkCallerContext, subscribe: true})
  @property() networkCaller!: NetworkCaller;

  @property({type: Boolean}) self: boolean = false;


    /** After first render only */
    override async firstUpdated() {
        /** Register loop callback */
        this.networkCaller!.addCallback((r: NetworkInfoResponse) => {
            //console.log("TransportStats:", s.peer_urls);
            //console.log("NetworkMetrics:", m.gossip_state_summary.peer_meta);
            if (r.error != undefined) {
                // n/a
            } else {
                this.requestUpdate();
            }
        });
    }


    _peerStatusMap: Map<AgentPubKeyB64, PeerStatus> = new Map();

    /** Update peerStatusMap before render */
    override async willUpdate(_changedProperties: Map<string | number | symbol, unknown>) {
        if (this.perspective.profiles.size <= 1) {
            return;
        }
        /** Build peer status map */
        if (this.networkCaller.networkMetricsLogs.length != 0 && this.networkCaller.networkStatsLogs.length != 0) {
            let latestStats: TransportStats = this.networkCaller.networkStatsLogs[this.networkCaller.networkStatsLogs.length - 1]![1];
            let latestMetrics: NetworkMetrics = this.networkCaller.networkMetricsLogs[this.networkCaller.networkMetricsLogs.length - 1]![1];

            // remap peerMeta map to use pub key instead of peer url
            const peerMetaMap = Object.fromEntries(
                Object.entries(latestMetrics.gossip_state_summary.peer_meta).map(([key, value]) => {
                    const newKey = key.split('/').at(-1) ?? key;
                    return [newKey, value];
                })
            );
            for (const connection of latestStats.connections) {
                const thisAgentPeerMeta = peerMetaMap[connection.pub_key];
                const peerStatus: PeerStatus = {
                    isDirect: connection.is_direct,
                    connectedSince: connection.opened_at_s,
                    hasMeta: false,
                    errors: 0,
                    completedRounds: 0,
                    lastSeenGossip: 0,
                }
                if (thisAgentPeerMeta) {
                    peerStatus.hasMeta = true;
                    peerStatus.completedRounds = thisAgentPeerMeta.completed_rounds ?? 0;
                    peerStatus.lastSeenGossip = thisAgentPeerMeta.last_gossip_timestamp ?? 0;
                    peerStatus.errors
                        = (thisAgentPeerMeta.local_errors ?? 0)
                        + (thisAgentPeerMeta.peer_busy ?? 0)
                        + (thisAgentPeerMeta.peer_terminated ?? 0)
                        + (thisAgentPeerMeta.peer_timeouts ?? 0)
                        + (thisAgentPeerMeta.peer_behavior_errors ?? 0)
                    ;
                }
                const agentId = await this.networkCaller.peerKeyToAgentId(connection.pub_key);
                if (agentId) {
                    this._peerStatusMap.set(agentId.b64, peerStatus);
                }
            }
        }
    }


  /** */
  override render() {
    //console.debug("<peer-list>.render()", this.perspective);
    const netLogCount = this.networkCaller.networkMetricsLogs.length;
    const peerCount = netLogCount > 0
      ? Object.keys(this.networkCaller.networkMetricsLogs[netLogCount - 1]![1].gossip_state_summary.peer_meta).length
      : 0;

    const importedProfiles = new Set<AgentPubKeyB64>();
    for (const [ah, [profile, _ts]] of this.perspective.profiles.entries()) {
      if (profile.fields["imported"]) {
        importedProfiles.add(ah.b64);
      }
    }
    const profilesCount = Math.max(this.perspective.profiles.size - importedProfiles.size - 1 , 0); // remove self
    //console.debug("<peer-list>.render() profilesCount", profilesCount, importedProfiles.size);

    if (profilesCount == 0) {
        if (peerCount > 0) {
        return html`
          <div class="folks" style="color: #7d7d7d">
              ${msg('No registered peers found')}
          </div>`;
        }
      return html`
          <div class="folks" style="color: #7d7d7d">
              ${msg('No peers found')}
          </div>`;
    }

    /** Build peer list */
    const peers: [AgentId, PeerStatus | undefined, ProfileMat, Timestamp][] = [];
    for (const [agentId, profileId] of this.perspective.profileByAgent.entries()) {
      /* exclude self */
      if (!this.self && agentId.equals(this.cell.address.agentId)) {
        continue;
      }
      /* exclude imported profiles */
      if (importedProfiles.has(profileId.b64)) {
          continue;
      }
      const pair = this.perspective.profiles.get(profileId);
      if (!pair) {
        continue;
      }
      peers.push([agentId, this._peerStatusMap.get(agentId.b64), pair[0], pair[1]]);
    }

    //console.debug("peerStatusMap", this._peerStatusMap, peers);

    /** render each peer */
    const onlinePeerElems: TemplateResult<1>[] = [];
    const offlinePeerElems: TemplateResult<1>[] = [];

    peers.map(([agentId, status, profile, _ts]) => {
        let statusContent = [html``];
        /** Check if profile is hidden */
        const item = localStorage.getItem("hide-" + agentId.b64);
        const isHidden = item !== null ? JSON.parse(item) : false;
        if (isHidden) {
          return;
        }
        /** */
        if (status && this.networkCaller!.isLooping()) {
            const date = new Date(status.connectedSince * 1000); // Timestamp is in seconds, Date wants milliseconds
            statusContent.push(html`<div style="align-content:center;">(${msg('since')} ${timeSince(date)})</div>`);
            // if (!status.hasMeta || status.errors > 0) {
            //     // statusContent.push(html`<ui5-icon name="warning" show-tool-tip accessible-name=${status.errors}></ui5-icon>`);
            //     statusContent.push(html`<div>${status.errors}</div>`);
            // }
            if (status.isDirect) {
                statusContent.push(html`<div style="max-height:15px; align-content:center; background-color:green; border-radius:8px; color:white; padding:5px; font-size:small">${msg('Connected')}</div>`);
            }
        }
        const elem = html`
          <li class="folk" 
              style="display:flex; align-items:center; flex-direction:row"
              @click=${(_e: any) => this.dispatchEvent(new CustomEvent<AgentId>('avatar-clicked', {
                  detail: agentId,
                  bubbles: true,
                  composed: true
            }))}>
            ${renderProfileAvatar(this, null, profile, "S")}
            <div style="width:100%; display:flex; flex-direction:row; gap:5px;">
              <div style="align-content:center; margin-left:10px; margin-right:7px; font-size:16px; font-weight:bold; -webkit-text-stroke:0.1px black;">${profile.nickname}</div>
              <div style="flex-grow: 1"></div>
              <ui5-button icon="hide" tooltip=${msg("Hide")} design="Transparent"
                          style="border:none;"
                          @click="${(e: any) => {
                                console.log("Hiding agent", agentId.b64);
                                e.preventDefault(); e.stopPropagation();
                                localStorage.setItem("hide-" + agentId.b64, JSON.stringify(true));
                                this.requestUpdate();
                          }}"></ui5-button>
              ${statusContent}
            </div>
          </li>
        `;
        if (status) {
            onlinePeerElems.push(elem);
        } else {
            offlinePeerElems.push(elem);
        }
      })

      /** render all */
      if (!this.networkCaller.isLooping()) {
          return html`
              <div class="folks">
                  ${onlinePeerElems}
                  ${offlinePeerElems}
                  ${peerCount <= profilesCount
                          ? html``
                          : html`<div style="text-align:center">${peerCount - profilesCount} ${msg('unregistered peer(s)')}</div>` }
              </div>              
          `;
      }
      return html`
        <div class="folks">
          <div class="category-title">${msg('Online')}</div>
          ${onlinePeerElems}
          <div class="category-title" style="margin-top:20px;">${msg('Offline')}</div>
          ${offlinePeerElems}
          ${peerCount <= profilesCount
                  ? html``
                  : html`<div style="text-align:center">${peerCount - profilesCount} ${msg('unregistered peer(s)')}</div>`  }
      </div>
    `
  }


  /** */
  static override get styles() {
    return [
      css`
          .category-title {
              color: #9f9f9f;
              font-size: large;
              padding:5px;
          }          
          
        .folks {
          overflow-y: auto;
        }
          
        .folk {
          list-style: none;
          margin: 2px;
          /*text-align: center;*/
          font-size: 70%;
          cursor: pointer;
        }

        .folk:hover {
          background: rgba(202, 230, 250, 0.66);
        }

        .folk > img {
          width: 50px;
          border-radius: 10000px;
        }

        .avatar-badge {
          margin-left: -15px;
          vertical-align: bottom;
        }

        .avatar-badge::part(base) {
          border: 1px solid;
          padding-top: 10px;
        }

        sl-tooltip {
          display: inline;
        }

          li div ui5-button {
              visibility: hidden;
          }

          li:hover div ui5-button {
              visibility: visible;
          }          
      `
    ];
  }
}
