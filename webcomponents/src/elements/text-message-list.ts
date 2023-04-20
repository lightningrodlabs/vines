import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";
import {ActionHash, decodeHashFromBase64, encodeHashToBase64, Timestamp} from "@holochain/client";
import {BeadLink, ParticipationProtocol} from "../bindings/threads.types";


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
  @state() private _pp: ParticipationProtocol;


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    //console.log("ZomeElement.shouldUpdate() start", !!this._zvm, this.installedCell);
    if (changedProperties.has("thread") && this._zvm) {
      console.log("<text-message-list>.shouldUpdate()", changedProperties, this.thread)
      this.getLatestMessages();
      this._zvm.zomeProxy.getProtocol(decodeHashFromBase64(this.thread))
        .then((pp) => this._pp = pp)
    }
    return true;
  }


  /** */
  async getLatestMessages(): Promise<void> {
    console.log("<text-message-list>.getLatestMessages()", this.thread)
    if (this.thread === "") {
      return;
    }
    const beadLinks = await this._zvm.zomeProxy.getLatestBeads({ppAh: decodeHashFromBase64(this.thread), targetCount: 20})
    console.log("<text-message-list>.getLatestMessages() beadLinks", beadLinks)
    // FIXME convert bead to TextMessage
    this._beads = beadLinks;
  }


  /** */
  render() {
    console.log("<text-message-list> render():", this.thread);

    if (!this._pp) {
      return html `<div>!!Thread data not found!!</div>`;
    }

    const beadsLi = this._beads.map(
      (bl) => {
        //const pp = this._zvm.getParticipationProtocol(ah);
        return html`<li>${bl.beadType}: ${encodeHashToBase64(bl.beadAh)}</li>`
      }
    );


    /** render all */
    return html`
        <h3>Thread: ${this._pp.purpose} (${this.thread})</h3>
        <ul>${beadsLi}</ul>
    `;

  }

}
