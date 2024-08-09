import {css, html} from "lit";
import {customElement, property, state} from "lit/decorators.js";
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
import {globaFilesContext, weClientContext} from "../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {sharedStyles} from "../styles";
import {FilesDvm} from "@ddd-qc/files";
import {toasty} from "../toast";


/**
 * @element
 */
@customElement("favorites-view")
export class FavoritesView extends DnaElement<unknown, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  /** -- Properties -- */

  @consume({ context: weClientContext, subscribe: true })
  weServices?: WeServicesEx;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  /** -- State variables -- */

  @state() private _loading = true;


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
    console.log("<favorites-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name);
    //this.loadFavorites(newDvm);
  }


  // /** */
  // loadFavorites(newDvm?: ThreadsDvm) {
  //   this._loading = true;
  //   const dvm = newDvm? newDvm : this._dvm;
  //   dvm.threadsZvm.pullFavorites().then(() => this._loading = false);
  // }


  /** */
  override render() {
    console.log("<favorites-view>.override render()", this._dvm.threadsZvm.perspective.favorites);

    const doodle_bg =  html `
          <div style="flex-grow:1; position: absolute; top:0; left:0; z-index:-1;width:100%; height:100%;">
          </div>
    `;

    if (this._dvm.threadsZvm.perspective.favorites.length == 0) {
      return html `
          ${doodle_bg}
          <div style="position: relative;z-index: 1;margin: auto;font-size: 1.5rem;color: #04040470;">No favorites</div>
      `;
    }


    const bg_color = this._loading? "#ededf0" : "#ffffff"

    let beadLi = this._dvm.threadsZvm.perspective.favorites
      .map((beadAh) => html`<side-item .hash=${beadAh} deletable="true" 
                                       @deleted=${async(_e:any) => {
                                        await this._dvm.threadsZvm.removeFavorite(beadAh);
                                        toasty("Message removed from favorites");
                                    }}></side-item>`);

    /** Different UI if no message found for thread */
    if (this._dvm.threadsZvm.perspective.favorites.length == 0) {
      beadLi = [html`
            <ui5-li style="background: ${bg_color};">
                "No favorites found"                     
            </ui5-li>`]
    }



    const title = `Favorites`;

    /** render all */
    return html`
        ${doodle_bg}
        <h3 style="margin: 10px;font-size: 25px; color: #021133;">${title}</h3>
        <div id="textList" style="overflow: auto;">
            ${beadLi}
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        :host {
          background: linear-gradient(90deg, #E3EBFE 5%, #D8E4F4 5%, #D8E4F4 45%, #E3EBFE 45%, #E3EBFE 55%, #D8E4F4 55%, #D8E4F4 95%, #E3EBFE 95%);
          background-size: 20px 20px;
          background-position: 50px 50px;
          padding-right: 5px;
          padding-left: 5px;
          max-height: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          position: relative;
          z-index: 0;
        }
      `,
    ];
  }
}
