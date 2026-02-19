import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";

import {sharedStyles} from "../styles";
import {consume} from "@lit/context";
import {NetworkCaller} from "@ddd-qc/lit-happ/dist/NetworkCaller";
import {networkCallerContext} from "../contexts";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ProfilesAltPerspective, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64} from "@holochain/client";


/**
 * @element
 */
@customElement("peer-status-badge")
export class PeerStatusBadge extends ZomeElement<ProfilesAltPerspective, ProfilesAltZvm> {

  /** */
  constructor() {
    super(ProfilesAltZvm.DEFAULT_ZOME_NAME)
  }

  /** -- Properties -- */

  @consume({context: networkCallerContext, subscribe: true})
  @property() networkCaller!: NetworkCaller;

  /** -- Methods -- */

  /** */
  override render() {
    //console.debug("<peer-status-badge>.render()");

      const importedProfiles  = new Set<AgentPubKeyB64>();
      for (const [agentId, [profile, _ts]] of this.perspective.profiles.entries()) {
          if (profile.fields["imported"]) {
              importedProfiles.add(agentId.b64);
          }
      }
      const profilesCount = Math.max(this.perspective.profiles.size - importedProfiles.size - 1 , 0); // remove self

    const netLogCount = this.networkCaller.networkMetricsLogs.length;
    const peerCount = netLogCount > 0
      ? Object.keys(this.networkCaller.networkMetricsLogs[netLogCount - 1]![1].gossip_state_summary.peer_meta).length
      : 0;

    const memberBg = peerCount == 0
      ? "#bb3314"
      : peerCount > profilesCount
        ? "#c355ee"
        : "#559eee";
    /** */
    return html`
            <span class="badge" style="background:${memberBg}">
            ${peerCount} / ${profilesCount}
        </span>
        `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
                .badge {
                    /*position: absolute;*/
                    width:fit-content; 
                    display:block;     
                    margin: auto;
                    border-radius: 10px;
                    padding: 2px 6px;
                    font-size: 10px;
                    font-weight: bold;
                    text-align: center;
                    /*top: 5px;
                    right: 8px;*/
                    color: white;
                    /*border-radius: 10px;
                    padding: 1px 9px;
                    font-size: 10px;
                    font-weight: bold;*/
                }                
            `,
    ];
  }
}
