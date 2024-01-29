import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import {ThreadsDvm} from "../viewModels/threads.dvm";
import {timeSince} from "../utils";
import {encodeHashToBase64} from "@holochain/client";
import {renderAvatar} from "../render";
import {msg} from "@lit/localize";


/**
 * @element
 */
@customElement("notification-list")
export class NotificationList extends DnaElement<unknown, ThreadsDvm> {

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
    console.log("<notification-list>.render()", Object.entries(this.threadsPerspective.inbox).length);
    if (Object.entries(this.threadsPerspective.inbox).length == 0) {
      return html `<div style="color:#c10a0a">${msg('No notifications found')}</div>`;
    }

    let notifsLi = Object.entries(this.threadsPerspective.inbox).map(
      ([linkAh, notif]) => {

        /** Content */
        const [notifTitle, notifBody] = this._dvm.threadsZvm.composeNotificationTitle(notif);

        /** Author */
        const author = encodeHashToBase64(notif.author);
        const agentName = this._dvm.profilesZvm.perspective.profiles[author]? this._dvm.profilesZvm.perspective.profiles[author].nickname : "unknown";

        /** Timestamp */
        const date = new Date(notif.timestamp / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        //const date_str = date.toLocaleString('en-US', {hour12: false});
        const date_str = timeSince(date) + " ago";

        /** */
        return html`
          <ui5-li-notification 
              show-close
              title-text=${notifTitle} 
              @close=${async (_e) => {await this._dvm.threadsZvm.deleteInboxItem(linkAh);}}>
              ${renderAvatar(this._dvm.profilesZvm, author, "XS")}
              <span slot="footnotes">${agentName}</span>
              <span slot="footnotes">${date_str}</span>
              <ui5-notification-action text="Jump" slot="actions" @click=${(e) => {
                  this.dispatchEvent(new CustomEvent('jump', {detail: encodeHashToBase64(notif.content), bubbles: true, composed: true}));
              }}>
              </ui5-notification-action>
              ${notifBody}
          </ui5-li-notification>
        `;
      }
    );


    /** render all */
    return html`
        <ui5-list>
            ${notifsLi}
        </ui5-list>
    `;
  }

}
