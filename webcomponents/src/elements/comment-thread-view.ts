import {html, PropertyValues, css} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {delay, DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {AnyBeadMat, EntryBeadMat, TextBeadMat, ThreadsPerspective} from "../viewModels/threads.perspective";
import {parseMentions} from "../utils";

import {ActionHashB64, decodeHashFromBase64, encodeHashToBase64} from "@holochain/client";

/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";
import List from "@ui5/webcomponents/dist/List"
import "@ui5/webcomponents/dist/List.js"


import "./input-bar";
import {renderAvatar} from "../render";
import {consume} from "@lit/context";
import {globaFilesContext, weClientContext} from "../contexts";
import {Hrl, WeServices} from "@lightningrodlabs/we-applet";
import {EntryBead, TextBead, ThreadsEntryType} from "../bindings/threads.types";
import {doodle_weave} from "../doodles";
import {threadJumpEvent} from "../jump";
import markdownit from "markdown-it";
import {unsafeHTML} from "lit/directives/unsafe-html.js";
import {FilesDvm, prettyFileSize} from "@ddd-qc/files";
import {toasty} from "../toast";
import {stringifyHrl} from "@ddd-qc/we-utils";
import {WeServicesEx} from "../weServicesEx";


/**
 * @element
 */
@customElement("comment-thread-view")
export class CommentThreadView extends DnaElement<unknown, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    console.log("<comment-thread-view>.ctor()", this.threadHash)
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash: ActionHashB64 = ''
  /** Enable Input bar */
  @property() showInput: boolean = false

  /** Subject info */
  @property() subjectName?: string;
  @property() subjectType?: string;

  // TODO
  // /** View beads in chronological order, otherwise use timeReference as end-time and display older beads only. */
  // @property()
  // startFromBeginning: boolean = false;
  // /** */
  // @property()
  // timeReferenceMs: number = Date.now();
  // /** Number of beads to retrieve per 'get' */
  // @property()
  // batchSize: number = 20


  @consume({ context: weClientContext, subscribe: true })
  weServices: WeServicesEx;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  /** -- State variables -- */

  @state() private _loading = true;


  /** -- Getters -- */

  get listElem() : List {
    return this.shadowRoot.getElementById("list") as List;
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<comment-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    newDvm.threadsZvm.probeAllBeads(this.threadHash);
  }



  /** FOR DEBUGGING */
  shouldUpdate(changedProperties: PropertyValues<this>) {
    console.log("<comment-thread-view>.shouldUpdate()", changedProperties, this._dvm);
    if (changedProperties.has("_cell_via_context")) {
      this._cell = this._cell_via_context;
    }
    if (!this._dvm) {
      this.requestDvm();
    }
    return !!this._dvm;
  }


  /** */
  protected willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<comment-thread-view>.willUpdate()", changedProperties, !!this._dvm, this.threadHash);
    if (this._dvm && (changedProperties.has("threadHash") || (false /* WARN might need to check probeAllBeads has been called */))) {
      this._loading = true;
      /* await */ this.loadCommentThread();
    }
  }


  /** */
  private async loadCommentThread() {
    console.log("<comment-thread-view>.willUpdate() threadHash", this.threadHash);
    await this._dvm.threadsZvm.probeAllBeads(this.threadHash);
    await this._dvm.threadsZvm.commitThreadProbeLog(this.threadHash);
    this._loading = false;
  }


  /** */
  protected updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    try {
      const scrollContainer = this.listElem.shadowRoot.children[0].children[0];
      //console.log("<comment-thread-view>.updated() ", scrollContainer)
      console.log("<comment-thread-view>.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
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
    console.log("<comment-thread-view>.onLoadMore()");

    this.listElem.busy = true;
    // FIXME: Probe DHT
    this.listElem.busy = false;
  }


  /** */
  async onCreateComment(inputText: string) {
    const thread = this._dvm.threadsZvm.getThread(this.threadHash);
    if (!thread) {
      console.error("Missing Comment thread");
      return;
    }

    let mentionedAgents = undefined;

    const mentions = parseMentions(inputText);
    mentionedAgents = this._dvm.profilesZvm.findProfiles(mentions);

    const ah = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, this.threadHash, this.cell.agentPubKey, mentionedAgents);
    console.log("onCreateComment() ah:", ah);
  }


  /** */
  render() {
    console.log("<comment-thread-view>.render()", this.threadHash, this.showInput, this.subjectName);

    const doodle_bg =  html `
          <div style="flex-grow:1; position: absolute; top:0; left:0; z-index:-1;width:100%; height:100%;">
          ${doodle_weave}
          </div>
    `;

    if (this.threadHash == "") {
      return html `
          ${doodle_bg}
          <div style="color:#c10a0a; position: relative; z-index:1; margin:auto; margin-top:20px; font-weight: bold">No comment thread selected</div>
      `;
    }
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html `
          ${doodle_bg}
          <div style="color:#c10a0a; margin:auto; width:50%; height:50%;">Thread not found</div>
      `;
    }

    const bg_color = this._loading? "#ededf0" : "#ffffff"


    // if (pp.subjectType == SEMANTIC_TOPIC_TYPE_NAME) {
    //   const topic = this._dvm.threadsZvm.getSemanticTopic(pp.subjectHash);
    //   if (!topic) {
    //     return html`
    //         <div>Loading thread topic...</div>`;
    //   }
    // } else {
    //
    // }

    const infoPairs = this._dvm.threadsZvm.getAllBeadsOnThread(this.threadHash);

    console.log("<comment-thread-view>.render() len =", infoPairs.length);
    console.log("Has thread some unreads?", thread.hasUnreads());

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let textLi = Object.values(infoPairs).map(
      ([beadInfo, typedBead]) => {
        console.log("<comment-thread-view> beadInfo", beadInfo);
        if (beadInfo == undefined) {
          return html``;
        }
        const date = new Date(beadInfo.creationTime / 1000); // Holochain timestamp is in micro-seconds, Date wants milliseconds
        const date_str = date.toLocaleString('en-US', {hour12: false});

        const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss[this.threadHash];
        const isNew = initialProbeLogTs < beadInfo.creationTime;
        console.log("Is msg new?", isNew, initialProbeLogTs, thread.latestProbeLogTime, beadInfo.creationTime);

        const agentName = this._dvm.profilesZvm.perspective.profiles[beadInfo.author]? this._dvm.profilesZvm.perspective.profiles[beadInfo.author].nickname : "unknown";


        let content = html`<div>__unknown__</div>`;
        switch(beadInfo.beadType) {
          case ThreadsEntryType.TextBead:
            const tm = typedBead as TextBead;
            //content = tm.value;
            const md = markdownit();
            //const md = markdownit().use(emoji/* , options */);
            const result = md.render(tm.value);
            const parsed = unsafeHTML(result);
            /** render all */
            content = html`<div>${parsed}</div>`;
            break;
          case ThreadsEntryType.AnyBead:
            content = html`<div>__HRL__</div>`;
            const anyBead = typedBead as any as AnyBeadMat;
            if (anyBead.typeInfo === "hrl") {
              const obj: [string, string] = JSON.parse(anyBead.value);
              const hrl: Hrl = [decodeHashFromBase64(obj[0]), decodeHashFromBase64(obj[1])];
              const hrlStr = stringifyHrl(hrl);
              const id = "hrl-item" //+ "-" + hrlStr;
              this.weServices.attachableInfo({hrl}).then(async (attLocAndInfo) => {
                await delay(100); // or maybe do a a requestUpdate()
                const item = this.shadowRoot.getElementById(id) as HTMLElement;
                if (item) {
                  item.innerText = attLocAndInfo.attachableInfo.name;
                }
              });
              content = html`
                  <div .id=${id} style="color:#8a0cb7; cursor:pointer; overflow: auto;" @click=${(e) => this.weServices.openHrl({hrl})}>
                      HRL: ${hrlStr}
                  </div>                
              `;
            }
            break;
          case ThreadsEntryType.EntryBead:
            content = html`<div>__File__</div>`;
            const entryBead = typedBead as any as EntryBeadMat;
            console.log("<comment-thread-view> entryBead", entryBead, entryBead.sourceEh);
            const manifestEh = entryBead.sourceEh;
            const maybeTuple = this._filesDvm.deliveryZvm.perspective.publicParcels[manifestEh];
            if (maybeTuple) {
              const desc = maybeTuple[0];
              content = html`<div style="color:#1067d7; cursor:pointer; overflow: auto;" 
                                  @click=${(e) => {
                                  this._filesDvm.downloadFile(manifestEh);
                                  toasty("File downloaded: " + desc.name);
                                }}>
                              File: ${desc.name} (${prettyFileSize(desc.size)})
                          </div>`;
            }
            break;
          default:
            break;
        }

        /* render item */
        return html`
            <div id="commentItem" additional-text="${date_str}" style="background:${bg_color}; ${isNew? "border: 1px solid red" : ""};">
                <div id="avatarRow">
                    ${renderAvatar(this._dvm.profilesZvm, beadInfo.author, "XS")}
                    <div id="nameColumn" style="display:flex; flex-direction:column;">
                        <span id="agentName">${agentName}</span>
                        <span class="chatDate"> ${date_str}</span>
                    </div>
                </div>
                <div id="contentRow">
                  ${content}
                </div>
            </div>`
      }
    );

    /** Different UI if no message found for thread */
    if (infoPairs.length == 0) {
      textLi = [html`
            <div style="background: ${bg_color};">
                ${this.showInput? "Add first message:" : "No messages found"}                       
            </div>`]
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    const subjectType = this.subjectType? this.subjectType : thread.pp.subject.typeName;
    const subjectName = this.subjectName? this.subjectName : thread.pp.subject.hash;
    const title = `Thread about`;

    let maybeInput = html``;
    if (this.showInput) {
      maybeInput = html`
          <threads-input-bar topic="thread" .profilesZvm=${this._dvm.profilesZvm}
                              @input=${(e) => {e.preventDefault(); this.onCreateComment(e.detail)}}></threads-input-bar>`
    }

    // <h4 style="margin-left: 5px;"><abbr title="Thread: ${this.threadHash}">${title}</abbr></h4>
    /** render all */
    return html`
        ${doodle_bg}
        <h4 style="margin: 10px;">
          ${title} 
          <span id="subjectName" @click=${(_e) => this.dispatchEvent(threadJumpEvent(this.threadHash))}>${subjectName}</span>
          <ui5-button icon="information" design="Transparent" tooltip=${subjectType} @click=${(e) => {
            if (this.weServices) {
              // TODO: Grab HrlWithContext somehow
              //this.weServices.openHrl();
              return;
            }
          }}></ui5-button>
        </h4>
        <div id="list">
            ${textLi}
        </div>
        ${maybeInput}
    `;
  }


  /** */
  static get styles() {
    return [
      css`
        :host {
          padding-right: 5px;
          padding-left: 5px;
          max-height: 100%;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          position: relative;
          z-index: 0;
        }

        
        p {
          margin: 0px; /* NEEDED because markdownit() generates <p> */
        }
        
        #agentName {
          font-family: "72";
          color: rgb(64, 64, 64);
          font-weight: bold;
        }

        .chatDate {
          font-size: smaller;
          color: #6c6c6c;
        }

        #list {
          overflow: auto;
          display: flex;
          flex-direction: column;
        }

        #avatarRow {
            display:flex; 
            flex-direction:row;
            gap:10px;
            padding-top:6px;
        }
        #nameColumn {
          /*padding-top:5px; */ 
        }
        
        #contentRow {
          padding-left: 3px;
          padding-bottom: 5px;
          padding-top: 10px;
          color: #2f2f2f;
        }

        #commentItem {
          display: flex;
          flex-direction: column;
          padding: 5px;
          border-bottom: 1px solid #dbdada;
        }

        threads-input-bar {
          border: none;
          width: 100%;
          margin-top: 8px;
          margin-bottom: 10px;
        }

        #subjectName {
          font-style: italic;
          background: #fbfbfb9c;
          padding: 4px;
          cursor: pointer;
        }
      `,
    ];
  }
}
