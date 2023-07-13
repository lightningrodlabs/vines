import {css, html, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {TextMessageInfo, ThreadsPerspective} from "../viewModels/threads.perspective";
import {getInitials} from "../utils";

import {ThreadsProfile} from "../viewModels/profiles.proxy";
import {ActionHashB64} from "@holochain/client";
import {consume} from "@lit-labs/context";
import {globalProfilesContext} from "../viewModels/happDef";
import {ProfilesZvm} from "../viewModels/profiles.zvm";

/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";
import List from "@ui5/webcomponents/dist/List"
import "@ui5/webcomponents/dist/List.js"

import {inputBarStyleTemplate} from "../styles";
import {Thread} from "../viewModels/thread";



/**
 * @element
 */
@customElement("mentions-list")
export class MentionsList extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  @consume({ context: globalProfilesContext, subscribe: true })
  _profilesZvm!: ProfilesZvm;


  /** -- Properties -- */

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  /** -- State variables -- */

  @state() private _loading = false;


  /** -- Getters -- */

  get listElem() : List {
    return this.shadowRoot.getElementById("textList") as List;
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<comment-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    newDvm.threadsZvm.probeMentions();
  }


  /** FOR DEBUGGING */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<mentions-list>.shouldUpdate()", changedProperties, this._dvm);
    if (changedProperties.has("_cell_via_context")) {
      this._cell = this._cell_via_context;
    }
    if (!this._dvm) {
      this.requestDvm();
    }
    return !!this._dvm;
  }



  /** */
  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    try {
      const scrollContainer = this.listElem.shadowRoot.children[0].children[0];
      //console.log("<mentions-list>.updated() ", scrollContainer)
      console.log("<mentions-list>.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
      //this.listElem.scrollTo(0, this.listElem.scrollHeight);
      //this.listElem.scroll({top: this.listElem.scrollHeight / 2});
      //this.listElem.scrollIntoView({block: "end"});
      //this.listElem.scrollTop = this.listElem.scrollHeight / 2;
      //this.listElem.scrollTop = this.listElem.scrollHeight;
      //this.listElem.scrollIntoView(false);
    } catch(e) {
      // element not present
    }

    /** Fiddle with shadow parts CSS */
    /** -- Loading Done -- */
    const inputBar = this.shadowRoot.getElementById('commentInputBar') as HTMLElement;
    if (inputBar) {
      inputBar.shadowRoot.appendChild(inputBarStyleTemplate.content.cloneNode(true));
    }
  }


  /** */
  onLoadMore() {
    console.log("<mentions-list>.onLoadMore()");

    this.listElem.busy = true;
    // FIXME: Probe DHT
    this.listElem.busy = false;
  }


  /** */
  render() {
    console.log("<mentions-list>.render()");
    if (this.threadsPerspective.mentions.length == 0) {
      return html `<div style="color:#c10a0a">No mentions found</div>`;
    }

    let textLi = Object.values(this.threadsPerspective.mentions).map(
      ([_author, beadAh, texto]) => {
        console.log("<mentions-list> texto", texto.value);

        return html`<chat-message-item hash="${beadAh}"></chat-message-item>`;
      }
    );



    const title = `Mentions`;
    /** render all */
    return html`
        <h4 style="margin-left: 5px;">${title}</h4>
        ${textLi}
    `;
  }

}
