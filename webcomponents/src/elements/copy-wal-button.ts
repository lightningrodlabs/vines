import {localized, msg} from "@lit/localize";
import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";
import {DhtId, DnaId} from "@ddd-qc/lit-happ";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {sharedStyles} from "../styles";
import {Hrl} from "@theweave/api/dist/types";


/**
 * Show Add to Pocket Icon if WeServices is available otherwise show a copy link icon
 */
@localized()
@customElement("copy-wal-button")
export class CopyWalButton extends LitElement {

  @property()
  dnaId!: DnaId;

  @property()
  hash!: DhtId;

  @property()
  name!: string;

  @property({type: Boolean}) force?: boolean = false;

  @consume({context: weClientContext, subscribe: true})
  weServices?: WeServicesEx;


  onClick(e: any) {
    e.stopPropagation();
    e.preventDefault();
    const hrl: Hrl = intoHrl(this.dnaId, this.hash);
    this.dispatchEvent(new CustomEvent<Hrl>('copy', {detail: hrl, bubbles: true, composed: true}))

  }

  /** */
  override render() {
    console.log("<copy-wal-button>.render()", this.name, this.hash);

    if (!this.dnaId || !this.hash || !this.name) {
      return html`<ui5-button icon="chain-link" design="Negative" disabled></ui5-button>`;
    }

    if (this.weServices || this.force) {
      const tooltip = msg('Add') + " " + this.name + " " + msg('to Pocket');
      return html`
          <sl-tooltip .content=${tooltip} placement="bottom">
              <div class="add-to-pocket" @click=${this.onClick}>
                <div class="logo"></div>
              </div>
          </sl-tooltip>
      `;
    } else {
      const tooltip = msg("Copy") + " " + this.name + " " + msg('to clipboard');
      return html`
          <ui5-button icon="chain-link" design="Transparent" 
                      tooltip=${tooltip}
                      style="color: inherit;"
                      @click=${this.onClick}>
          </ui5-button>
      `;
    }
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          display: inline-flex;
        }

        /* Sized and styled like a transparent icon ui5-button (2.25rem box, 1rem icon) so
           it reads as one set with the buttons beside it */
        .logo {
          width: 1.125rem;
          height: 1.125rem;
          background-color: currentColor;
          -webkit-mask: url(add-to-pocket.svg) no-repeat center / contain;
          mask: url(add-to-pocket.svg) no-repeat center / contain;
        }

        .add-to-pocket {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.25rem;
          height: 2.25rem;
          border-radius: var(--sapButton_BorderCornerRadius, var(--vines-radius-s));
          color: var(--vines-ink);
          cursor: pointer;
        }

        .add-to-pocket:hover {
          background: var(--vines-row-hover);
        }

        .add-to-pocket:active {
          background: var(--vines-accent);
          color: var(--vines-surface);
        }

        .add-to-pocket img {
          width: 32px;
        }
      `,];
  }
}
