import {css, html} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.zvm";

import "@ui5/webcomponents/dist/List.js"
import "@ui5/webcomponents/dist/StandardListItem.js";

import "@ui5/webcomponents/dist/Avatar.js"
import {getInitials} from "../utils";


/**
 * @element
 */
export class TextThreadView extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME)
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash: string = ''
  /** View beads in chronological order, otherwise use timeReference as end-time and display older beads only. */
  @property()
  startFromBeginning: boolean = false;
  /** */
  @property()
  timeReferenceMs: number = Date.now();
  /** Number of beads to retrieve per 'get' */
  @property()
  batchSize: number = 20
  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;


  /** -- State variables -- */

  @state() private _initialized = false;
  @state() private _txtTuples: [number, AgentPubKeyB64, string][] = []


  /** -- Methods -- */

  /** Subscribe to ThreadsZvm */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<text-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    this.threadHash = '';
    this._initialized = true;
  }


  // /** */
  // async onUpdate(): Promise<void> {
  //   this._dvm.threadsZvm.zomeProxy.getProtocol(decodeHashFromBase64(this.threadHash))
  //     .then((pp) => this._pp = pp)
  //   await this.probeLatestMessages();
  // }


  // /** */
  // shouldUpdate(changedProperties: PropertyValues<this>) {
  //   super.shouldUpdate(changedProperties);
  //   console.log("<text-thread-view>.shouldUpdate()", changedProperties);
  //   if (changedProperties.has("threadHash") && this._dvm) {
  //     console.log("<text-message-list>.shouldUpdate()", changedProperties, this.threadHash);
  //     this._txtTuples = this._dvm.threadsZvm.getLatestTextMessageTuples(this.threadHash);
  //     this.onUpdate();
  //   }
  //   return true;
  // }


  /** */
  render() {
    console.log("<text-thread-view>.render():", this.threadHash);

    if (!this._initialized) {
      return html `<div>Loading...</div>`;
    }
    if (this.threadHash == "") {
      return html `<div>No thread selected</div>`;
    }
    const pp = this._dvm.threadsZvm.getParticipationProtocol(this.threadHash);
    if (!pp) {
      return html `<div>Loading thread...</div>`;
    }
    const topic = this._dvm.threadsZvm.getSemanticTopic(pp.topicHash);
    if (!topic) {
      return html `<div>Loading thread topic...</div>`;
    }

    const txtTuples: [number, AgentPubKeyB64, string][] = this._dvm.threadsZvm.getLatestTextMessageTuples(this.threadHash);

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    const textLi = Object.values(txtTuples).map(
      (tuple) => {
        const date = new Date(tuple[0] / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});
        const agent = this._dvm.profilesZvm.perspective.profiles[tuple[1]];
        const initials = getInitials(agent.nickname);
        const avatarUrl = agent.fields['avatar'];
        // const avatarUrl = "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fassets-big.cdn-mousquetaires.com%2Fmedias%2Fdomain11440%2Fmedia5541%2F832861-ksed1135d3-ewhr.jpg&f=1&nofb=1&ipt=1d1b2046a44ff9ac2e55397563503192c1b3ff1b33a670f00c6b3c0bb7187efd&ipo=images";
        return html`
            <ui5-li additional-text="${date_str}">
                ${tuple[2]}
                <div slot="imageContent">                
                  ${avatarUrl? html`
                      <ui5-avatar style="box-shadow: 1px 1px 1px 1px rgba(130, 122, 122, 0.88)">
                          <img src=${avatarUrl}>
                      </ui5-avatar>                   
                          ` : html`
                        <ui5-avatar shape="Circle" initials=${initials} color-scheme="Accent2"></ui5-avatar>
                  `}
                </div>                    
            </ui5-li>`
      }
    );


    /** render all */
    return html`
        <h2># ${topic}</h2>
        <h5><abbr title="${this.threadHash}">${pp.purpose}</abbr></h5>
        <ui5-list>${textLi}</ui5-list>
    `;

  }

}
