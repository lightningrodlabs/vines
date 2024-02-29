import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

import {ThreadsDvm} from "../viewModels/threads.dvm";
import {timeSince} from "../utils";
import {encodeHashToBase64} from "@holochain/client";
import {composeNotificationTitle, renderAvatar} from "../render";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {globaFilesContext, weClientContext} from "../contexts";
import {FilesDvm} from "@ddd-qc/files";
import {JumpEvent, notification2JumpEvent} from "../jump";
import {WeServicesEx} from "../weServicesEx";


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


  @consume({ context: globaFilesContext, subscribe: true })
  filesDvm!: FilesDvm;

  // @consume({ context: wePerspectiveContext, subscribe: true })
  // wePerspective!: WePerspective;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;


  /** -- Methods -- */

  /** */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<notification-list>.dvmUpdated()");
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
      return html`<div style="font-weight: bold;">${msg('empty')}</div>`;
    }

    let notifsLi = Object.entries(this.threadsPerspective.inbox).map(
      ([linkAh, [_ppAh, notif]]) => {

        /** Content */
        const [notifTitle, notifBody] = composeNotificationTitle(notif, this._dvm.threadsZvm, this.filesDvm, this.weServices);

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
                  this.dispatchEvent(new CustomEvent<JumpEvent>('jump', {detail: {
                  hash: encodeHashToBase64(notif.content),
                  type: notification2JumpEvent(notif.event),
                  }, bubbles: true, composed: true}));
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

