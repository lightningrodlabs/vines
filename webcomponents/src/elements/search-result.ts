import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import {inputBarStyleTemplate} from "../styles";

import "@ui5/webcomponents/dist/TextArea.js";
import TextArea from "@ui5/webcomponents/dist/TextArea.js";
import List from "@ui5/webcomponents/dist/List.js";
//import {InputSuggestionText, SuggestionComponent} from "@ui5/webcomponents/dist/features/InputSuggestions";
import SuggestionItem from "@ui5/webcomponents/dist/SuggestionItem";
import {ProfilesZvm} from "@ddd-qc/profiles-dvm";
import {AgentPubKeyB64, encodeHashToBase64} from "@holochain/client";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {AppletId} from "@lightningrodlabs/we-applet";
import {JumpEvent} from "./notification-list";
//import SuggestionListItem from "@ui5/webcomponents/dist/SuggestionListItem";


/**
 * @element
 */
@customElement("search-result-panel")
export class SearchResult extends DnaElement<unknown, ThreadsDvm> {
  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** */
  @property() search: string = ''


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
  }


  /** */
  render() {
    console.log("<search-result-panel>.render()", this.search);

    const beadAhs = this._dvm.threadsZvm.search(this.search);

    const matches = beadAhs.map((beadAh) => {
      const tmInfo = this.threadsPerspective.textMessages[beadAh];
      //return html`<ui5-li key=${beadAh}>${tmInfo.textMessage.value}</ui5-li>`
      return html`<ui5-li key=${beadAh} style="height:auto">
          <chat-item .hash=${beadAh} jump="true"
                     @click=${(e) => {
                         //console.log("<search-result-panel> jump request", beadAh);
                         this.dispatchEvent(new CustomEvent<JumpEvent>('jump', {detail: {
                                 hash: beadAh,
                                 type: {Reply: null}, // TODO: better API. Using Reply just to tell it to display the bead.
                             }, bubbles: true, composed: true}));
                     }}>
          </chat-item>
      </ui5-li>`

    })


    /** */
    return html`
        <ui5-panel sticky-header fixed>
            <div slot="header" class="header">
                <ui5-title>${beadAhs.length} Results</ui5-title>
                <div>
                    <!-- <ui5-button design="Emphasized">Add</ui5-button>
                    <ui5-button design="Negative">Remove</ui5-button>
                    <ui5-button>Edit</ui5-button>
                    -->
                </div>
            </div>
            <ui5-list>
                ${matches}
            </ui5-list>
        </ui5-panel>
    `;
  }

  /** */
  static get styles() {
    return [
      css`
        :host {
          padding-left: 5px;
          padding-right: 5px;
          display: flex;
          flex-direction: column;
          overflow: auto;
          height: 100%;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding-top: 5px;
          padding-bottom: 5px;
          padding-left: 5px;
        }        
      `,

    ];
  }

}
