import {html} from "lit";
import {property, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";

import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {timeSince, truncate} from "../../utils";
import {composeNotificationTitle, renderAvatar} from "../../render";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {globaFilesContext, weClientContext} from "../../contexts";
import {FilesDvm} from "@ddd-qc/files";
import {JumpEvent, notification2JumpEvent} from "../../events";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {composeFeedNotificationTitle} from "../../utils_feed";


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


  @property({type: Boolean}) feed = false

  @consume({ context: globaFilesContext, subscribe: true })
  filesDvm!: FilesDvm;

  // @consume({ context: wePerspectiveContext, subscribe: true })
  // wePerspective!: WePerspective;

  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;


  /** -- Methods -- */

  /** */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<notification-list>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** */
  override render() {
    console.log("<notification-list>.override render()", this.threadsPerspective.inbox.size);
    if (this.threadsPerspective.inbox.size == 0) {
      return html`<div style="font-weight: bold;">${msg('empty')}</div>`;
    }

    let notifsLi = Array.from(this.threadsPerspective.inbox.entries()).map(
      ([linkAh, [_ppAh, notif]]) => {

        /** Content */
        const [notifTitle, notifBody, _jump] = this.feed
          ? composeFeedNotificationTitle(notif, this._dvm, this.filesDvm, this.weServices)
          : composeNotificationTitle(notif, this._dvm.threadsZvm, this.filesDvm, this.weServices);

        /** Author */
        const author = notif.author;
        const maybeProfile = this._dvm.profilesZvm.perspective.getProfile(author)
        const agentName = maybeProfile? maybeProfile.nickname : "unknown";

        /** Timestamp */
        const date = new Date(notif.timestamp / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        //const date_str = date.toLocaleString('en-US', {hour12: false});
        const date_str = timeSince(date) + " ago";

        const title = truncate(notifTitle, 120, true);

        /** */
        return html`
          <ui5-li-notification 
              show-close
              title-text=${title} 
              @close=${async (_e:any) => {await this._dvm.threadsZvm.deleteNotification(linkAh);}}>
              ${renderAvatar(this._dvm.profilesZvm, author, "XS")}
              <span slot="footnotes">${agentName}</span>
              <span slot="footnotes">${date_str}</span>
              <ui5-notification-action text="Jump" slot="actions" @click=${(_e:any) => {
                  this.dispatchEvent(new CustomEvent<JumpEvent>('jump', {detail: {
                  address: notif.content,
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

