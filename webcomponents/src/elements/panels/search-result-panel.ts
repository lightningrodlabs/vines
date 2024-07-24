import {css, html} from "lit";
import {customElement, property} from "lit/decorators.js";

import "@ui5/webcomponents/dist/TextArea.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {SearchParameters} from "../../search";
import {beadJumpEvent} from "../../events";


/**
 * @element
 */
@customElement("search-result-panel")
export class SearchResultPanel extends DnaElement<unknown, ThreadsDvm> {
  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  @property({type: Object})
  parameters: SearchParameters


  /** -- Methods -- */

  /** */
  render() {
    console.log("<search-result-panel>.render()", this.parameters);

    const beadAhs = this._dvm.threadsZvm.perspective.searchTextBeads(this.parameters);

    const matches = beadAhs.map(([beadAh, _info, _text]) => {
      return html`<ui5-li .key=${beadAh} style="height:auto">
          <chat-item .hash=${beadAh} shortmenu
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
