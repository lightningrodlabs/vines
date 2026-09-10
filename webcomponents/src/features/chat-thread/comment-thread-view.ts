import {css, html, PropertyValues} from "lit";
import {msg} from "@lit/localize";
import {customElement, property, state} from "lit/decorators.js";
import {ActionId, DnaElement, DnaId, intoDhtId} from "@ddd-qc/lit-happ";

import {WAL} from "@theweave/api";

import {FilesDvm} from "@ddd-qc/files";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";

import {ThreadsDnaPerspective, ThreadsDvm} from "../../viewModels/threads.dvm";
import {ThreadsPerspective} from "../../viewModels/threads.perspective";
import {latestThreadName} from "../../utils";

import "../../elements/input-bar";
/** Side-effect import: the asset view renders one, and nothing else in this
 *  module references the class, so a type import would not register it. */
import "./chat-item";
import {consume} from "@lit/context";
import {filesContext, weClientContext} from "../../contexts";
import {doodle_weave} from "../../doodles";
import {beadJumpEvent, SpecialSubjectType, threadJumpEvent, VinesInputEvent} from "../../events";

import {sharedStyles} from "../../styles";
import {ScrollKeeper} from "./scroll-keeper";

import {codeStyles} from "../../markdown/code-css";

import {InputBar} from "../../elements/input-bar";


/** @ui5/webcomponents(-fiori) */
import "@ui5/webcomponents/dist/Input.js";
import "@ui5/webcomponents/dist/Avatar.js"
import "@ui5/webcomponents-fiori/dist/Bar.js";
import {GetStrategy} from "@holochain-open-dev/core-types";
import {Bead, ThreadsEntryType} from "../../bindings/threads.types";
import {toasty} from "../../toast";


/**
 * @element
 */
@customElement("comment-thread-view")
export class CommentThreadView extends DnaElement<ThreadsDnaPerspective, ThreadsDvm> {

