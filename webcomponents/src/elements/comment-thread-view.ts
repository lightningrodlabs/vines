import {html, PropertyValues, css} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import { DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {determineSubjectPrefix, parseMentions} from "../utils";

import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";

/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";

import "./input-bar";
import {renderSideBead} from "../render";
import {consume} from "@lit/context";
import {globaFilesContext, weClientContext} from "../contexts";
import {ThreadsEntryType} from "../bindings/threads.types";
import {doodle_weave} from "../doodles";
import {threadJumpEvent} from "../jump";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {sharedStyles} from "../styles";
import {msg} from "@lit/localize";


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

  get listElem() : HTMLElement {
    return this.shadowRoot.getElementById("list-broken") as HTMLElement;
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


  protected firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.loadCommentThread();
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
  private async loadCommentThread() {
    console.log("<comment-thread-view>.loadCommentThread() threadHash", this.threadHash);
    await this._dvm.threadsZvm.probeAllBeads(this.threadHash);
    await this._dvm.threadsZvm.commitThreadProbeLog(this.threadHash);
    this._loading = false;
  }


  /** */
  onLoadMore() {
    console.log("<comment-thread-view>.onLoadMore()");
    //this.listElem.busy = true;
    // FIXME: Probe DHT
    //this.listElem.busy = false;
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
        <div style="position: relative;z-index: 1;margin: auto;font-size: 1.5rem;color: #04040470;">
            ${msg('No comment thread selected')}
        </div>
      `;
    }
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html `
        ${doodle_bg}
        <div style="color:#c10a0a; margin:auto; width:50%; height:50%;">Thread not found</div>
      `;
    }

    if (this._loading) {
      return html `
        ${doodle_bg}
        <ui5-busy-indicator size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>
      `;
    }

    // if (pp.subjectType == SEMANTIC_TOPIC_TYPE_NAME) {
    //   const topic = this._dvm.threadsZvm.getSemanticTopic(pp.subjectHash);
    //   if (!topic) {
    //     return html`
    //         <div>Loading thread topic...</div>`;
    //   }
    // } else {
    //
    // }

    const beads = this._dvm.threadsZvm.getAllBeadsOnThread(this.threadHash);

    console.log("<comment-thread-view>.render() len =", beads.length);
    console.log("Has thread some unreads?", thread.hasUnreads());

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let sideItems = Object.values(beads).map(([beadAh, beadInfo, typedBead]) => {
      const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss[this.threadHash];
      const isNew = initialProbeLogTs < beadInfo.creationTime;
      console.log("Is msg new?", isNew, initialProbeLogTs, thread.latestProbeLogTime, beadInfo.creationTime);
      return renderSideBead(this, beadAh, beadInfo, typedBead, this._dvm, this._filesDvm, isNew, this.weServices);
    });

    /** Different UI if no message found for thread */
    if (beads.length == 0) {
      sideItems = [html`
            <div style="font-weight: bold; color: #1e1e1ecc;">
                ${this.showInput? "Add first message:" : "No messages found"}                       
            </div>`]
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    const subjectType = this.subjectType? this.subjectType : thread.pp.subject.typeName;
    const subjectName = this.subjectName? this.subjectName : thread.pp.subject_name;
    const subjectPrefix = determineSubjectPrefix(subjectType);

    const title = `Thread about`;

    let maybeInput = html``;
    if (this.showInput) {
      maybeInput = html`
          <vines-input-bar topic="thread" .profilesZvm=${this._dvm.profilesZvm}
                              @input=${(e) => {e.preventDefault(); this.onCreateComment(e.detail)}}></vines-input-bar>`
    }

    // <h4 style="margin-left: 5px;"><abbr title="Thread: ${this.threadHash}">${title}</abbr></h4>
    /** render all */
    return html`
        ${doodle_bg}
        <h3 style="margin:10px; color:#021133;">
          ${title} 
          <span class="subjectName" style="cursor: pointer;" @click=${(_e) => this.dispatchEvent(threadJumpEvent(this.threadHash))}>${subjectPrefix} ${subjectName}</span>
          <ui5-button icon="copy" design="Transparent" tooltip=${msg('Copy thread to clipboard')} @click=${(e) => {
              e.stopPropagation();
              this.dispatchEvent(new CustomEvent('copy-thread', {detail: this.threadHash, bubbles: true, composed: true}))
          }}></ui5-button>
          <ui5-button icon="information" design="Transparent" tooltip=${subjectType} 
                      @click=${(e) => {
            if (this.weServices) {
                if (this.weServices.appletId != thread.pp.subject.appletId) this.weServices.openAppletMain(decodeHashFromBase64(thread.pp.subject.appletId))
              // TODO: Grab HrlWithContext somehow
              //this.weServices.openHrl();
              return;
            }
          }}></ui5-button>
        </h3>
        <div id="list">
            ${sideItems}
        </div>
        ${maybeInput}
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
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
        
        #list {
          overflow: auto;
          display: flex;
          flex-direction: column;
        }

        vines-input-bar {
          border: none;
          width: 100%;
          margin-top: 8px;
          margin-bottom: 10px;
        }
      `,
    ];
  }
}
