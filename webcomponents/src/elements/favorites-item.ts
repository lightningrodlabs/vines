import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

import {ActionId} from "@ddd-qc/lit-happ";
import {codeStyles} from "../markdown/code-css";
import {sharedStyles} from "../styles";
import {beadJumpEvent, favoritesEvent} from "../events";
import {msg} from "@lit/localize";


/**
 * @element
 */
@customElement("favorites-item")
export class FavoritesItem extends LitElement {

  /** -- Properties -- */

  /** Hash of bead to display */
  @property() hash!: ActionId;


  /** */
  override render() {
    console.log("<favorites-item>.render()", this.hash);
    return html`
        <div id="main" style="position: relative;">
            <div style="display: flex; flex-direction: row-reverse; gap: 10px; position: absolute; top: 10px; right: 10px;">
              <ui5-button style="" @click=${(e:any) => {
                  e.stopPropagation(); e.preventDefault();
                  this.dispatchEvent(beadJumpEvent(this.hash));
              }}>
                 ${msg("View in channel")}
              </ui5-button>
              <ui5-button icon="favorite" tooltip=${msg("Remove from favorites")}
                          style="color:#FFBF00"
                          @click=${(e:any) => {
                            e.stopPropagation(); e.preventDefault();
                            this.dispatchEvent(favoritesEvent(this.hash, false));
                        }}>
              </ui5-button>
            </div>
            <chat-item .hash=${this.hash} nomenu></chat-item>
        </div>`;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        #main {
          background: #F6F3ED;
          border: 2px dashed #b7b7b7;
          /*padding-top: 3px;*/
        }

        #main:hover {
          background: #F4F9FC;
        }
        
        ui5-button {
          border:none;
          color: #434343;
          font-weight: bold;
        }
      `,
    ];
  }
}
