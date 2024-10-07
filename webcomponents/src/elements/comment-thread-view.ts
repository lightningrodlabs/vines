import {css, html, PropertyValues} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, DnaId, DnaElement, intoDhtId} from "@ddd-qc/lit-happ";
import {ThreadsDnaPerspective, ThreadsDvm} from "../viewModels/threads.dvm";
import {ThreadsPerspective} from "../viewModels/threads.perspective";
import {determineSubjectPrefix, latestThreadName} from "../utils";


/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";

import "./input-bar";
import {consume} from "@lit/context";
import {filesContext, weClientContext} from "../contexts";
import {ThreadsEntryType} from "../bindings/threads.types";
import {doodle_weave} from "../doodles";
import {beadJumpEvent, SpecialSubjectType, threadJumpEvent, VinesInputEvent} from "../events";
import {FilesDvm} from "@ddd-qc/files";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {sharedStyles} from "../styles";
import {msg} from "@lit/localize";
import {codeStyles} from "../markdown/code-css";
import {WAL} from "@theweave/api";
import {InputBar} from "./input-bar";
import {Hrl} from "@theweave/api/dist/types";


/**
 * @element
 */
@customElement("comment-thread-view")
export class CommentThreadView extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    //console.log("<comment-thread-view>.ctor()", this.threadHash)
  }


  /** -- Properties -- */

  /** Hash of Thread to display */
  @property() threadHash?: ActionId;
  /** Enable Input bar */
  @property() showInput: boolean = false

  @property({type: Boolean}) assetview: boolean = false;

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

  @consume({ context: filesContext, subscribe: true })
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

  /** In dvmUpdated() this._dvm is not already set! */
  protected override async dvmUpdated(newDvm: ThreadsDvm, oldDvm?: ThreadsDvm): Promise<void> {
    /** Subscribe to ThreadsZvm */
    if (oldDvm) {
      oldDvm.threadsZvm.unsubscribe(this);
    }
    newDvm.threadsZvm.subscribe(this, 'threadsPerspective');
    /** */
    if (this.threadHash) {
      newDvm.threadsZvm.pullAllBeads(this.threadHash);
    }
  }


  /**  */
  override shouldUpdate(changedProperties: PropertyValues<this>) {
    //console.log("<comment-thread-view>.shouldUpdate()", changedProperties, this._dvm);
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
    if (this._dvm && (changedProperties.has("threadHash") || (false /* WARN might need to check probeAllBeads has been called */))) {
      this._loading = true;
      /* await */ this.loadCommentThread();
    }
  }


  // /** */
  // protected override firstUpdated(_changedProperties: PropertyValues) {
  //   super.firstUpdated(_changedProperties);
  //   this.loadCommentThread();
  // }


  // TODO: scrolling
  // /** */
  // protected override updated(_changedProperties: PropertyValues) {
  //   super.updated(_changedProperties);
  //   try {
  //     //const scrollContainer = this.listElem.shadowRoot!.children[0].children[0];
  //     //console.log("<comment-thread-view>.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
  //     //this.listElem.scrollTo(0, this.listElem.scrollHeight);
  //     //this.listElem.scroll({top: this.listElem.scrollHeight / 2});
  //     //this.listElem.scrollIntoView({block: "end"});
  //     //this.listElem.scrollTop = this.listElem.scrollHeight / 2;
  //     //this.listElem.scrollTop = this.listElem.scrollHeight;
  //     //this.listElem.scrollIntoView(false);
  //   } catch(e:any) {
  //     // element not present
  //   }
  // }


  /** */
  private async loadCommentThread() {
    console.log("<comment-thread-view>.loadCommentThread() threadHash", this.threadHash);
    const maybePpMat = this._dvm.threadsZvm.perspective.getParticipationProtocol(this.threadHash!);
    if (maybePpMat && this.threadHash) {
      await this._dvm.threadsZvm.pullAllBeads(this.threadHash);
      await this._dvm.threadsZvm.commitThreadProbeLog(this.threadHash);
      this._loading = false;
    }
  }


  /** */
  onLoadMore() {
    console.log("<comment-thread-view>.onLoadMore()");
    //this.listElem.busy = true;
    // TODO: Probe DHT
    //this.listElem.busy = false;
  }


  /** */
  async onCreateComment(e: VinesInputEvent) {
    const thread = this.threadsPerspective.threads.get(this.threadHash!);
    if (!thread || !e.text) {
      console.error("Missing Comment thread");
      return;
    }
    /** Publish */
    const ah = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, e.text, this.threadHash!, this.cell.address.agentId);
    console.log("onCreateComment() ah:", ah);
  }


  /** */
  override render() {
    console.log("<comment-thread-view>.render()", this.threadHash, this.showInput, this.subjectName);
    const doodle_bg =  html `
      <div style="flex-grow:1; position: absolute; top:0; left:0; z-index:-1;width:100%; height:100%;">
        ${doodle_weave}
      </div>
    `;
    /** No threadHash */
    if (!this.threadHash) {
      return html`
        ${doodle_bg}
        <div style="position: relative;z-index: 1;margin: auto;font-size: 1.5rem;color: #04040470;">
            ${msg('No comment thread selected')}
        </div>
      `;
    }
    /** No thread */
    const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html`
        ${doodle_bg}
        <div style="color:#c10a0a; margin:auto; width:50%; height:50%;">Comment thread not found</div>
      `;
    }
    /** Still loading */
    if (this._loading) {
      this.loadCommentThread();
      return html`
        ${doodle_bg}
        <ui5-busy-indicator delay="0" size="Medium" active style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>
      `;
    }

    const beads = this._dvm.threadsZvm.perspective.getAllBeadsOnThread(this.threadHash);

    console.log("<comment-thread-view>.render() len =", beads.length);
    console.log("Has thread some unreads?", thread.hasUnreads());

    let prevBeadAh: ActionId | undefined = undefined;
    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let commentItems = beads.map(([beadAh, beadInfo, _typedBead]) => {
      const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss.get(this.threadHash!);
      const isNew = !!initialProbeLogTs && initialProbeLogTs < beadInfo.creationTime;
      console.log("Is msg new?", isNew, initialProbeLogTs, thread.latestProbeLogTime, beadInfo.creationTime);
      //return renderSideBead(this, beadAh, beadInfo, typedBead, this._dvm, this._filesDvm, isNew, this.weServices);
      const item = html`<side-item .hash=${beadAh} .prevBeadAh=${prevBeadAh} ?new=${isNew}></side-item>`;
      prevBeadAh = beadAh;
      return item;
    });

    /** Different UI if no message found for thread */
    if (beads.length == 0) {
      commentItems = [html`
            <div style="font-weight: bold; color: #1e1e1ecc;">
                ${this.showInput? "Add first message:" : "No messages found"}                       
            </div>`]
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    const subjectType = this.subjectType? this.subjectType : thread.pp.subject.typeName;
    const subjectName = this.subjectName? this.subjectName : latestThreadName(thread.pp, this._dvm.threadsZvm);
    const subjectPrefix = determineSubjectPrefix(subjectType as SpecialSubjectType);

    // const maybeAppletInfo = this.weServices && thread.pp.subject.appletId != this.weServices.appletIds[0]!? this.weServices.appletInfoCached(new EntryId(thread.pp.subject.appletId)) : undefined;
    // const appletName = maybeAppletInfo ? maybeAppletInfo.appletName : "N/A";
    // console.log("<comment-thread-view> maybeAppletInfo", maybeAppletInfo, appletName);
    //console.log("<comment-thread-view> input", this.perspective.threadInputs[this.threadHash], this.threadHash);
    let maybeInput = html``;
    if (this.showInput) {
      maybeInput = html`
          <vines-input-bar id="input-bar"
                           topic="thread"
                           .profilesZvm=${this._dvm.profilesZvm}
                           .cachedInput=${this.perspective.threadInputs.get(this.threadHash)? this.perspective.threadInputs.get(this.threadHash) : ""}
                           @input=${(e: CustomEvent<VinesInputEvent>) => {e.preventDefault(); this.onCreateComment(e.detail)}}></vines-input-bar>`
    }

    const titleTip = "Type: " + subjectType;

    let openInMainViewBtn = html``;
    if (!this.assetview) {
      openInMainViewBtn = html`
        <ui5-button design="Transparent" tooltip=${msg('Open in Main View')}
                    icon="journey-depart"
                    style="margin-right:0px; -webkit-transform: scaleX(-1); transform: scaleX(-1);"
                    @click=${(_e:any) => {
                      this.dispatchEvent(threadJumpEvent(this.threadHash!));
                      this.dispatchEvent(new CustomEvent<null>("close", {detail: null, bubbles: true, composed: true}))
                    }}>
        </ui5-button>`;
    }

    /** render all */
    return html`
        ${doodle_bg}
        <!-- Title row -->
        <h3 style="margin:10px; color:#021133;">
          ${this.assetview? html`` : html`
            <ui5-button design="Transparent" tooltip=${msg('Close')}
                        icon="slim-arrow-right"
                        style="margin-right:-5px;"
                        @click=${(_e:any) => this.dispatchEvent(new CustomEvent<null>("close", {detail: null, bubbles: true, composed: true}))}>
            </ui5-button>`}
          ${openInMainViewBtn}
          <span>${msg('Comments about')}</span>
          <sl-tooltip content=${titleTip} style="--show-delay: 500;">
            <span class="subjectName" style="cursor: pointer;"
                  @click=${(_e:any) => {
                  console.log("<comment-thread-view> title click", thread.pp.subject);
                  /** Use subject as WAL */
                  // const wal: WAL = {hrl: [new HoloHash(thread.pp.subject.dnaHashB64), new HoloHash(thread.pp.subject.address)], context: null};
                  const dhtId = intoDhtId(thread.pp.subject.address);
                  const wal: WAL = {hrl: intoHrl(new DnaId(thread.pp.subject.dnaHashB64), dhtId), context: null};
                  /** Jump within app if subject is from Vines */
                  if (this.cell.address.dnaId.equals(thread.pp.subject.dnaHashB64)) {
                      switch(thread.pp.subject.typeName) {
                          case SpecialSubjectType.AgentPubKey:
                          case SpecialSubjectType.ParticipationProtocol: 
                            this.dispatchEvent(threadJumpEvent(new ActionId(dhtId.b64))); 
                            return; 
                          break;
                          case SpecialSubjectType.AnyBead:
                          case SpecialSubjectType.TextBead:
                          case SpecialSubjectType.EncryptedBead:
                          case SpecialSubjectType.EntryBead:
                            this.dispatchEvent(beadJumpEvent(new ActionId(dhtId.b64))); 
                            return; 
                          break;
                          case SpecialSubjectType.Applet:
                          case SpecialSubjectType.SubjectType:
                          case SpecialSubjectType.SemanticTopic:
                          case SpecialSubjectType.Post:
                          default:
                            break
                      }
                      return;
                  }
                  /** OpenWal() if weServices is available */
                  if (this.weServices) {
                      if (thread.pp.subject.appletId != this.weServices.appletIds[0]!) {
                          //this.weServices.openAppletMain(decodeHashFromBase64(thread.pp.subject.appletId))
                          this.weServices.openWal(wal);
                      }
                      return;
                  }
                  }
            }>
              ${subjectPrefix} ${subjectName}
            </span>
          </sl-tooltip>
          <ui5-button icon="chain-link" design="Transparent" tooltip=${msg('Copy comment thread link to clipboard')}
                      style="margin-left:5px;"
                      @click=${(e:any) => {
                          e.stopPropagation(); e.preventDefault();
                          const hrl: Hrl = intoHrl(this.cell.address.dnaId, this.threadHash!);
                          this.dispatchEvent(new CustomEvent<Hrl>('copy', {detail: hrl, bubbles: true, composed: true}))
          }}></ui5-button>
        </h3>
        <!-- thread -->
        <div id="list" @show-profile=${(e:any) => console.log("onShowProfile div", e)}>
            ${commentItems}
        </div>
        ${maybeInput}
    `;
  }


  /** */
  static override get styles() {
    return [
      codeStyles,
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
          height: 100%;
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
