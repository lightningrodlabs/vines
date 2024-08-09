import {html, PropertyValues, css} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsDnaPerspective, ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";

/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";

import "./input-bar";
import {consume} from "@lit/context";
import {globaFilesContext, weClientContext} from "../contexts";
import {ThreadsEntryType} from "../bindings/threads.types";
import {doodle_weave} from "../doodles";
import {FilesDvm} from "@ddd-qc/files";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {sharedStyles} from "../styles";
import {msg} from "@lit/localize";
import {codeStyles} from "../markdown/code-css";
import {InputBar} from "./input-bar";


/**
 * @element
 */
@customElement("post-comment-thread-view")
export class PostCommentThreadView extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    console.log("<post-comment-thread-view>.ctor()", this.threadHash)
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash!: ActionId;

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
  weServices?: WeServicesEx;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  /** -- State variables -- */

  @state() private _loading = true;


  /** -- Getters -- */

  get listElem() : HTMLElement {
    return this.shadowRoot!.getElementById("list-broken") as HTMLElement;
  }


  get value(): string {
    const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
    if (inputBar) {
      return inputBar.value;
    }
    return "";
  }


  /** -- Methods -- */

  /**
   * In dvmUpdated() this._dvm is not already set!
   * Subscribe to ThreadsZvm
   */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    console.log("<post-comment-thread-view>.dvmUpdated()");
    if (oldDvm) {
      console.log("\t Unsubscribed to threadsZvm's roleName = ", oldDvm.threadsZvm.cell.name)
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    console.log("\t Subscribed threadsZvm's roleName = ", newDvm.threadsZvm.cell.name)
    newDvm.threadsZvm.pullAllBeads(this.threadHash);
  }



  /** FOR DEBUGGING */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<post-comment-thread-view>.shouldUpdate()", changedProperties, this._dvm);
    if (changedProperties.has("_cell_via_context")) {
      this._cell = this._cell_via_context;
    }
    if (!this._dvm) {
      this.requestDvm();
    }
    return !!this._dvm;
  }


  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.log("<post-comment-thread-view>.willUpdate()", changedProperties, !!this._dvm, this.threadHash);
    if (this._dvm && (changedProperties.has("threadHash") || (false /* WARN might need to check probeAllBeads has been called */))) {
      this._loading = true;
      /* await */ this.loadCommentThread();
    }
  }


  protected override firstUpdated(_changedProperties: PropertyValues) {
    super.firstUpdated(_changedProperties);
    this.loadCommentThread();
  }


  /** */
  protected override updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);
    try {
      //const scrollContainer = this.listElem.shadowRoot!.children[0].children[0];
      //console.log("<post-comment-thread-view>.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
      //this.listElem.scrollTo(0, this.listElem.scrollHeight);
      //this.listElem.scroll({top: this.listElem.scrollHeight / 2});
      //this.listElem.scrollIntoView({block: "end"});
      //this.listElem.scrollTop = this.listElem.scrollHeight / 2;
      //this.listElem.scrollTop = this.listElem.scrollHeight;
      //this.listElem.scrollIntoView(false);
    } catch(e:any) {
      // element not present
    }
  }


  /** */
  private async loadCommentThread() {
    console.log("<post-comment-thread-view>.loadCommentThread() threadHash", this.threadHash);
    await this._dvm.threadsZvm.pullAllBeads(this.threadHash);
    await this._dvm.threadsZvm.commitThreadProbeLog(this.threadHash);
    this._loading = false;
  }


  /** */
  onLoadMore() {
    console.log("<post-comment-thread-view>.onLoadMore()");
    //this.listElem.busy = true;
    // TODO: Probe DHT
    //this.listElem.busy = false;
  }


  /** */
  async onCreateComment(inputText: string) {
    const thread = this.threadsPerspective.threads.get(this.threadHash);
    if (!thread) {
      console.error("Missing Comment thread");
      return;
    }
    /** Publish */
    const ah = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, inputText, this.threadHash, this.cell.address.agentId);
    console.log("onCreateComment() ah:", ah);
  }


  /** */
  override render() {
    console.log("<post-comment-thread-view>.override render()", this.threadHash, this.subjectName);

    const doodle_bg =  html `
      <div style="flex-grow:1; position: absolute; top:0; left:0; z-index:-1;width:100%; height:100%;">
        ${doodle_weave}
      </div>
    `;

    if (!this.threadHash) {
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
        <ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>
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

    const beads = this._dvm.threadsZvm.perspective.getAllBeadsOnThread(this.threadHash);

    //console.log("<post-comment-thread-view>.override render() len =", beads.length);
    //console.log("Has thread some unreads?", thread.hasUnreads());

    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let commentItems = Object.values(beads).map(([beadAh, beadInfo, _typedBead]) => {
      const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss.get(this.threadHash);
      const isNew = !!initialProbeLogTs && initialProbeLogTs < beadInfo.creationTime;
      //console.log("Is msg new?", isNew, initialProbeLogTs, thread.latestProbeLogTime, beadInfo.creationTime);
      //return renderSideBead(this, beadAh, beadInfo, typedBead, this._dvm, this._filesDvm, isNew, this.weServices);
      return html`<post-comment-item .hash=${beadAh} ?new=${isNew}></post-comment-item>`
    });

    /** Different UI if no message found for thread */
    if (beads.length == 0) {
      commentItems = []
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    //const subjectType = this.subjectType? this.subjectType : thread.pp.subject.typeName;
    //const subjectName = this.subjectName? this.subjectName : thread.pp.subject_name;
    //const subjectPrefix = determineSubjectPrefix(subjectType);

    const maybeAppletInfo = this.weServices && thread.pp.subject.appletId != this.weServices.appletId? this.weServices.appletInfoCached(new EntryId(thread.pp.subject.appletId)) : undefined;
    const appletName = maybeAppletInfo ? maybeAppletInfo.appletName : "N/A";
    console.log("<post-comment-thread-view> maybeAppletInfo", maybeAppletInfo, appletName, );


    //console.log("<post-comment-thread-view> input", this.perspective.threadInputs[this.threadHash], this.threadHash);


    /** render all */
    return html`
        <!-- thread -->
        <div id="list" @show-profile=${(e:any) => console.log("onShowProfile div", e)}>
            ${commentItems}
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
      sharedStyles,
      css`
        :host {
          max-height: 100%;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          position: relative;
          z-index: 0;
        }

        ui5-avatar:hover {
          outline: 1px solid #62c547;
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
