import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {Dictionary, ZomeElement} from "@ddd-qc/lit-happ";
import {ThreadsPerspective, ThreadsZvm} from "../viewModels/threads.zvm";
import {AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
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

  @state() private _pp: ParticipationProtocol;
  @state() private _beads: BeadLink[] = []
  @state() private _txtMap: Dictionary<[number, AgentPubKeyB64, string]> = {}


  /** */
  async onUpdate(): Promise<void> {
    this._zvm.zomeProxy.getProtocol(decodeHashFromBase64(this.thread))
      .then((pp) => this._pp = pp)

    let textMap: Dictionary<[number, AgentPubKeyB64, string]> = {}
    const beadLinks = await this.getLatestMessages();
    for (const beadLink of beadLinks) {
      const tuple = await this._zvm.zomeProxy.getTextMessage(beadLink.beadAh);
      textMap[encodeHashToBase64(beadLink.beadAh)] = [tuple[0], encodeHashToBase64(tuple[1]), tuple[2]];
    }
    this._txtMap = textMap;
  }


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    //console.log("ZomeElement.shouldUpdate() start", !!this._zvm, this.installedCell);
    if (changedProperties.has("thread") && this._zvm) {
      console.log("<text-message-list>.shouldUpdate()", changedProperties, this.thread);
      this.onUpdate();
    }
    return true;
  }


  /** */
  async getLatestMessages(): Promise<BeadLink[]> {
    console.log("<text-message-list>.getLatestMessages()", this.thread)
    if (this.thread === "") {
      return;
    }
    const beadLinks = await this._zvm.zomeProxy.getLatestBeads({ppAh: decodeHashFromBase64(this.thread), targetCount: 20})
    console.log("<text-message-list>.getLatestMessages() beadLinks", beadLinks)
    // FIXME convert bead to TextMessage
    this._beads = beadLinks;
    return beadLinks;
  }


  /** */
  render() {
    console.log("<text-message-list> render():", this.thread);

    if (!this._pp) {
      return html `<div>!!Thread data not found!!</div>`;
    }

    const beadsLi = this._beads.map(
      (bl) => {
        return html`<li>${bl.beadType}: ${encodeHashToBase64(bl.beadAh)}</li>`
      }
    );


    const textLi = Object.values(this._txtMap).map(
      (tuple) => {
        const date = new Date(tuple[0] / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});
        return html`<li><abbr title="${tuple[1]}">[${date_str}] ${tuple[2]}</abbr></li>`
      }
    );

    /** render all */
    return html`
        <h3>Thread: ${this._pp.purpose} (${this.thread})</h3>
        <!-- <ul>${beadsLi}</ul> -->
        <ul>${textLi}</ul>
    `;

  }

}
