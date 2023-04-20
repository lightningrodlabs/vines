import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, decodeHashFromBase64} from "@holochain/client";
import {BeadLink, ParticipationProtocol} from "../bindings/threads.types";
import {ThreadsDvm} from "../viewModels/threads.dvm";

/**
 * @element
 */
export class TextThreadView extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  @property()
  threadHash: string = ''

  @state() private _initialized = false;

  @state() private _pp: ParticipationProtocol;
  @state() private _beads: BeadLink[] = []
  //@state() private _txtMap: Dictionary<[number, AgentPubKeyB64, string]> = {}

  @state() private _txtTuples: [number, AgentPubKeyB64, string][] = []


  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<text-thread-view>.dvmUpdated()");
    this.threadHash = '';
    this._initialized = true;
  }


  /** */
  async onUpdate(): Promise<void> {
    this._dvm.threadsZvm.zomeProxy.getProtocol(decodeHashFromBase64(this.threadHash))
      .then((pp) => this._pp = pp)
    await this.probeLatestMessages();
  }


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    console.log("<text-thread-view>.shouldUpdate()", changedProperties);
    if (changedProperties.has("threadHash") && this._dvm) {
      console.log("<text-message-list>.shouldUpdate()", changedProperties, this.threadHash);
      this._txtTuples = this._dvm.threadsZvm.getLatestTextMessageTuples(this.threadHash);
      this.onUpdate();
    }
    return true;
  }


  /** */
  async probeLatestMessages(): Promise<void> {
    console.log("<text-thread-view>.probeLatestMessages()", this.threadHash)
    if (this.threadHash === "") {
      return;
    }
    const beadLinks = await this._dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(this.threadHash), targetCount: 20})
    console.log("<text-thread-view>.probeLatestMessages() beadLinks", beadLinks)

    this._txtTuples = this._dvm.threadsZvm.getLatestTextMessageTuples(this.threadHash);
  }


  /** */
  render() {
    console.log("<text-thread-view>.render():", this.threadHash);

    if (!this._initialized) {
      return html `<div>Loading...</div>`;
    }
    if (!this._pp) {
      return html `<div>No thread selected</div>`;
    }

    const textLi = Object.values(this._txtTuples).map(
      (tuple) => {
        const date = new Date(tuple[0] / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});
        const agent = this._dvm.profilesZvm.perspective.profiles[tuple[1]];
        return html`
            <li><abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr></li>`
      }
    );


    /** render all */
    return html`
        <h3>Thread: ${this._pp.purpose} (${this.threadHash})</h3>
        <ul>${textLi}</ul>
    `;

  }

}
