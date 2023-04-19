import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";
import {ActionHash, decodeHashFromBase64, encodeHashToBase64, Timestamp} from "@holochain/client";
import {BeadLink} from "../bindings/threads.types";


/**
 * @element
 */
export class TextMessageList extends ZomeElement<ThreadsPerspective, ThreadsZvm> {

  constructor() {
    super(ThreadsZvm.DEFAULT_ZOME_NAME);
    console.log("<text-message-list>.ctor()")
  }


  @property()
  thread: string = ''

  @state() private _beads: BeadLink[] = []


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    //console.log("ZomeElement.shouldUpdate() start", !!this._zvm, this.installedCell);
    if (changedProperties.has("thread") && this._zvm) {
      console.log({changedProperties})
      this.getLatestMessages(changedProperties.get("thread"));
    }
    return true;
  }

  async getLatestMessages(ppAhB64: string): Promise<void> {
    console.log("<text-message-list>.getLatestMessages()", ppAhB64)
    if (ppAhB64 === "") {
      return;
    }
    const beadLinks = await this._zvm.zomeProxy.getLatestBeads({ppAh: decodeHashFromBase64(ppAhB64), targetCount: 20})
    console.log("<text-message-list>.getLatestMessages() beadLinks", beadLinks)
    // FIXME convert bead to TextMessage
  }


  /** */
  render() {
    console.log("<text-message-list> render():", this.thread);

    //console.log("text-message-list:", this.perspective.names)

    let beadsLi = [html`<li>_None_</li>`];
    if (this.thread != "") {
      beadsLi = this._beads.map(
        (bl) => {
          //const pp = this._zvm.getParticipationProtocol(ah);
          return html`<li>${bl.beadType}: ${encodeHashToBase64(bl.beadAh)}</li>`
        }
      );
    }

    /** render all */
    return html`
        <h3>Thread: ${this.thread}</h3>
        <ul>${beadsLi}</ul>
    `;

  }

}
