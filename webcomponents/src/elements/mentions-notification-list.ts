import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import {ThreadsDvm} from "../viewModels/threads.dvm";
import {timeSince} from "../utils";
import {decodeHashFromBase64} from "@holochain/client";
import {renderAvatar} from "../render";


/**
 * @element
 */
@customElement("mentions-notification-list")
export class MentionsNotificationList extends DnaElement<unknown, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** -- Methods -- */

  /** */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<comment-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** */
  render() {
    console.log("<mentions-notification-list>.render()", Object.entries(this._dvm.threadsZvm.perspective.mentions).length, this.threadsPerspective.mentions/*, this._dvm.profilesZvm*/);
    if (Object.entries(this._dvm.threadsZvm.perspective.mentions).length == 0) {
      return html `<div style="color:#c10a0a">No mentions found</div>`;
    }

    let notifsLi = Object.entries(this._dvm.threadsZvm.perspective.mentions).map(
      ([linkAh, [author, beadAh]]) => {
        const tmInfo = this._dvm.threadsZvm.perspective.textMessages[beadAh];
        console.log("<mentions-notification-list> texto", tmInfo.textMessage.value);

        const agentName = this._dvm.profilesZvm.perspective.profiles[author]? this._dvm.profilesZvm.perspective.profiles[author].nickname : "unknown";

        const date = new Date(tmInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        //const date_str = date.toLocaleString('en-US', {hour12: false});
        const date_str = timeSince(date) + " ago";

        /** */
        return html`
          <ui5-li-notification 
              show-close
              title-text=${tmInfo.textMessage.value} 
              @close=${async (_e) => {await this._dvm.threadsZvm.deleteMention(linkAh);}}>
              ${renderAvatar(this._dvm.profilesZvm, author, "XS")}
              <span slot="footnotes">${agentName}</span>
              <span slot="footnotes">${date_str}</span>
              <ui5-notification-action text="Jump" slot="actions" @click=${(e) => {
                  this.dispatchEvent(new CustomEvent('jump', {detail: beadAh, bubbles: true, composed: true}));
              }
              }></ui5-notification-action>
          </ui5-li-notification>
        `;
      }
    );

    /** render all */
    return html`
        <ui5-list header-text="Mentions">
            ${notifsLi}
        </ui5-list>
    `;
  }

}
