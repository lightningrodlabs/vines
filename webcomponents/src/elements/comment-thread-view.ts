import {css, html, PropertyValues} from "lit";
import {property, state} from "lit/decorators.js";
import {DnaElement} from "@ddd-qc/lit-happ";
import {AgentPubKeyB64, decodeHashFromBase64} from "@holochain/client";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {TextMessageInfo, ThreadsPerspective} from "../viewModels/threads.perspective";
import {getInitials} from "../utils";

import "@ui5/webcomponents/dist/Avatar.js"
import List from "@ui5/webcomponents/dist/List"
import "@ui5/webcomponents/dist/StandardListItem.js";
import {ThreadsProfile} from "../viewModels/profiles.proxy";
// import "@ui5/webcomponents/dist/CustomListItem.js";
// import "@ui5/webcomponents/dist/GroupHeaderListItem.js"



/**
 * @element
 */
export class CommentThreadView extends DnaElement<unknown, ThreadsDvm> {

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

  @state() private _loading = false;
  @state() private _txtTuples: [number, AgentPubKeyB64, string][] = []


  /** -- Getters -- */

  get listElem() : List {
    return this.shadowRoot.getElementById("textList") as List;
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<text-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    this.loadlatestMessages(newDvm);
  }


  /** */
  protected loadlatestMessages(newDvm?: ThreadsDvm) {
    //console.log("<text-thread-view>.loadMessages() probe", this.threadHash, !!this._dvm);
    const dvm = newDvm? newDvm : this._dvm;
    //dvm.threadsZvm.probeAllBeads(this.threadHash)
      dvm.threadsZvm.probeLatestBeads({ppAh: decodeHashFromBase64(this.threadHash), targetLimit: 20})
      .then((beadLinks) => {
        console.log("<text-thread-view>.loadMessages() beads found: ", beadLinks.length);
        this._loading = false;
      });
    this._loading = true;
  }





  /** */
  protected async willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<text-thread-view>.loadMessages()", changedProperties, !!this._dvm, this.threadHash);
    if (changedProperties.has("threadHash") && this._dvm) {
      this.loadlatestMessages();
    }
  }


  // /** */
  // async onUpdate(): Promise<void> {
  //   this._dvm.threadsZvm.zomeProxy.getProtocol(decodeHashFromBase64(this.threadHash))
  //     .then((pp) => this._pp = pp)
  //   await this.probeLatestMessages();
  // }
  //
  //
  // /** */
  // shouldUpdate(changedProperties: PropertyValues<this>) {
  //   super.shouldUpdate(changedProperties);
  //   console.log("<text-message-list>.shouldUpdate()", changedProperties);
  //   if (changedProperties.has("threadHash") && this._dvm) {
  //     console.log("<text-message-list>.shouldUpdate()", changedProperties, this.threadHash);
  //     this._txtTuples = this._dvm.threadsZvm.getLatestTextMessageTuples(this.threadHash);
  //     this.onUpdate();
  //   }
  //   return true;
  // }
  //


  /** */
  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    try {
      const scrollContainer = this.listElem.shadowRoot.children[0].children[0];
      //console.log("TextList.updated() ", scrollContainer)
      console.log("TextList.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
      //this.listElem.scrollTo(0, this.listElem.scrollHeight);
      //this.listElem.scroll({top: this.listElem.scrollHeight / 2});
      //this.listElem.scrollIntoView({block: "end"});
      //this.listElem.scrollTop = this.listElem.scrollHeight / 2;
      //this.listElem.scrollTop = this.listElem.scrollHeight;
      //this.listElem.scrollIntoView(false);
    } catch(e) {
      // element not present
    }
  }


  /** */
  onLoadMore() {
    console.log("<text-thread-view>.onLoadMore()");

    this.listElem.busy = true;
    // FIXME: Probe DHT
    this.listElem.busy = false;
  }


  /** */
  render() {
    console.log("<text-thread-view>.render():", this.threadHash);
    if (this.threadHash == "") {
      return html `<div>No thread selected</div>`;
    }

    const bg_color = this._loading? "#ededf0" : ""

    const pp = this._dvm.threadsZvm.getParticipationProtocol(this.threadHash);
    if (!pp) {
      return html `<div>Loading thread...</div>`;
    }
    const topic = this._dvm.threadsZvm.getSemanticTopic(pp.subjectHash);
    if (!topic) {
      return html `<div>Loading thread topic...</div>`;
    }

    /** Should grab all probed and request probes if end is reached */
    //const infos: TextMessageInfo[] = this._dvm.threadsZvm.getMostRecentTextMessages(this.threadHash);
    const infos: TextMessageInfo[] = this._dvm.threadsZvm.getAllTextMessages(this.threadHash);

    console.log("<text-thread-view>.render() len =", infos.length);

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let textLi = Object.values(infos).map(
      (info) => {
        const date = new Date(info.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});
        let agent = {nickname: "unknown", fields: {}} as ThreadsProfile;
        let maybeAgent = this._dvm.profilesZvm.perspective.profiles[info.author];
        if (maybeAgent) {
          agent = maybeAgent;
        }
        const initials = getInitials(agent.nickname);
        const avatarUrl = agent.fields['avatar'];
        // const avatarUrl = "https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fassets-big.cdn-mousquetaires.com%2Fmedias%2Fdomain11440%2Fmedia5541%2F832861-ksed1135d3-ewhr.jpg&f=1&nofb=1&ipt=1d1b2046a44ff9ac2e55397563503192c1b3ff1b33a670f00c6b3c0bb7187efd&ipo=images";
        return html`
            <ui5-li additional-text="${date_str}" style="background: ${bg_color};"  type="Inactive">
                ${info.message}
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

    /** Different UI if no message found for thread */
    if (infos.length == 0) {
      textLi = [html`
            <ui5-li style="background: ${bg_color};">
                NO MESSAGES FOUND                         
            </ui5-li>`]
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    /** render all */
    return html`
        <!-- <h2># ${topic}</h2>
        <h5><abbr title="${this.threadHash}">${pp.purpose}</abbr></h5> -->
        <ui5-list id="textList" style="height: 88vh;background: ${bg_color};">
            ${textLi}
        </ui5-list>
    `;
  }

}
