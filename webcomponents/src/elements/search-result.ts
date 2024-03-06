import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";

import "@ui5/webcomponents/dist/TextArea.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {SearchParameters} from "../search";
import {beadJumpEvent} from "../jump";


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
          <chat-item .hash=${beadAh}
                     @click=${(_e) => this.dispatchEvent(beadJumpEvent(beadAh))}>
          </chat-item>
      </ui5-li>`

    })


    /** */
    return html`
        <ui5-panel sticky-header fixed>
            <div slot="header" class="header">
                <ui5-title>${beadAhs.length} Results for "${this.parameters.keywords}"</ui5-title>
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
        ui5-panel {
          margin-top: 5px;
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
