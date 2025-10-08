import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";

import {sharedStyles} from "../styles";
import {consume} from "@lit/context";
import {NetworkCaller} from "@ddd-qc/lit-happ/dist/NetworkCaller";
import {networkCallerContext} from "../contexts";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ProfilesAltPerspective, ProfilesAltZvm} from "@ddd-qc/profiles-dvm";


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

    @consume({ context: networkCallerContext, subscribe: true })
    @property() networkCaller!: NetworkCaller;

    /** -- Methods -- */

    /** */
    override render() {
        //console.debug("<peer-status-badge>.render()");

        const profileCount = this._zvm.perspective.agents.length;

        const netLogCount = this.networkCaller.networkMetricsLogs.length;
        const peerCount = netLogCount > 0
            ? Object.keys(this.networkCaller.networkMetricsLogs[netLogCount - 1]![1].gossip_state_summary.peer_meta).length
            : 0;

        const memberBg = peerCount == 0
            ? "#bb3314"
            : peerCount + 1 > profileCount
                ? "#c355ee"
                : "#559eee";
        /** */
        return html`
            <span class="badge" style="background: ${memberBg};">
            ${peerCount + 1} / ${profileCount}
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
