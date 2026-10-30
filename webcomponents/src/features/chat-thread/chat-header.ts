import {css, html, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {
    ActionId,
    AnyId,
    DnaElement, DnaId, EntryId,
    intoAnyId, intoDhtId,
} from "@ddd-qc/lit-happ";
import {commentThreadKindName, isDiscussionSubject, latestSubjectName} from "../../utils";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {renderAvatar, renderModerators, renderProfileAvatar} from "../../render";
import {beadJumpEvent, CommentRequest, ShowRulesEvent, SpecialSubjectType, threadJumpEvent} from "../../events";
import {msg} from "@lit/localize";
import {sharedStyles} from "../../styles";
import {toasty} from "../../toast";
import {PropertyValues} from "lit/development";
import {consume} from "@lit/context";
import {weClientContext} from "../../contexts";
import {intoHrl, WeServicesEx} from "@ddd-qc/we-utils";
import {AppletInfo, WAL} from "@theweave/api";


/**
 * @element
 */
@customElement("chat-header")
export class ChatHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  @consume({context: weClientContext, subscribe: true})
  weServices!: WeServicesEx;

  /** Hash of thread to display */
  @property() threadHash?: ActionId;
  private _latestSubjectId?: AnyId;

  @property() groupNames?: string[];

  @state() _appletInfo?: AppletInfo;

  // /** */
  // override async getUpdateComplete(): Promise<boolean> {
  //   //console.log("ChatView.msg.getUpdateComplete()")
  //   const superOk = await super.getUpdateComplete();
  //   return superOk;
  // }

  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    //console.debug("<chat-header>.willUpdate()", changedProperties, !!this._dvm);
    // @ts-ignore: _dvm for first update
    if (changedProperties.has("threadHash") || (changedProperties.has("_dvm") && this.threadHash)) {
      let thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash!);
      if (thread) {
        //console.debug("<chat-header>.willUpdate() get latest", !!this._dvm);
        this._latestSubjectId = this._dvm.threadsZvm.perspective.getLatestSubject(intoAnyId(thread.pp.subject.address));
          if (this.weServices) {
             this.weServices.appletInfo(thread.pp.subject.appletId).then(appletInfo => {this._appletInfo = appletInfo});
          }
      }
    }
  }


  /** */
  override render(): any {
    //console.debug("<chat-header>.render()", this.threadHash, this._latestSubjectId);
    if (!this.threadHash) {
      return html`<div>Thread hash missing</div>`;
    }
    let thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html`<div>No thread found</div>`;
    }
    //console.debug("<chat-header>.render() thread", thread);

    /** One layout for channels, comment threads and DMs: a title line with the actions right
     *  beside it, then who started it and when, then a kind-specific line. */
    const maybeDmThread = this._dvm.threadsZvm.isThreadDm(this.threadHash);
    const dmProfile = maybeDmThread? this._dvm.profilesZvm.perspective.getProfile(maybeDmThread) : undefined;
    if (maybeDmThread && !dmProfile) {
      console.warn("No profile found");
      return html``;
    }

    const isComment = !maybeDmThread && thread.pp.purpose == "comment";
    const isDiscussion = isComment && isDiscussionSubject(thread.pp.subject.typeName);
    const copyBtn = html`<copy-wal-button .dnaId=${this.cell.address.dnaId} .hash=${this.threadHash!}
                                          .name=${maybeDmThread? msg('DM channel') : isComment? commentThreadKindName(thread.pp.subject.typeName) : msg('channel')}></copy-wal-button>`;

    /** Lead: the other party's avatar for a DM, the comment icon for comment threads */
    let lead = html``;
    let extraBtn = html``;
    let title: TemplateResult<1>;
    if (maybeDmThread) {
      lead = renderProfileAvatar(this, maybeDmThread, dmProfile!, "L");
      title = html`<span class="path">${dmProfile!.nickname}</span>`;
      extraBtn = html`
          <ui5-button icon="number-sign" design="Transparent" tooltip=${msg("AgentPubKey") + ": " + maybeDmThread.b64}
                      @click=${(_e: any) => {
                          navigator.clipboard.writeText(maybeDmThread.b64);
                          toasty(msg("Copied AgentPubKey to clipboard"));
                      }}>
          </ui5-button>`;
    } else {
      const subjectId = ActionId.from(this._latestSubjectId!);
      const subjectName = latestSubjectName(thread.pp, this._dvm.threadsZvm);
      if (isComment) {
        lead = html`<ui5-icon name="comment" class="kind-icon"></ui5-icon>`;
      }
      /** Title: "<Category> / <channel>", "<Category or channel> / Discussion" or "Comments on <subject>" */
      if (thread.pp.subject.typeName == SpecialSubjectType.SemanticTopic) {
        title = html`
            <span class="path">${subjectName}</span>
            <span class="sep">/</span>
            <span class="path">${isComment? msg("Discussion") : thread.title}</span>`;
      } else if (isDiscussion) {
        const channelAh = new ActionId(thread.pp.subject.address);
        title = html`
            <span class="path link" @click=${(_e: any) => this.dispatchEvent(threadJumpEvent(channelAh))}>${subjectName}</span>
            <span class="sep">/</span>
            <span class="path">${msg("Discussion")}</span>`;
      } else {
        const subjectBead = this._dvm.threadsZvm.perspective.getBeadInfo(subjectId);
        if (subjectBead) {
          title = html`
              <span class="path">${msg("Comments on")}</span>
              <span class="path quote link" @click=${(_e: any) => this.dispatchEvent(beadJumpEvent(subjectId))}>"${subjectName}"</span>
              ${renderAvatar(this, this._dvm.profilesZvm, subjectBead.author, "XS")}`;
        } else {
          let wal: WAL | undefined = undefined;
          let fromElem = html``;
          if (this.weServices) {
            wal = {
              hrl: intoHrl(new DnaId(thread.pp.subject.dnaHashB64), intoDhtId(thread.pp.subject.address)),
              context: undefined
            };
            fromElem = html`<span class="muted">${msg('from')}</span>
                <span class="path link" @click=${() => { /*await*/ this.weServices.openAppletMain(new EntryId(thread?.pp.subject.appletId).hash, wal)}}>
                    ${this._appletInfo?.appletName}
                </span>`;
          }
          title = html`
              <span class="path">${msg("Comments on")}</span>
              <span class="path ${wal? "link" : ""}" @click=${() => {if (wal) this.weServices.openAsset(wal, 'side')}}>${subjectName}</span>
              ${fromElem}`;
        }
      }
    }

    /** Origin: who started it and when */
    const authorProfile = this._dvm.profilesZvm.perspective.getProfile(thread.author);
    const authorName = authorProfile? authorProfile.nickname : msg("unknown");
    const createdOn = new Date(thread.creationTime / 1000).toLocaleDateString(undefined, {year: "numeric", month: "long", day: "numeric"});
    const origin = html`
        <span>${maybeDmThread? msg("Direct message started by")
            : !isComment? msg("Channel created by")
            : isDiscussion? msg("Discussion started by")
            : msg("Comment thread started by")}</span>
        ${renderAvatar(this, this._dvm.profilesZvm, thread.author, "XS")}
        <span style="font-weight:bold">${authorName}</span>
        <span>${msg("on")} ${createdOn}</span>`;

    const toSideBtn = html`
        <ui5-button    tooltip=${msg("Open in side view")} icon="navigation-right-arrow" design="Transparent"
                       @click=${(_e: any) => {
                           this.dispatchEvent(new CustomEvent<CommentRequest>('commenting-clicked', {
                               detail: {
                                   maybeCommentThread: this.threadHash!,
                                   subjectHashB64: thread?.pp.subject.address,
                                   subjectType: thread?.pp.subject.typeName,
                                   subjectName: thread?.pp.subject.name,
                                   viewType: "side"
                               },
                               bubbles: true,
                               composed: true,
                           }));
                       }}></ui5-button>`;

    /** Third line: DM history note and groups, or rules and moderators */
    let groups = "";
    if (maybeDmThread && this.groupNames) {
      groups = msg("in groups") + ": " + this.groupNames.join(", ");
    }
    const detail = maybeDmThread? html`
        <span>${msg('This is the beginning of your direct message history')}</span>
        <span>${groups}</span>` : html`
        <span class="rules"
              @click=${(e: any) => {
                e.preventDefault();
                e.stopPropagation();
                this.dispatchEvent(new CustomEvent<ShowRulesEvent>('show-rules', {
                  detail: {
                    ppAh: this.threadHash!,
                    x: e.clientX,
                    y: e.clientY
                  }, bubbles: true, composed: true
                }));
              }}>
          ${msg("Rules")}
        </span>
        |
        ${msg("Moderators")}:
        ${renderModerators(this, thread.pp.moderation.moderators, this._dvm.profilesZvm.perspective)}`;

    /** render all */
    return html`
        <div id="chat-header">
          <h2>
            ${lead}
            ${title}
            ${copyBtn}
            ${extraBtn}
            ${toSideBtn}
          </h2>
          <div class="subtext">${origin}</div>
          <div class="subtext">${detail}</div>
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        
        .rules {
          text-decoration: underline;
        }
        .rules:hover {
          cursor: pointer;
          font-weight: bold;
        }
        
        h2 {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 44px;
          margin: 8px 0px 4px 0px;
          font-size: 1.4em;
          font-weight: 600;
          color: var(--vines-ink);
        }
        h2 > ui5-button, h2 > copy-wal-button {
          color: var(--vines-ink-muted);
          flex-shrink: 0;
        }
        .kind-icon {
          width: 1.2em;
          height: 1.2em;
          color: var(--vines-ink-muted);
        }
        .path {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sep {
          color: var(--vines-ink-muted);
          font-weight: 400;
        }
        .quote {
          font-style: italic;
          font-weight: 400;
          max-width: 50%;
        }
        .muted {
          color: var(--vines-ink-muted);
          font-weight: 400;
        }

        .chatAvatar {
          /*cursor:pointer;*/  
        }
        
        #chat-header {
          display: flex; 
          flex-direction: column;
          min-height: 55px;
          margin: 5px 5px 10px 10px;
        }
        .subtext {
          display: flex;
          gap: 5px;
          color: var(--vines-ink);
          /*margin-left:10px;*/
          margin-bottom:5px;
          align-items: center;
        }

          .link {
              cursor: pointer;
          }
          
          .link:hover {
              text-decoration: underline;
          }
      `,];
  }
}
