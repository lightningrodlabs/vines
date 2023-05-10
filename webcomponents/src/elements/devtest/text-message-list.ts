import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, decodeHashFromBase64} from "@holochain/client";
import {BeadLink, ParticipationProtocol} from "../../bindings/threads.types";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {TextMessageInfo} from "../../viewModels/threads.perspective";

/**
 * @element
 */
export class TextMessageList extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  @property()
  threadHash: string = ''

  @state() private _initialized = false;

  @state() private _pp: ParticipationProtocol;
  @state() private _beads: BeadLink[] = []
  //@state() private _txtMap: Dictionary<[number, AgentPubKeyB64, string]> = {}

  @state() private _textMessageInfos: TextMessageInfo[] = []


  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<text-message-list>.dvmUpdated()");
    this.threadHash = '';
    this._initialized = true;
  }


  /** */
  async onUpdate(): Promise<void> {
    this._dvm.threadsZvm.zomeProxy.getPp(decodeHashFromBase64(this.threadHash))
      .then((pp) => this._pp = pp)
    await this.probeLatestMessages();
  }


  /** */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    super.shouldUpdate(changedProperties);
    // console.log("<text-message-list>.shouldUpdate()", changedProperties);
    if (changedProperties.has("threadHash") && this._dvm) {
      console.log("<text-message-list>.shouldUpdate()", changedProperties, this.threadHash);
      this._textMessageInfos = this._dvm.threadsZvm.getMostRecentTextMessages(this.threadHash);
      this.onUpdate();
    }
    return true;
  }


  /** */
  async probeLatestMessages(): Promise<void> {
    console.log("<text-message-list>.probeLatestMessages()", this.threadHash)
    if (this.threadHash === "") {
      return;
    }
    const beadLinks = await this._dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(this.threadHash), targetLimit: 20})
    console.log("<text-message-list>.probeLatestMessages() beadLinks", beadLinks)

    this._textMessageInfos = this._dvm.threadsZvm.getMostRecentTextMessages(this.threadHash);
  }


  /** */
  render() {
    console.log("<text-message-list> render():", this.threadHash);

    if (!this._initialized || !this._pp) {
      return html `<div>!!Thread data not found!!</div>`;
    }

    // const beadsLi = this._beads.map(
    //   (bl) => {
    //     return html`<li>${bl.beadType}: ${encodeHashToBase64(bl.beadAh)}</li>`
    //   }
    // );
    //         <!-- <ul>${beadsLi}</ul> -->

    const textLi = Object.values(this._textMessageInfos).map(
      (info) => {
        //const index_date = new Date(info.index_begin_time_us / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        //const index_date_str = index_date.toLocaleString('en-US', {hour12: false});
        // [${index_date_str}]
        const creation_date = new Date(info.creationTime / 1000);
        const creation_date_str = creation_date.toLocaleString('en-US', {hour12: false});
        const agent = this._dvm.profilesZvm.perspective.profiles[info.author];
        return html`
            <li><abbr title="${agent ? agent.nickname : "unknown"}">[${creation_date_str}] ${info.message}</abbr></li>`
      }
    );


    /** render all */
    return html`
        <h3>Thread: ${this._pp.purpose} (${this.threadHash})</h3>
        <ul>${textLi}</ul>
    `;

  }

}
