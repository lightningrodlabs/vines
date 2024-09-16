import {css, html} from "lit";
import {customElement, property, /*state*/} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";
import List from "@ui5/webcomponents/dist/List"
import "@ui5/webcomponents/dist/List.js"


import "./input-bar";
import {consume} from "@lit/context";
import {weClientContext} from "../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {sharedStyles} from "../styles";
import {toasty} from "../toast";
import {msg} from "@lit/localize";


/**
 * @element
 */
@customElement("favorites-view")
export class FavoritesView extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  /** -- Properties -- */

  @consume({ context: weClientContext, subscribe: true })
  weServices?: WeServicesEx;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** -- State variables -- */

  //@state() private _loading = true;


  /** -- Getters -- */

  get listElem() : List {
    return this.shadowRoot!.getElementById("textList") as List;
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
  }


  /** */
  override render() {
    console.log("<favorites-view>.render()", this._dvm.threadsZvm.perspective.favorites);

    // if (this._loading) {
    //   return html `<ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>`;
    // }

    if (this._dvm.threadsZvm.perspective.favorites.length == 0) {
      return html`<div style="position: relative; z-index: 1;margin: auto;font-size: 1.5rem;color: #04040470;">${msg("No favorites")}</div>`;
    }

    let beadLi = this._dvm.threadsZvm.perspective.favorites
      .map((beadAh) => html`<favorites-item .hash=${beadAh} deletable="true" 
                                       @deleted=${async(_e:any) => {
                                        await this._dvm.threadsZvm.removeFavorite(beadAh);
                                        toasty(msg("Message removed from favorites"));
                                    }}></favorites-item>`);

    /** Different UI if no message found for thread */
    if (this._dvm.threadsZvm.perspective.favorites.length == 0) {
      beadLi = [html`<div>${msg("No favorites found")}</div>`]
    } else {
      beadLi.unshift(html`<div style="flex-grow:1"></div>`)
      beadLi.push(html`<div style="flex-grow:1"></div>`)
    }
    /** render all */
    return html`${beadLi}`;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          padding: 10px 50px 10px 50px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 30px;
          position: relative;
          z-index: 0;
        }
      `,
    ];
  }
}
