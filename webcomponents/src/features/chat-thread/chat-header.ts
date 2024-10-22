import {css, html, TemplateResult} from "lit";
import {customElement, property} from "lit/decorators.js";
import {
  ActionId,
  AgentId, AnyId,
  DnaElement,
  intoAnyId,
} from "@ddd-qc/lit-happ";
import {determineSubjectPrefix, latestThreadName} from "../../utils";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {renderAvatar, renderProfileAvatar} from "../../render";
import {beadJumpEvent, SpecialSubjectType} from "../../events";
import {msg} from "@lit/localize";
import {sharedStyles} from "../../styles";
import {toasty} from "../../toast";
import {Hrl} from "@theweave/api/dist/types";
import {intoHrl} from "@ddd-qc/we-utils";
import {PropertyValues} from "lit/development";


/**
 * @element
 */
@customElement("chat-header")
export class ChatHeader extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }

  /** Hash of thread to display */
  @property() threadHash?: ActionId;
  private  _latestSubjectId?: AnyId;

  @property() groupNames?: string[];

  // /** */
  // override async getUpdateComplete(): Promise<boolean> {
  //   //console.log("ChatView.msg.getUpdateComplete()")
  //   const superOk = await super.getUpdateComplete();
  //   return superOk;
  // }


  /** */
  protected override willUpdate(changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties);
    console.log("<chat-header>.willUpdate()", changedProperties, !!this._dvm);
    // @ts-ignore: _dvm for first update
    if (changedProperties.has("threadHash") || (changedProperties.has("_dvm") && this.threadHash)) {
      let thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash!);
      if (thread) {
        console.log("<chat-header>.willUpdate() get latest", !!this._dvm);
        this._latestSubjectId = this._dvm.threadsZvm.perspective.getLatestSubject(intoAnyId(thread.pp.subject.address));
      }
    }
  }


  /* */
  renderDmThreadHeader(otherAgent: AgentId) {
    console.log("renderDmThreadHeader()", otherAgent, this.cell.address.dnaId.print());
    const profile = this._dvm.profilesZvm.perspective.getProfile(otherAgent);
    const copyBtn = html`
        <ui5-button icon="chain-link" design="Transparent" tooltip=${msg('Copy DM channel to clipboard')} @click=${(e:any) => {
          e.stopPropagation(); e.preventDefault();
          const hrl: Hrl = intoHrl(this.cell.address.dnaId, this.threadHash!);
          this.dispatchEvent(new CustomEvent<Hrl>('copy', {detail: hrl, bubbles: true, composed: true}))
        }}></ui5-button>
    `;
    if (!profile) {
      console.warn("No profile found");
      return html``;
    }

    let groups = ""
    if (this.groupNames) {
      groups = ", " + msg("in groups") + " (" + this.groupNames.join(", ") +")";
    }

    //<ui5-button icon="number-sign" design="Transparent" tooltip=${this.hash} @click=${(e:any) => {navigator.clipboard.writeText(this.hash); toasty(("Copied AgentPubKey to clipboard"));}}></ui5-button>
    /** render all */
    return html`
        <div id="chat-header">
          ${renderProfileAvatar(profile, "L")}
          <h2>
              ${profile.nickname}
              ${copyBtn}
              <ui5-button icon="number-sign" design="Transparent" tooltip=${otherAgent.b64} @click=${(_e:any) => {navigator.clipboard.writeText(otherAgent.b64); toasty(msg("Copied AgentPubKey to clipboard"));}}></ui5-button>
          </h2>
          <div class="subtext">${msg('This is the beginning of your direct message history with')} <b>${profile.nickname}</b>${groups}</div>
        </div>
    `;
  }


  /** */
  override render() {
    console.log("<chat-header>.render()", this.threadHash, this._latestSubjectId);
    if (!this.threadHash) {
      return html`<div>Thread hash missing</div>`;
    }
    let thread = this._dvm.threadsZvm.perspective.threads.get(this.threadHash);
    if (!thread) {
      return html`<div>No thread found</div>`;
    }
    const maybeDmThread = this._dvm.threadsZvm.isThreadDm(this.threadHash);
    if (maybeDmThread) {
      return this.renderDmThreadHeader(maybeDmThread);
    }

    //const subjectAddr = thread.pp.subject.address;
    let maybeSemanticTopicTitle: string | undefined = undefined;
    //const subjectHashType = getHashType(subjectAddr);
    if (thread.pp.subject.typeName == SpecialSubjectType.SemanticTopic) {
      const pair = this._dvm.threadsZvm.perspective.semanticTopics.get(new ActionId(this._latestSubjectId!.b64))!;
      maybeSemanticTopicTitle = pair[0];
    }
    //console.debug("subjectHashType", subjectHashType);
    const subjectId = ActionId.from(this._latestSubjectId!);
    let title: TemplateResult<1>;
    let subText: TemplateResult<1>;
    const copyBtn = html`
        <ui5-button icon="chain-link" design="Transparent" tooltip=${msg('Copy channel to clipboard')} @click=${(e:any) => {
            e.stopPropagation(); e.preventDefault();
            const hrl: Hrl = intoHrl(this.cell.address.dnaId, this.threadHash!);
            this.dispatchEvent(new CustomEvent<Hrl>('copy', {detail: hrl, bubbles: true, composed: true}))
        }}></ui5-button>      
    `;
    const subjectPrefix = determineSubjectPrefix(thread.pp.subject.typeName as SpecialSubjectType);
    const threadName = latestThreadName(thread.title, thread.pp, this._dvm.threadsZvm);
    if (maybeSemanticTopicTitle) {
      title = html`${msg("Welcome to")} ${threadName} !`;
      subText = html`${msg("This is the start of a channel about topic")} ${thread.title}`;
    } else {
      console.log("<chat-header>.render(): pp.subjectHash", this._latestSubjectId);
      const subjectBead = this._dvm.threadsZvm.perspective.getBeadInfo(subjectId);
      if (subjectBead) {
        const avatarElem = renderAvatar(this._dvm.profilesZvm, subjectBead.author, "S");
        title = html`${msg("Comments about")} <span class="subjectName">${threadName}</span> from ${avatarElem}`;
        subText = html`${msg("This is the start of comment thread about chat message")} 
                      <span style="color:blue; cursor:pointer" 
                            @click=${(_e:any) => this.dispatchEvent(beadJumpEvent(subjectId))}>
                        ${threadName}
                      </span>`;
      } else {
        title = html`${msg("Comments about")} <span class="subjectName">${threadName}</span>`;
        subText = html`${msg("This is the start of a comment thread about a")} ${thread.pp.subject.typeName}: ${thread.title}`;
      }
    }

    /** render all */
    return html`
        <div id="chat-header">
          <div class="rounded-emoji">${subjectPrefix}</div>
          <h2>${title} ${copyBtn}</h2>
          <div class="subtext">${subText}</div>
          <!-- <div class="subtext">Purpose: ${thread.title}</div> -->
          <div class="subtext">${msg("Rules")}: ${thread.pp.rules}</div>
        </div>
    `;
  }


  /** */
  static override get styles() {
    return [
      sharedStyles,
      css`
        .rounded-emoji {
          width: 80px;
          height: 80px;
          font-size: 36px;
          /*background: #9f9d9dbf;*/
          background: rgba(227, 227, 227, 0.75);
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: bold;
        }
        
        h2 {
          line-height: 44px;
          margin: 3px 0px 3px 0px;
        }
        h2 > ui5-button {
          display: none;
        }
        h2:hover > ui5-button {
          display: inline-block;
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
          color: #505459;
          /*margin-left:10px;*/
          margin-bottom:5px;
        }        
      `,];
  }
}
