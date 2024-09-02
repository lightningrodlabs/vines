import {css, html} from "lit";
import {customElement, state} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Input from "@ui5/webcomponents/dist/Input";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {globaFilesContext, THIS_APPLET_ID, weClientContext} from "../../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {determineSubjectName, getThisAppletId} from "../../utils";
import {NotifySetting, Subject, ThreadsEntryType} from "../../bindings/threads.types";
import {ActionId, DnaElement, EntryId} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {FilesDvm, SplitObject} from "@ddd-qc/files";
import {weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {getMainThread, MAIN_TOPIC_ID} from "../../utils_feed";
import {SpecialSubjectType} from "../../events";


export interface PostCreatedEvent {
  beadAh: ActionId,
  createdMainThread: boolean,
}


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

  @state() private _splitObj: SplitObject | undefined = undefined;
  @state() private _creating = false;


  /** */
  private async beforeCreate(): Promise<[ActionId, boolean]> {
    this._creating = true;
    /** Create main thread if none found */
    const mainThreads = this._dvm.threadsZvm.perspective.threadsPerSubject.get(MAIN_TOPIC_ID.b64);
    let mainThreadAh: ActionId;
    let createdMainThread = false;
    if (!mainThreads || mainThreads.length == 0) {
      const appletId = this.weServices? new EntryId(this.weServices.appletIds[0]!) : THIS_APPLET_ID;
      const [_ts, ppAh] = await this._dvm.threadsZvm.publishThreadFromSemanticTopic(appletId, MAIN_TOPIC_ID, "main");
      mainThreadAh = ppAh;
      console.log("<create-post-panel>.onCreate()", mainThreadAh)
      /** Make sure agent subscribed to notifications for main thread */
      await this._dvm.threadsZvm.pullNotifSettings(mainThreadAh);
      const notif = this._dvm.threadsZvm.perspective.getNotifSetting(mainThreadAh, this._dvm.cell.address.agentId);
      if (notif != NotifySetting.AllMessages) {
        await this._dvm.threadsZvm.publishNotifSetting(mainThreadAh, NotifySetting.AllMessages);
      }
      createdMainThread = true;
    } else {
      mainThreadAh = getMainThread(this._dvm)!;
    }
    return [mainThreadAh, createdMainThread];
  }


  /** */
  private async afterCreate(beadAh: ActionId, createdMainThread: boolean) {
    /** Create comment thread and  get notifications for your own post */
    const commentPpAh = await this.createCommentThread(beadAh);
    await this._dvm.threadsZvm.publishNotifSetting(commentPpAh, NotifySetting.AllMessages);
    /** */
    this.dispatchEvent(new CustomEvent<PostCreatedEvent>('created', {detail: {beadAh, createdMainThread}, bubbles: true, composed: true}));
    this._creating = false;
  }


  /** */
  async onCreateText() {
    console.debug("<create-post-panel>.onCreateText()")
    /** Check */
    const inputElem = this.shadowRoot!.getElementById("contentInput") as Input;
    const content = inputElem.value.trim();
    console.debug("<create-post-panel>.onCreateText() content", content);
    if (content.length == 0) {
      return;
    }
    /** Before */
    const [mainThreadAh, createdMainThread] = await this.beforeCreate();
    /** Create */
    let beadAh = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, content, mainThreadAh, this.cell.address.agentId);
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
      this._splitObj = await this._filesDvm.startPublishFile(file, [], this._dvm.profilesZvm.perspective.agents,async (eh) => {
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
  async onCreateHrl() {
    /** Check */
    const maybeWal = await this.weServices.userSelectWal();
    if (!maybeWal) {
      return;
    }
    console.log("onCreateHrl()", weaveUrlFromWal(maybeWal), maybeWal);
    /** Before */
    const [mainThreadAh, createdMainThread] = await this.beforeCreate();
    /** Create */
    // TODO: make sure hrl is an entryHash
    const beadAh = await this._dvm.publishTypedBead(ThreadsEntryType.AnyBead, maybeWal, mainThreadAh);
    /** After */
    this.afterCreate(beadAh, createdMainThread);
  }


  /** */
  private async createCommentThread(beadAh: ActionId): Promise<ActionId> {
    const subject: Subject = {
      address: beadAh.b64,
      typeName: SpecialSubjectType.Post, // ThreadsEntryType.TextBead,
      appletId: getThisAppletId(this.weServices),
      dnaHashB64: this.cell.address.dnaId.b64,
    };
    const subjectName = determineSubjectName(subject, this._dvm.threadsZvm, this._filesDvm, this.weServices);
    return this._dvm.publishCommentThread( subject, subjectName);
  }


  /** */
  override render() {
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
                      @click=${(_e:any) => this.dispatchEvent(new CustomEvent('cancel', {detail: null, bubbles: true, composed: true}))}></ui5-button>
      </div>
      <ui5-textarea id="contentInput" placeholder=${msg('Whats up?')} growing></ui5-textarea>
      <div id="extraRow">
          ${this.weServices? html`
            <ui5-button design="Transparent" icon="add" tooltip=${msg('Attach WAL from pocket')}
                        @click=${(_e:any) => this.onCreateHrl()}>
            </ui5-button>` : html``}
        <ui5-button design="Transparent" icon="attachment" tooltip=${msg('Attach file')}
                    @click=${(_e:any) => this.onCreateFile()}>
        </ui5-button>
      </div>          
      <div class="footer">
        <ui5-button design="Emphasized" 
                    .disabled=${!!this._splitObj}
                    @click=${(_e:any) => this.onCreateText()}>${msg('Publish')}</ui5-button>
      </div>
    `;
  }


  /** */
  static override get styles() {
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
