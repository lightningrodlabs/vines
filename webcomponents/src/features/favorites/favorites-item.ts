import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

import {ActionId} from "@ddd-qc/lit-happ";
import {codeStyles} from "../../markdown/code-css";
import {sharedStyles} from "../../styles";
import {beadJumpEvent, favoritesEvent} from "../../events";
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
            <div style="display: flex; flex-direction: row-reverse; gap: 10px; position: absolute; top: 10px; right: 10px; z-index: 10">
              <ui5-button @click=${(e: any) => {
      e.stopPropagation();
      e.preventDefault();
      this.dispatchEvent(beadJumpEvent(this.hash));
    }}>
                 ${msg("Jump")}
              </ui5-button>
              <ui5-button icon="favorite" tooltip=${msg("Remove from favorites")}
                          style="color: var(--vines-warning)"
                          @click=${(e: any) => {
      e.stopPropagation();
      e.preventDefault();
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
          background: var(--vines-surface-2);
          border: 2px dashed var(--vines-border);
          /*padding-top: 3px;*/
        }

        #main:hover {
          background: var(--vines-surface);
        }
        
        ui5-button {
          border:none;
          color: var(--vines-ink);
          font-weight: bold;
        }
      `,
    ];
  }
}
