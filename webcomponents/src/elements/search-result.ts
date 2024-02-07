import {css, html, LitElement, PropertyValues} from "lit";
import {property, state, customElement} from "lit/decorators.js";

import "@ui5/webcomponents/dist/TextArea.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {JumpEvent} from "./notification-list";
import {parseSearchInput, SearchParameters} from "../search";


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
  //@property() search: string = ''

  @property({type: Object})
  parameters: SearchParameters


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<search-result-panel>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
  }


  /** */
  render() {
    console.log("<search-result-panel>.render()", this.parameters);

    //const searchParams = parseSearchInput(this.search, this.prof)
    const beadAhs = this._dvm.threadsZvm.searchTextBeads(this.parameters);

    const matches = beadAhs.map(([beadAh, _info, _text]) => {
      //const beadPair = this.threadsPerspective.beads[beadAh];
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