  /** */
  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
    //console.log("<comment-thread-view>.ctor()", this.threadHash, this.beadAh)
  }


  /** -- Properties -- */

  @property({type: Boolean}) busy: boolean = false;

  /** Hash of Thread to display */
  @property() threadHash?: ActionId;
  /** Hash of bead to focus */
  @property() beadAh?: ActionId;
  /** Enable Input bar */
  @property() showInput: boolean = false

  @property({type: Boolean}) assetview: boolean = false;

  /** Bead being replied to, if any. chat-item's Reply button only announces the
   *  intent with a bubbling event; whoever owns the input bar has to hold the
   *  target and pass it on at publish time. In the main view that is
   *  vines-page; here the input bar is ours. */
  @state() private _replyToAh: ActionId | undefined = undefined;

  /** Subject info */
  @property() subjectName?: string;
  @property() subjectType?: string;

  @consume({context: weClientContext, subscribe: true})
  weServices?: WeServicesEx;

  /** Observed perspective from zvm */
  @property({type: Object, attribute: false, hasChanged: (_v, _old) => true})
  threadsPerspective!: ThreadsPerspective;

  @consume({context: filesContext, subscribe: true})
  _filesDvm!: FilesDvm;

  /** -- State variables -- */

  @state() private _loading = true;
  @state() private _waitingForBeadCommit: Bead | undefined = undefined;


  /** Shared with the main and DM views: see scroll-keeper.ts. #list scrolls
   *  and #list-content is what grows as messages render. */
  private _keeper = new ScrollKeeper({
    scroller: () => this.listElem,
    content: () => this.shadowRoot!.getElementById("list-content"),
  });

  /** The bead the view has already scrolled to, so a re-render does not do it again. */
  private _scrolledToBead: string = "";

  /** The load in flight and which thread it is for, so a render during the
   *  load does not start another. */
  private _loadingPromise: Promise<void> | undefined = undefined;
  private _loadingFor: string = "";


  /** -- Getters -- */

   get listElem(): HTMLElement {
     return this.shadowRoot!.getElementById("list") as HTMLElement;
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
      newDvm.threadsZvm.pullAllBeads(this.threadHash, GetStrategy.Local); // TODO: Figure out best strategy
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
    this._keeper.beforeRender();
    if (this._dvm && (changedProperties.has("threadHash") || (false /* WARN might need to check probeAllBeads has been called */))) {
      this._loading = true;
      /** A different thread opens on its newest message. */
      this._keeper.follow();
      this._scrolledToBead = "";
      /* await */
      this.loadCommentThread();
    }
  }


  // /** */
  // protected override firstUpdated(_changedProperties: PropertyValues) {
  //   super.firstUpdated(_changedProperties);
  //   this.loadCommentThread();
  // }


  // TODO: scrolling
  /** */
  protected override updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);

    this._keeper.attach();
    this._keeper.afterRender();
    /** Scroll to the requested bead, once: this runs on every update, and the
     *  reader may have moved on since. */
    if (this.beadAh && this.beadAh.b64 != this._scrolledToBead) {
      const beadItem = this.shadowRoot!.getElementById(this.beadAh.b64);
      if (beadItem) {
        this._scrolledToBead = this.beadAh.b64;
        this._keeper.reveal(beadItem);
      }
    }

    // try {
    //   //const scrollContainer = this.listElem.shadowRoot!.children[0].children[0];
    //   //console.log("<comment-thread-view>.updated() ", scrollContainer.scrollTop, scrollContainer.scrollHeight, scrollContainer.clientHeight)
    //   //this.listElem.scrollTo(0, this.listElem.scrollHeight);
    //   //this.listElem.scroll({top: this.listElem.scrollHeight / 2});
    //   //this.listElem.scrollIntoView({block: "end"});
    //   //this.listElem.scrollTop = this.listElem.scrollHeight / 2;
    //   //this.listElem.scrollTop = this.listElem.scrollHeight;
    //   //this.listElem.scrollIntoView(false);
    // } catch(e:any) {
    //   // element not present
    // }
  }


  /** */
  private loadCommentThread(): Promise<void> {
    const threadHash = this.threadHash;
    if (!threadHash) {
      return Promise.resolve();
    }
    /** render() calls this on every update while loading, and every pulse
     *  that lands during the load causes an update: one load per thread. */
    if (this._loadingPromise && this._loadingFor == threadHash.b64) {
      return this._loadingPromise;
    }
    console.log("<comment-thread-view>.loadCommentThread() threadHash", threadHash);
    const maybePpMat = this._dvm.threadsZvm.perspective.getParticipationProtocol(threadHash);
    if (!maybePpMat) {
      return Promise.resolve();
    }
    this._loadingFor = threadHash.b64;
    this._loadingPromise = (async () => {
      await this._dvm.threadsZvm.pullAllBeads(threadHash, GetStrategy.Local);
      /** Show the messages before the probe-log write, not after it. */
      if (this._loadingFor == threadHash.b64) {
        this._loading = false;
      }
      await this._dvm.threadsZvm.commitThreadProbeLog(threadHash);
    })().finally(() => {
      if (this._loadingFor == threadHash.b64) {
        this._loadingPromise = undefined;
      }
    });
    return this._loadingPromise;
  }


  /** */
  onLoadMore() {
    console.log("<comment-thread-view>.onLoadMore()");
    //this.listElem.busy = true;
    // TODO: Probe DHT
    //this.listElem.busy = false;
  }


  // /** */
  // async onCreateComment(e: VinesInputEvent) {
  //   const thread = this.threadsPerspective.threads.get(this.threadHash!);
  //   if (!thread) {
  //     console.error("Missing Comment thread", e, thread);
  //     return;
  //   }
  //   /** Publish */
  //   if (e.text) {
  //     await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, e.text, this.threadHash!, this.cell.address.agentId);
  //   }
  //   if (e.wal) {
  //     await this._dvm.publishTypedBead(ThreadsEntryType.AnyBead, e.wal, this.threadHash!, this.cell.address.agentId);
  //     return;
  //   }
  //   if (e.file) {
  //     await this._dvm.publishTypedBead(ThreadsEntryType.EntryBead, {eh: e.eh, size: e.file.size, type: e.file.type}, this.threadHash!, this.cell.address.agentId);
  //     return;
  //   }
  //   /** */
  //   throw Promise.reject("Missing message content");
  // }



  /** */
  async onCreateComment(e: CustomEvent<VinesInputEvent>) {
    console.log("<comment-thread-view>.onInputCommit()", e.detail);
    /** Sending puts the message at the bottom, so go there even if the reader
     *  had scrolled up. */
    this._keeper.follow();
    let ppAh = e.detail.ppAh;
    /** The placeholder has to be built with the same prevBead the message will
     *  be published with. publishMessage()'s 5th argument IS the bead's
     *  prevBeadAh, so on a reply the committed bead points at the message being
     *  replied to, not at the end of the thread. Built without it, the
     *  placeholder never matches what arrives and the "sending" dots never stop. */
    /** Only when there is something to publish, and cleared when the publish
     *  returns: see vines-page.onInputCommit(). */
    if (e.detail.text) {
      this._waitingForBeadCommit = await this._dvm.threadsZvm.createNextBead(ppAh, this._replyToAh);
    }
    /** DM */
    if (e.detail.agent) {
      console.debug("onInputCommit() is DM");
      try {
        await this._dvm.publishDm(e.detail.agent, ThreadsEntryType.TextBead, e.detail.text!, undefined, this.weServices);
      } catch(e:any) {
        toasty(msg("Publish DM failed: ") + e.failure);
      } finally {
        this._waitingForBeadCommit = undefined;
      }
      return;
    }

    /** Create Text Message */
    if (e.detail.text) {
      if (!ppAh) {
        console.error("No thread selected");
        this._waitingForBeadCommit = undefined;
        return;
      }
      const replyToAh = this._replyToAh;
      this._replyToAh = undefined;
      try {
        await this._dvm.publishMessage(ThreadsEntryType.TextBead, e.detail.text, ppAh, undefined, replyToAh, this.weServices);
      } catch(error:any) {
        toasty(msg("Publish Message failed: ") + error.failure);
        const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
        if (inputBar) {
          inputBar.setValue(e.detail.text);
        }
        console.warn(e);
      } finally {
        this._waitingForBeadCommit = undefined;
      }
    }
  }


  /** */
  override disconnectedCallback() {
    super.disconnectedCallback();
    this._keeper.detach();
  }


  /** */
  override render() {
    //console.log("<comment-thread-view>.render()", this.threadHash, this.showInput, this.subjectName);
    const doodle_bg = html`
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
          <ui5-busy-indicator delay="0" size="Medium" active
                              style="margin:auto; width:100%; height:100%;"></ui5-busy-indicator>
      `;
    }

    const beads = this._dvm.threadsZvm.perspective.getAllBeadsOnThread(this.threadHash);

    //console.log("<comment-thread-view>.render() len =", beads.length);
    console.log("Has thread some unreads?", thread.hasUnreads());

    /** Check if the bead has been committed */
    if (this._waitingForBeadCommit) {
      console.debug("<comment-thread-view>.render() this._waitingForBeadCommit", this._waitingForBeadCommit);
      if (!this.threadHash || !this.threadHash.equals(new ActionId(this._waitingForBeadCommit.ppAh))) {
        this._waitingForBeadCommit = undefined;
      } else {
        const thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash)!;
        const beads = thread.getLast(1);
        if (beads.length > 0) {
          const [beadInfo, _] = this._dvm.threadsZvm.perspective.beads.get(beads[0]!.beadAh)!;
          if (beadInfo.author.equals(this.cell.address.agentId) && beadInfo.bead.prevBeadAh.equals(new ActionId(this._waitingForBeadCommit.prevBeadAh))) {
            this._waitingForBeadCommit = undefined;
          }
        }
      }
    }

    let prevBeadAh: ActionId | undefined = undefined;
    // <abbr title="${agent ? agent.nickname : "unknown"}">[${date_str}] ${tuple[2]}</abbr>
    let commentItems = beads.map(([beadAh, beadInfo, _typedBead]) => {
      const initialProbeLogTs = this._dvm.perspective.initialThreadProbeLogTss.get(this.threadHash!);
      const isNew = !!initialProbeLogTs && initialProbeLogTs < beadInfo.creationTime;
      console.log("Is msg new?", isNew, initialProbeLogTs, thread.latestProbeLogTime, beadInfo.creationTime);
      //return renderSideBead(this, beadAh, beadInfo, typedBead, this._dvm, this._filesDvm, isNew, this.weServices);
      /** The asset view is a reading-and-replying view, so it gets the same row
       *  the main view uses, hover toolbar and all. Not `shortmenu`: that
       *  collapses the toolbar to the overflow button alone, which buries reply
       *  -- the most frequent action -- and drops Edit entirely. side-item is
       *  the compact side-panel row, whose whole body is a jump link. */
      const item = this.assetview
          ? html`<chat-item id=${beadAh.b64} .hash=${beadAh} .prevBeadAh=${prevBeadAh}></chat-item>`
          : html`<side-item id=${beadAh.b64} .hash=${beadAh} .prevBeadAh=${prevBeadAh} ?new=${isNew}></side-item>`;
      prevBeadAh = beadAh;
      return item;
    });

    /** Different UI if no message found for thread */
    if (beads.length == 0) {
      commentItems = [html`
          <div style="font-weight: bold; color: #1e1e1ecc;">
              ${this.showInput && !this.assetview? msg("Add first message:") : msg("No messages found in thread")}
          </div>`]
    }


    //<!--style="height: 400px" growing="Scroll" -->
    //<!-- @load-more=${this.onLoadMore}-->

    const subjectType = this.subjectType? this.subjectType : thread.pp.subject.typeName;
    const subjectName = this.subjectName? this.subjectName : latestThreadName(thread.title, thread.pp, this._dvm.threadsZvm);
    //const subjectPrefix = determineSubjectPrefix(subjectType as SpecialSubjectType);

    // const maybeAppletInfo = this.weServices && thread.pp.subject.appletId != this.weServices.appletIds[0]!? this.weServices.appletInfoCached(new EntryId(thread.pp.subject.appletId)) : undefined;
    // const appletName = maybeAppletInfo ? maybeAppletInfo.appletName : "N/A";
    // console.log("<comment-thread-view> maybeAppletInfo", maybeAppletInfo, appletName);
    //console.log("<comment-thread-view> input", this.perspective.threadInputs[this.threadHash], this.threadHash);
    let maybeInput = html``;
    //if (this.showInput && !this.assetview) {
      // @input=${(e: CustomEvent<VinesInputEvent>) => {e.preventDefault(); this.onCreateComment(e.detail)}}
      maybeInput = html`
          <vines-input-bar id="input-bar" nosend topic=""
                           ?busy=${this.busy || this._waitingForBeadCommit}                            
                           .threadHash=${this.threadHash}
                           @vines-input-commit=${(e: CustomEvent<VinesInputEvent>) => {
                               e.stopPropagation(); /*e.preventDefault();*/
                               console.log("<comment-thread-view>.onInputCommit", e.detail);
                               if (!e.detail.text) throw Error("Missing text in input event");
                               this.onCreateComment(e);
                           }}
          ></vines-input-bar>`;
    //}

    const titleTip = "Type: " + subjectType;

    let replyToAuthorName = "unknown";
    if (this._replyToAh) {
      const replyToInfo = this._dvm.threadsZvm.perspective.getBeadInfo(this._replyToAh);
      const maybeProfile = replyToInfo? this._dvm.profilesZvm.perspective.getProfile(replyToInfo.author) : undefined;
      if (maybeProfile) {
        replyToAuthorName = maybeProfile.nickname;
      }
    }

    let openInMainViewBtn = html``;
    if (!this.assetview) {
      openInMainViewBtn = html`
          <ui5-button design="Transparent" tooltip=${msg('Open in Main View')}
                      icon="journey-depart"
                      style="margin-right:0px; -webkit-transform: scaleX(-1); transform: scaleX(-1);"
                      @click=${(_e: any) => {
                          this.dispatchEvent(threadJumpEvent(this.threadHash!));
                          this.dispatchEvent(new CustomEvent<null>("close", {
                              detail: null,
                              bubbles: true,
                              composed: true
                          }))
                      }}>
          </ui5-button>`;
    }

    /** render all */
    return html`
        ${doodle_bg}
        <!-- Title row -->
        <h3 id="titleRow">
            ${openInMainViewBtn}
            ${this.assetview? html`` : html`
                <ui5-button design="Transparent" tooltip=${msg('Close')}
                            icon="slim-arrow-right"
                            style="margin-right:-5px;"
                            @click=${(_e: any) => this.dispatchEvent(new CustomEvent<null>("close", {
                                detail: null,
                                bubbles: true,
                                composed: true
                            }))}>
                </ui5-button>`}
            <!--<span>${msg('About')}</span> -->
            <sl-tooltip content=${titleTip} style="--show-delay: 500;">
            <span class="subjectName" style="cursor: pointer;"
                  @click=${(_e: any) => {
                      console.log("<comment-thread-view> title click", thread.pp.subject);
                      /** In the asset view the title is the channel itself, and it
                       *  is the only way back into Vines now that the messages no
                       *  longer navigate. */
                      if (this.assetview) {
                          this.dispatchEvent(threadJumpEvent(this.threadHash!));
                          return;
                      }
                      /** Use subject as WAL */
                              // const wal: WAL = {hrl: [new HoloHash(thread.pp.subject.dnaHashB64), new HoloHash(thread.pp.subject.address)], context: null};
                      const dhtId = intoDhtId(thread.pp.subject.address);
                      const wal: WAL = {hrl: intoHrl(new DnaId(thread.pp.subject.dnaHashB64), dhtId), context: null};
                      /** Jump within app if subject is from Vines */
                      if (this.cell.address.dnaId.equals(thread.pp.subject.dnaHashB64)) {
                          switch (thread.pp.subject.typeName) {
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
                      /** openAsset() if weServices is available */
                      if (this.weServices) {
                          if (thread.pp.subject.appletId != this.weServices.appletIds[0]!) {
                              //this.weServices.openAppletMain(decodeHashFromBase64(thread.pp.subject.appletId))
                              this.weServices.openAsset(wal);
                          }
                          return;
                      }
                  }
                  }>
              ${subjectName}
            </span>
            </sl-tooltip>
            <!-- Grouped and pushed right: as loose children of the title they
                 wrapped onto a line of their own, which in the asset view is a
                 whole row of chrome above the first message. -->
            <div id="titleActions">
                <copy-wal-button .dnaId=${this.cell.address.dnaId} .hash=${this.threadHash!} name=${msg("comment thread")}></copy-wal-button>
                <ui5-button design="Transparent" tooltip=${msg('Go to Bottom')}
                            icon="pull-down"
                            @click=${(_e: any) => this._keeper.follow()}>
                </ui5-button>
                <ui5-button id="pull-up" design="Transparent" tooltip=${msg('Go to Top')}
                            icon="pull-down"
                            @click=${(_e: any) => {this._keeper.release(); this.listElem.scrollTo(0, 0);}}>
                </ui5-button>
            </div>
        </h3>
        <!-- thread -->
        <div id="list" @show-profile=${(e: any) => console.log("onShowProfile div", e)}
             @reply-clicked=${(e: CustomEvent<ActionId>) => {
                 e.stopPropagation();
                 this._replyToAh = e.detail;
                 const inputBar = this.shadowRoot!.getElementById("input-bar") as InputBar;
                 if (inputBar) {
                     inputBar.focusInput();
                 }
             }}>
            <div id="list-content" style="display:flex; flex-direction:column;">
                ${commentItems}
            </div>
        </div>
        <div class="reply-to-div" style="display: ${this._replyToAh? "flex" : "none"};">
            ${msg("Replying to")}<span style="font-weight: bold; color:#4270A8; margin-left:3px;">${replyToAuthorName}</span>
            <div style="flex-grow: 1"></div>
            <ui5-button icon="decline" design="Transparent" style="border:none; padding:0px"
                        @click=${(_e: any) => {this._replyToAh = undefined;}}></ui5-button>
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

          #titleRow {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 2px;
              margin: 10px;
              color: #021133;
          }

          /* The name takes the slack so the buttons sit at the right edge. */
          #titleRow .subjectName {
              flex: 1 1 auto;
              min-width: 0;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }

          #titleActions {
              display: flex;
              align-items: center;
              flex-shrink: 0;
              margin-left: auto;
          }

          #pull-up::part(icon) {
              transform: rotate(180deg);
          }
          
        ui5-avatar:hover {
          outline: 1px solid #62c547;
        }

        #list {
          overflow: auto;
          display: flex;
          flex-direction: column;
        }

        .reply-to-div {
          flex-direction: row;
          background: #6f6f6f2e;
          margin: 0px 12px -4px;
          border-radius: 12px;
          font-size: smaller;
          padding-left: 5px;
          align-items: center;
          color: #202020;
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
