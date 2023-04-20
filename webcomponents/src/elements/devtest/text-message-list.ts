import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {Dictionary, DnaElement} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";
import {BeadLink, ParticipationProtocol} from "../../bindings/threads.types";
import {ThreadsDvm} from "../../viewModels/threads.dvm";

/**
 * @element
 */
export class TextMessageList extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  @property()
  thread: string = ''

  @state() private _initialized = false;

  @state() private _pp: ParticipationProtocol;
  @state() private _beads: BeadLink[] = []
  //@state() private _txtMap: Dictionary<[number, AgentPubKeyB64, string]> = {}

  @state() private _txtTuples: [number, AgentPubKeyB64, string][] = []


  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<text-message-list>.dvmUpdated()");
    this.thread = '';
    this._initialized = true;
  }


  /** */
  async onUpdate(): Promise<void> {
    this._dvm.threadsZvm.zomeProxy.getProtocol(decodeHashFromBase64(this.thread))
      .then((pp) => this._pp = pp)
    await this.probeLatestMessages();
  }


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    console.log("<text-message-list>.shouldUpdate()", changedProperties);
    if (changedProperties.has("thread") && this._dvm) {
      console.log("<text-message-list>.shouldUpdate()", changedProperties, this.thread);
      this._txtTuples = this._dvm.threadsZvm.getLatestTextMessageTuples(this.thread);
      this.onUpdate();
    }
    return true;
  }


  /** */
  async probeLatestMessages(): Promise<void> {
    console.log("<text-message-list>.probeLatestMessages()", this.thread)
    if (this.thread === "") {
      return;
    }
    const beadLinks = await this._dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(this.thread), targetCount: 20})
    console.log("<text-message-list>.probeLatestMessages() beadLinks", beadLinks)

    this._txtTuples = this._dvm.threadsZvm.getLatestTextMessageTuples(this.thread);
  }


  /** */
  render() {
    console.log("<text-message-list> render():", this.thread);

    if (!this._initialized || !this._pp) {
      return html `<div>!!Thread data not found!!</div>`;
    }

    const beadsLi = this._beads.map(
      (bl) => {
        return html`<li>${bl.beadType}: ${encodeHashToBase64(bl.beadAh)}</li>`
      }
    );

    let textUl = html`<div>Loading...</div>`;
    //if (this._txtTuples.length > 0) {
      const textLi = Object.values(this._txtTuples).map(
        (tuple) => {
          const date = new Date(tuple[0] / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
          const date_str = date.toLocaleString('en-US', {hour12: false});
          const agent = this._dvm.profilesZvm.perspective.profiles[tuple[1]];
          return html`
              <li><abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr></li>`
        }
      );
      textUl = html`<ul>${textLi}</ul>`;
    //}


    /** render all */
    return html`
        <h3>Thread: ${this._pp.purpose} (${this.thread})</h3>
        <!-- <ul>${beadsLi}</ul> -->
        ${textUl}
    `;

  }

}
