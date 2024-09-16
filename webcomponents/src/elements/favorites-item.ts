import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

import {ActionId} from "@ddd-qc/lit-happ";
import {codeStyles} from "../markdown/code-css";
import {sharedStyles} from "../styles";
import {beadJumpEvent} from "../events";


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
    return html`<div><chat-item .hash=${this.hash} nomenu @click=${(e:any) => {
      e.stopPropagation();e.preventDefault();
      this.dispatchEvent(beadJumpEvent(this.hash))
    }}></chat-item></div>`;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        div {
          cursor: pointer;
          background: #F6F3ED;
          border: 2px dashed #b7b7b7;
          /*padding-top: 3px;*/
        }

        div:hover {
          background: #F4F9FC;
        }
      `,
    ];
  }
}
