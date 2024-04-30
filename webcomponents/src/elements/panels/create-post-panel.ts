import {css, html} from "lit";
import {customElement, state} from "lit/decorators.js";
import {sharedStyles} from "../../styles";

import Input from "@ui5/webcomponents/dist/Input";
import {msg} from "@lit/localize";
import {consume} from "@lit/context";
import {globaFilesContext, THIS_APPLET_ID, weClientContext} from "../../contexts";
import {WeServicesEx} from "@ddd-qc/we-utils";
import {determineSubjectName, MAIN_TOPIC_HASH, parseMentions} from "../../utils";
import {NotifySettingType, ParticipationProtocol, Subject, ThreadsEntryType} from "../../bindings/threads.types";
import {DnaElement} from "@ddd-qc/lit-happ";
import {ThreadsDvm} from "../../viewModels/threads.dvm";
import {ActionHashB64, decodeHashFromBase64} from "@holochain/client";
import {FilesDvm, SplitObject} from "@ddd-qc/files";
import {weaveUrlFromWal} from "@lightningrodlabs/we-applet";
import {materializeSubject} from "../../viewModels/threads.perspective";
import {getMainThread} from "../../utils_feed";


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


  /** */
  async onCreate() {
    const inputElem = this.shadowRoot.getElementById("contentInput") as Input;
    const content = inputElem.value.trim();
    if (content.length == 0) {
      return;
    }
    // const threads = this._dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
    // if (!threads || threads.length == 0) {
    //   return;
    // }
    // const mainThreadAh = threads[0];
    const mainThreadAh = getMainThread(this._dvm);
    const mentionedAgents = parseMentions(content, this._dvm.profilesZvm);
    let beadAh = await this._dvm.publishTypedBead(ThreadsEntryType.TextBead, content, mainThreadAh, this.cell.agentPubKey, mentionedAgents);
    console.log("onCreate() beadAh:", beadAh);

    inputElem.value = "";

    const commentPpAh = await this.createCommentThread(beadAh);
    console.log("onCreate() commentPpAh:", commentPpAh);
    /** Get notifications for your own post */
    await this._dvm.threadsZvm.publishNotifSetting(commentPpAh, NotifySettingType.AllMessages);

    this.dispatchEvent(new CustomEvent('created', {detail: beadAh, bubbles: true, composed: true}));
  }


  /** */
  private async createCommentThread(beadAh: ActionHashB64): Promise<ActionHashB64> {
    const subject: Subject = {
      hash: decodeHashFromBase64(beadAh),
      typeName: ThreadsEntryType.EntryBead,
      appletId: this.weServices? this.weServices.appletId : THIS_APPLET_ID,
      dnaHash: decodeHashFromBase64(this.cell.dnaHash),
    };
    const pp: ParticipationProtocol = {
      purpose: "comment",
      rules: "N/A",
      subject,
      //subject_name: request.subjectName,
      subject_name: await determineSubjectName(materializeSubject(subject), this._dvm.threadsZvm, this._filesDvm, this.weServices),
    };
    const [ppAh, _ppMat] = await this._dvm.threadsZvm.publishParticipationProtocol(pp);
    return ppAh;
  }


  /** */
  uploadFile() {
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e:any) => {
      console.log("target upload file", e);
      const file = e.target.files[0];
      this._splitObj = await this._filesDvm.startPublishFile(file, [], async (eh) => {
        console.log("<create-post-panel> startPublishFile callback", eh);
        //const threads = this._dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
        const mainThreadAh = getMainThread(this._dvm);
        const ah = this._dvm.publishTypedBead(ThreadsEntryType.EntryBead, eh, mainThreadAh);
        this._splitObj = undefined;
        this.dispatchEvent(new CustomEvent('created', {detail: ah, bubbles: true, composed: true}));
      });
      console.log("uploadFile()", this._splitObj);
    }
    input.click();
  }


  /** */
  async onCreateHrlPost() {
    const maybeWal = await this.weServices.userSelectWal();
    if (!maybeWal) {
      return;
    }
    console.log("onCreateHrlPost()", weaveUrlFromWal(maybeWal), maybeWal);
    //const threads = this._dvm.threadsZvm.perspective.threadsPerSubject[MAIN_TOPIC_HASH];
    const mainThreadAh = getMainThread(this._dvm);
    // FIXME make sure hrl is an entryHash
    const ah = await this._dvm.publishTypedBead(ThreadsEntryType.AnyBead, maybeWal, mainThreadAh);
    this.dispatchEvent(new CustomEvent('created', {detail: ah, bubbles: true, composed: true}));
  }


  /** */
  render() {
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
            <ui5-button design="Transparent" icon="add"  tooltip=${msg('Attach WAL from pocket')}
                        @click=${(e) => this.onCreateHrlPost()}>
            </ui5-button>` : html``}
        <ui5-button design="Transparent" icon="attachment" tooltip=${msg('Attach file')}
                    @click=${(e) => this.uploadFile()}>
        </ui5-button>
      </div>          
      <div class="footer">
        <ui5-button design="Emphasized" 
                    .disabled=${!!this._splitObj}
                    @click=${(e) => this.onCreate()}>${msg('Publish')}</ui5-button>
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
          /*min-height: 200px;*/
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
