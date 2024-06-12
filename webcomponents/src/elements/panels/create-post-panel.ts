import {css, html} from "lit";
import {customElement, state} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Input from "@ui5/webcomponents/dist/Input";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {globaFilesContext, THIS_APPLET_ID, weClientContext} from "../../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {determineSubjectName, MAIN_TOPIC_HASH, parseMentions} from "../../utils";
import {NotifySetting, Subject, ThreadsEntryType} from "../../bindings/threads.types";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {FilesDvm, SplitObject} from "@ddd-qc/files";
import {weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {BeadType, materializeSubject} from "../../viewModels/threads.perspective";
import {getMainThread, POST_TYPE_NAME} from "../../utils_feed";


/**
 * @element
 */
@customElement("create-post-panel")
export class CreatePostPanel extends DnaElement<unknown, ThreadsDvm> {

  constructor() {
    super(ThreadsDvm.DEFAULT_BASE_ROLE_NAME);
  }


  @consume({ context: weClientContext, subscribe: true })
  weServices!: WeServicesEx;

  @consume({ context: globaFilesContext, subscribe: true })
  _filesDvm!: FilesDvm;

  @state() private _splitObj?: SplitObject;
  @state() private _creating = false;


  /** */
  private async beforeCreate(): Promise<[ActionHashB64, boolean]> {
    this._creating = true;
    /** Create main thread if none found */
    const mainThreads = this._dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
    let mainThreadAh;
    let createdMainThread = false;
    if (!mainThreads || mainThreads.length == 0) {
      const appletId = this.weServices? this.weServices.appletId : THIS_APPLET_ID;
      const [_ts, ppAh] = await this._dvm.threadsZvm.publishThreadFromSemanticTopic(appletId, MAIN_TOPIC_HASH, "main");
      mainThreadAh = ppAh;
      console.log("<create-post-panel>.onCreate()", mainThreadAh)
      /** Make sure agent subscribed to notifications for main thread */
      await this._dvm.threadsZvm.pullNotifSettings(mainThreadAh);
      const notif = this._dvm.threadsZvm.getNotifSetting(mainThreadAh, this._dvm.cell.agentPubKey);
      if (notif != NotifySetting.AllMessages) {
        await this._dvm.threadsZvm.publishNotifSetting(mainThreadAh, NotifySetting.AllMessages);
      }
      createdMainThread = true;
    } else {
      mainThreadAh = getMainThread(this._dvm);
    }
    return [mainThreadAh, createdMainThread];
  }


  /** */
  private async afterCreate(beadAh: ActionHashB64, createdMainThread: boolean) {
    /** Create comment thread and  get notifications for your own post */
    const commentPpAh = await this.createCommentThread(beadAh);
    await this._dvm.threadsZvm.publishNotifSetting(commentPpAh, NotifySetting.AllMessages);
    /** */
    this.dispatchEvent(new CustomEvent('created', {detail: {beadAh, createdMainThread}, bubbles: true, composed: true}));
    this._creating = false;
  }


  /** */
  async onCreateText() {
    /** Check */
    const inputElem = this.shadowRoot.getElementById("contentInput") as Input;
    const content = inputElem.value.trim();
    if (content.length == 0) {
      return;
    }
    /** Before */
    const [mainThreadAh, createdMainThread] = await this.beforeCreate();
    /** Create */
    const mentionedAgents = parseMentions(content, this._dvm.profilesZvm);
    let beadAh = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, content, mainThreadAh, this.cell.agentPubKey, mentionedAgents);
    inputElem.value = "";
    /** After */
    this.afterCreate(beadAh, createdMainThread)
  }


  /** */
  async onCreateFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e:any) => {
      console.log("target upload file", e);
      /** Check */
      const file = e.target.files[0];
      if (!file) {
        return;
      }
      /** Before */
      const [mainThreadAh, createdMainThread] = await this.beforeCreate();
      /** Create */
      this._splitObj = await this._filesDvm.startPublishFile(file, [], this._dvm.profilesZvm.getAgents(),async (eh) => {
        console.log("<create-post-panel> startPublishFile callback", eh);
        const beadAh = await this._dvm.publishTypedBead(ThreadsEntryType.EntryBead, eh, mainThreadAh);
        this._splitObj = undefined;
        /** After */
        await this.afterCreate(beadAh, createdMainThread);
      });
    }
    input.click();
  }


  /** */
  async onCreateHrl(): Promise<ActionHashB64> {
    /** Check */
    const maybeWal = await this.weServices.userSelectWal();
    if (!maybeWal) {
      return;
    }
    console.log("onCreateHrl()", weaveUrlFromWal(maybeWal), maybeWal);
    /** Before */
    const [mainThreadAh, createdMainThread] = await this.beforeCreate();
    /** Create */
    // FIXME make sure hrl is an entryHash
    const beadAh = await this._dvm.publishTypedBead(ThreadsEntryType.AnyBead, maybeWal, mainThreadAh);
    /** After */
    this.afterCreate(beadAh, createdMainThread);
  }


  /** */
  private async createCommentThread(beadAh: ActionHashB64): Promise<ActionHashB64> {
    const subject: Subject = {
      hash: decodeHashFromBase64(beadAh),
      typeName: POST_TYPE_NAME, // ThreadsEntryType.TextBead,
      appletId: this.weServices? this.weServices.appletId : THIS_APPLET_ID,
      dnaHash: decodeHashFromBase64(this.cell.dnaHash),
    };
    const subjectName = await determineSubjectName(materializeSubject(subject), this._dvm.threadsZvm, this._filesDvm, this.weServices)
    return this._dvm.publishCommentThread( subject, subjectName);
  }


  /** */
  render() {
    if (this._creating || this._splitObj) {
      return html`
          <div style="flex-grow: 1"></div>
          <ui5-busy-indicator delay="30" size="Large" active style="width:100%; height:100%; color:olive"></ui5-busy-indicator>
          <div style="flex-grow: 1"></div>
      `;
    }
    /** */
    return html`
      <div id="titleRow">
          <div id="title">${msg('Create a post')}</div>
          <ui5-button icon="decline" design="Transparent" tooltip=${msg('Cancel')}
                      style="border-radius: 50%;"
                      @click=${(e) => this.dispatchEvent(new CustomEvent('cancel', {detail: null, bubbles: true, composed: true}))}></ui5-button>
      </div>
      <ui5-textarea id="contentInput" placeholder=${msg('Whats up?')} growing></ui5-textarea>
      <div id="extraRow">
          ${this.weServices? html`
            <ui5-button design="Transparent" icon="add" tooltip=${msg('Attach WAL from pocket')}
                        @click=${(e) => this.onCreateHrl()}>
            </ui5-button>` : html``}
        <ui5-button design="Transparent" icon="attachment" tooltip=${msg('Attach file')}
                    @click=${(e) => this.onCreateFile()}>
        </ui5-button>
      </div>          
      <div class="footer">
        <ui5-button design="Emphasized" 
                    .disabled=${!!this._splitObj}
                    @click=${(e) => this.onCreateText()}>${msg('Publish')}</ui5-button>
      </div>
    `;
  }


  /** */
  static get styles() {
    return [
      sharedStyles,
      css`
        :host {
          /*background: darkgray;*/
          display: flex;
          flex-direction: column;
          width: 600px;
          min-height: 100px;
        }
        
        #contentInput {
          flex-grow:1;
          /*height: 120px;*/
        }
        
        #contentInput::part(textarea) {
          background: #f1f6fb;
        }
        
        #titleRow {
          /*display:flex;*/
          /*flex-direction: row;*/
        }
        
        #title {
          flex-grow: 1;
          text-align: center;
          font-weight: bold;
          font-size: larger;
          padding-top:2px;
          padding-bottom:5px;
          margin-top: 5px;
        }

        #titleRow > ui5-button {
          position:absolute;
          top: 1px;
          right: 1px;
        }
        
        #extraRow {
          display: flex;
          flex-direction: row;
        }
        
        .footer {
          display: flex;
          gap: 5px;
          margin: 0px 5px 5px;
        }

        .footer > ui5-button {
          flex-grow: 1;
        }
      `
    ];
  }
}
